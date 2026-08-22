import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripeSecrets } from '../_shared/stripe.ts'

const stripeApiBase = 'https://api.stripe.com/v1'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { secretKey: stripeSecretKey } = await getStripeSecrets()
    if (!stripeSecretKey) {
      return json({ error: 'Stripe não configurado.' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    // Aceita tanto o subscription_id de customer_subscriptions quanto o id de
    // subscriptions (legado). A chave real do Stripe é resolvida aqui.
    const subscriptionId = String(body.subscription_id || body.id || '').trim()
    const localTable = String(body.local_table || '').trim() // 'customer_subscriptions' | 'subscriptions'

    if (!subscriptionId) {
      return json({ error: 'subscription_id é obrigatório.' }, 400)
    }

    // 1) Tenta resolver em customer_subscriptions (novo fluxo)
    let stripeSubscriptionId: string | null = null
    let targetTable: 'customer_subscriptions' | 'subscriptions' = 'customer_subscriptions'
    let localId: string | null = null

    if (localTable !== 'subscriptions') {
      const { data: custSub } = await supabase
        .from('customer_subscriptions')
        .select('id, stripe_subscription_id, status, tenant_id')
        .or(`id.eq.${subscriptionId},stripe_subscription_id.eq.${subscriptionId}`)
        .maybeSingle()

      if (custSub) {
        stripeSubscriptionId = custSub.stripe_subscription_id
        targetTable = 'customer_subscriptions'
        localId = custSub.id
      }
    }

    // 2) Caso não encontrou em customer_subscriptions, tenta subscriptions (legado)
    if (!stripeSubscriptionId) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, status, client_id, tenant_id')
        .or(`id.eq.${subscriptionId},stripe_subscription_id.eq.${subscriptionId}`)
        .maybeSingle()

      if (sub) {
        stripeSubscriptionId = sub.stripe_subscription_id
        targetTable = 'subscriptions'
        localId = sub.id
      }
    }

    if (!stripeSubscriptionId || !localId) {
      return json({ error: 'Assinatura não encontrada localmente.' }, 404)
    }

    // Cancela no Stripe (imediato, sem prorateamento opcional)
    const params = new URLSearchParams()
    const cancelResp = await fetch(
      `${stripeApiBase}/subscriptions/${stripeSubscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    const cancelData = await cancelResp.json().catch(() => null)
    if (!cancelResp.ok) {
      console.error('[stripe-cancel-subscription] Stripe cancel error:', cancelData)
      return json({ error: 'Erro ao cancelar no Stripe.', details: cancelData }, 502)
    }

    // Atualiza o status local na tabela correspondente
    if (targetTable === 'customer_subscriptions') {
      await supabase
        .from('customer_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', localId)
    } else {
      await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', localId)
    }

    return json({
      success: true,
      stripe_subscription_id: stripeSubscriptionId,
      local_table: targetTable,
      local_id: localId,
      status: 'cancelled',
    })
  } catch (err: any) {
    console.error('[stripe-cancel-subscription] error:', err)
    return json({ error: err.message || 'Internal server error' }, 500)
  }
})
