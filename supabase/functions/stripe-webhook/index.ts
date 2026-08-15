import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

async function verifyStripeSignature(payload: string, signature: string, secret: string) {
  // Minimal Stripe webhook signature verification using Web Crypto API.
  // Stripe signs with HMAC-SHA256; header format: t=...,v1=...
  const parts = signature.split(',').map((p) => p.trim())
  let t: string | null = null
  let v1: string | null = null
  for (const part of parts) {
    const [k, v] = part.split('=')
    if (k === 't') t = v
    if (k === 'v1') v1 = v
  }
  if (!t || !v1) return false

  const signedPayload = `${t}.${payload}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  // Compare in constant time-ish
  if (computed.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

    if (!stripeSecretKey || !webhookSecret) {
      return new Response(JSON.stringify({ error: 'Stripe webhook não configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    const isValid = await verifyStripeSignature(payload, signature, webhookSecret)
    if (!isValid) {
      console.error('[stripe-webhook] Invalid signature')
      return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const event = JSON.parse(payload)
    console.log('[stripe-webhook] Received event:', event.type)

    const stripeApiBase = 'https://api.stripe.com/v1'

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const planId = session.metadata?.plan_id
      const clientId = session.metadata?.client_id
      const tenantId = session.metadata?.tenant_id
      const paymentType = session.metadata?.payment_type || 'monthly'

      if (!planId || !clientId || !tenantId) {
        console.error('[stripe-webhook] Missing metadata in session', session.id)
        return new Response(JSON.stringify({ error: 'Metadata ausente' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id, name, price, prepaid_months, prepaid_discount_pct, prepaid_price')
        .eq('id', planId)
        .single()

      const price = Number(plan?.price) || 0
      const months = Number(plan?.prepaid_months) || 0
      const discountPct = Number(plan?.prepaid_discount_pct) || 0
      const prepaidPrice = Number(plan?.prepaid_price) || 0

      const startDate = new Date()
      const endDate = new Date(startDate)
      if (paymentType === 'prepaid' && months > 0) {
        endDate.setMonth(endDate.getMonth() + months)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      const amountPaid =
        paymentType === 'prepaid' && months > 0
          ? prepaidPrice || price * months * (1 - discountPct / 100)
          : price

      const { error: insertError } = await supabase.from('subscriptions').insert({
        client_id: clientId,
        tenant_id: tenantId,
        plan_id: planId,
        stripe_subscription_id: session.subscription || session.id,
        stripe_customer_id: session.customer,
        status: 'active',
        payment_type: paymentType,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        amount_paid: amountPaid,
      })

      if (insertError) {
        console.error('[stripe-webhook] Error inserting subscription:', insertError)
      }

      // Create invoice record
      if (session.id) {
        await supabase.from('subscription_invoices').insert({
          subscription_id: null,
          stripe_invoice_id: session.id,
          amount: amountPaid,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
      }

      // Notify via WhatsApp if possible
      try {
        const { data: client } = await supabase
          .from('customers')
          .select('name, phone, tenant_id')
          .eq('id', clientId)
          .single()
        if (client?.phone) {
          const msg = `Olá ${client.name}! 🎉 Sua assinatura do plano "${plan?.name || ''}" está ativa. Aproveite seus benefícios na barbearia!`
          await fetch(`${supabaseUrl}/functions/v1/send-manual-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tenant_id: client.tenant_id,
              phone: client.phone,
              message: msg,
            }),
          })
        }
      } catch (e) {
        console.error('[stripe-webhook] WhatsApp notify error:', String(e))
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      // Find local subscription by stripe_subscription_id and extend end_date (monthly renewal)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, end_date, payment_type')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      if (sub) {
        const newEnd = new Date(sub.end_date || new Date())
        newEnd.setMonth(newEnd.getMonth() + 1)
        await supabase
          .from('subscriptions')
          .update({ status: 'active', end_date: newEnd.toISOString().slice(0, 10) })
          .eq('id', sub.id)

        await supabase.from('subscription_invoices').insert({
          subscription_id: sub.id,
          stripe_invoice_id: invoice.id,
          amount: Number(invoice.amount_paid || invoice.total || 0) / 100,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()
      if (sub) {
        await supabase.from('subscriptions').update({ status: 'suspended' }).eq('id', sub.id)
        await supabase.from('subscription_invoices').insert({
          subscription_id: sub.id,
          stripe_invoice_id: invoice.id,
          amount: Number(invoice.amount_due || 0) / 100,
          status: 'failed',
        })
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      if (sub) {
        await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
      }
    } else {
      console.log('[stripe-webhook] Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[stripe-webhook] error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
