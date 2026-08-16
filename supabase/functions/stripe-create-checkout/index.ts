import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripeSecrets } from './stripe.ts'

interface CheckoutBody {
  plan_id: string
  client_id: string
  payment_type: 'monthly' | 'prepaid'
  success_url?: string
  cancel_url?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const { secretKey: stripeSecretKey } = await getStripeSecrets()

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe não configurado. Defina STRIPE_SECRET_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: CheckoutBody = await req.json()
    const { plan_id, client_id, payment_type, success_url, cancel_url } = body

    if (!plan_id || !client_id) {
      return new Response(JSON.stringify({ error: 'plan_id e client_id são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()
    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plano não encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!plan.active) {
      return new Response(JSON.stringify({ error: 'Plano inativo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load client
    const { data: client, error: clientError } = await supabase
      .from('customers')
      .select('id, name, email, phone, cpf, tenant_id')
      .eq('id', client_id)
      .single()
    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = req.headers.get('origin') || req.headers.get('referer') || ''
    const baseUrl = origin ? new URL(origin).origin : 'http://localhost:8080'
    const finalSuccessUrl =
      success_url || `${baseUrl}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`
    const finalCancelUrl = cancel_url || `${baseUrl}/agendar/${plan.tenant_id}`

    // --- Stripe API calls (no SDK import — direct fetch to Stripe REST API) ---
    const stripeApiBase = 'https://api.stripe.com/v1'

    // 1. Create or reuse customer
    let stripeCustomerId: string | null = null

    // Try to find existing subscription for this client to reuse customer
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('client_id', client_id)
      .eq('tenant_id', plan.tenant_id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id
    } else {
      const customerParams = new URLSearchParams()
      customerParams.append('name', client.name || 'Cliente')
      if (client.email) customerParams.append('email', client.email)
      if (client.phone) customerParams.append('phone', client.phone)
      customerParams.append('metadata[client_id]', client.id)
      customerParams.append('metadata[tenant_id]', client.tenant_id || '')
      if (client.cpf) customerParams.append('metadata[cpf]', client.cpf)

      const customerResp = await fetch(`${stripeApiBase}/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams.toString(),
      })
      const customerData = await customerResp.json()
      if (!customerResp.ok) {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar customer no Stripe.', details: customerData }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      stripeCustomerId = customerData.id
    }

    // 2. Build Checkout Session
    const sessionParams = new URLSearchParams()
    sessionParams.append('mode', 'payment')
    sessionParams.append('customer', stripeCustomerId)
    sessionParams.append('success_url', finalSuccessUrl)
    sessionParams.append('cancel_url', finalCancelUrl)
    sessionParams.append('metadata[plan_id]', plan.id)
    sessionParams.append('metadata[client_id]', client.id)
    sessionParams.append('metadata[tenant_id]', plan.tenant_id)
    sessionParams.append('metadata[payment_type]', payment_type)
    sessionParams.append('client_reference_id', client.id)

    const price = Number(plan.price) || 0
    const months = Number(plan.prepaid_months) || 0
    const discountPct = Number(plan.prepaid_discount_pct) || 0

    if (payment_type === 'prepaid' && months > 0) {
      // Prepaid: one-time payment with discount
      const finalPrice = Number(plan.prepaid_price) || price * months * (1 - discountPct / 100)
      const unitAmountCents = Math.round(finalPrice * 100)
      sessionParams.append('line_items[0][quantity]', '1')
      sessionParams.append('line_items[0][price_data][currency]', 'brl')
      sessionParams.append('line_items[0][price_data][unit_amount]', String(unitAmountCents))
      sessionParams.append(
        'line_items[0][price_data][product_data][name]',
        `${plan.name} — Pacote ${months} meses`,
      )
      sessionParams.append(
        'line_items[0][price_data][product_data][description]',
        plan.description || `Plano ${plan.name} pago antecipadamente (${months} meses)`,
      )
    } else {
      // Monthly: one-time payment for the first month; webhook will activate the subscription.
      const unitAmountCents = Math.round(price * 100)
      sessionParams.append('line_items[0][quantity]', '1')
      sessionParams.append('line_items[0][price_data][currency]', 'brl')
      sessionParams.append('line_items[0][price_data][unit_amount]', String(unitAmountCents))
      sessionParams.append(
        'line_items[0][price_data][product_data][name]',
        `${plan.name} — Primeira mensalidade`,
      )
      sessionParams.append(
        'line_items[0][price_data][product_data][description]',
        plan.description || `Assinatura mensal do plano ${plan.name}`,
      )
    }

    const sessionResp = await fetch(`${stripeApiBase}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString(),
    })
    const sessionData = await sessionResp.json()
    if (!sessionResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar Checkout Session.', details: sessionData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        checkout_url: sessionData.url,
        session_id: sessionData.id,
        stripe_customer_id: stripeCustomerId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('stripe-create-checkout error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
