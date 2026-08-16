import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripeSecrets } from '../_shared/stripe.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const { secretKey: stripeSecretKey } = await getStripeSecrets()

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe não configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: 'subscription_id é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('id', subscription_id)
      .single()

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: 'Assinatura não encontrada.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cancela no Stripe se existir subscription id
    if (sub.stripe_subscription_id) {
      try {
        const resp = await fetch(
          `https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          },
        )
        if (!resp.ok) {
          const data = await resp.json()
          console.error('[stripe-cancel] Stripe cancel error:', data)
        }
      } catch (e) {
        console.error('[stripe-cancel] Stripe API error:', String(e))
      }
    }

    // Atualiza status local
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', sub.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[stripe-cancel] error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
