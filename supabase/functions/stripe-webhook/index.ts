import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripeSecrets } from '../_shared/stripe.ts'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const { secretKey: stripeSecretKey, webhookSecret } = await getStripeSecrets()

    if (!stripeSecretKey || !webhookSecret) {
      return json({ error: 'Stripe webhook não configurado.' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    const isValid = await verifyStripeSignature(payload, signature, webhookSecret)
    if (!isValid) {
      console.error('[stripe-webhook] Invalid signature')
      return json({ error: 'Assinatura inválida' }, 400)
    }

    const event = JSON.parse(payload)
    console.log('[stripe-webhook] Received event:', event.type)

    // Registra o evento recebido para o painel admin exibir o status do webhook.
    try {
      await supabase.from('stripe_webhook_events').insert({
        event_type: event.type,
        event_id: event.id || null,
      })
    } catch (logErr) {
      console.error('[stripe-webhook] Error logging event:', String(logErr))
    }

    // =========================================================================
    // checkout.session.completed — 3 cenários (SaaS, Agendamento, Assinatura)
    // =========================================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const scenario = session.metadata?.scenario || ''
      const tenantId = session.metadata?.tenant_id
      const planId = session.metadata?.plan_id
      const clientId = session.metadata?.client_id || session.metadata?.customer_id
      const appointmentId = session.metadata?.appointment_id
      const customerName = session.metadata?.customer_name

      // -------------------------------------------------------------------
      // CENÁRIO 1 — SaaS: barbearia assinando a plataforma (trial 30 dias)
      // -------------------------------------------------------------------
      if (scenario === 'saas') {
        if (tenantId) {
          // Atualiza o tenant: assinatura ativa, trial zerado (já cobriu cartão).
          await supabase
            .from('tenants')
            .update({
              subscription_status: 'active',
              subscription_type: 'active',
              trial_ends_at: null,
              stripe_customer_id: session.customer || null,
            })
            .eq('id', tenantId)
        }

        // Registra em subscription_invoices (SaaS).
        try {
          await supabase.from('subscription_invoices').insert({
            subscription_id: null,
            stripe_invoice_id: session.id,
            amount: Number(session.amount_total || 0) / 100,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
        } catch (invErr) {
          console.error('[stripe-webhook] SaaS invoice insert error:', String(invErr))
        }
      }

      // -------------------------------------------------------------------
      // CENÁRIO 2 — Agendamento: cliente final pagou por um agendamento
      // -------------------------------------------------------------------
      else if (scenario === 'appointment' && appointmentId) {
        // Atualiza appointment status para 'scheduled'
        await supabase.from('appointments').update({ status: 'scheduled' }).eq('id', appointmentId)

        // REGRA: registra a comissão da plataforma (2%) em platform_earnings.
        const amountTotal = Number(session.amount_total || 0)
        const commission = Math.round(amountTotal * 0.02) / 100 // 2% em reais
        try {
          await supabase.from('platform_earnings').insert({
            tenant_id: tenantId || null,
            amount: commission,
            fee_percent: 2.0,
            source_type: 'appointment',
            source_id: appointmentId,
            stripe_charge_id: session.payment_intent || null,
            status: session.metadata?.connect_account_id ? 'transferred' : 'pending',
          })
        } catch (earnErr) {
          console.error('[stripe-webhook] platform_earnings insert error:', String(earnErr))
        }
      }

      // -------------------------------------------------------------------
      // CENÁRIO 2b — Agendamento + Produtos: cliente final pagou agendamento
      // + carrinho de produtos (fluxo pós-agendamento do link público).
      // Confirma o agendamento, dispara a notificação e registra product_sales.
      // -------------------------------------------------------------------
      else if (scenario === 'public_booking' && appointmentId && tenantId) {
        // 1. Confirma o agendamento (pending_payment -> scheduled).
        const { data: appt } = await supabase
          .from('appointments')
          .select('id, status')
          .eq('id', appointmentId)
          .maybeSingle()
        if (appt && appt.status === 'pending_payment') {
          await supabase
            .from('appointments')
            .update({ status: 'scheduled' })
            .eq('id', appointmentId)
          // Dispara a notificação de confirmação.
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-appointment-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ appointment_id: appointmentId, type: 'confirmation' }),
            })
          } catch (notifyErr) {
            console.error('[stripe-webhook] public_booking notification error:', String(notifyErr))
          }
        }

        // 2. Registra a comissão da plataforma (2%) sobre o total pago.
        const amountTotal = Number(session.amount_total || 0)
        const commission = Math.round(amountTotal * 0.02) / 100
        try {
          await supabase.from('platform_earnings').insert({
            tenant_id: tenantId,
            amount: commission,
            fee_percent: 2.0,
            source_type: 'appointment',
            source_id: appointmentId,
            stripe_charge_id: session.payment_intent || null,
            status: session.metadata?.connect_account_id ? 'transferred' : 'pending',
          })
        } catch (earnErr) {
          console.error('[stripe-webhook] public_booking platform_earnings error:', String(earnErr))
        }

        // 3. Registra as vendas de produtos (online).
        // Recupera os product_ids do metadata e busca os preços reais para
        // registrar unit_price/total corretamente. Quantidade derivada do
        // line_items (price_data.name + unit_amount + quantity).
        const productIdsRaw = String(session.metadata?.product_ids || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
        if (productIdsRaw.length > 0) {
          const { data: productsRows } = await supabase
            .from('products')
            .select('id, name, price')
            .in('id', productIdsRaw)
          const priceMap = new Map<string, number>()
          for (const p of productsRows || []) {
            priceMap.set(p.id, Number(p.price) || 0)
          }

          // Reconstrói as quantidades a partir dos line_items do checkout
          // (cada produto tem um price_data com name + unit_amount + quantity).
          const lineItems = Array.isArray(session.line_items?.data) ? session.line_items.data : []
          // Para cada product_id, encontra o line item correspondente pelo
          // nome (price_data.name == product.name) e registra a quantidade.
          const salesRows: any[] = []
          for (const pid of productIdsRaw) {
            const prodName = (productsRows || []).find((p: any) => p.id === pid)?.name || ''
            const unitPrice = priceMap.get(pid) || 0
            // Busca o line item cujo name coincide com o nome do produto.
            const li = lineItems.find(
              (l: any) => l?.description === prodName || l?.name === prodName,
            )
            const qty = Math.max(1, Number(li?.quantity || 1))
            salesRows.push({
              appointment_id: appointmentId,
              tenant_id: tenantId,
              product_id: pid,
              quantity: qty,
              unit_price: unitPrice,
              total: qty * unitPrice,
              payment_method: 'online',
            })
          }
          if (salesRows.length > 0) {
            try {
              await supabase.from('product_sales').insert(salesRows)
            } catch (saleErr) {
              console.error('[stripe-webhook] product_sales insert error:', String(saleErr))
            }
          }
        }
      }

      // -------------------------------------------------------------------
      // CENÁRIO 3 — Assinatura: cliente final assinando plano recorrente
      // -------------------------------------------------------------------
      else if (scenario === 'subscription_client' && clientId && tenantId) {
        const stripeSubscriptionId = session.subscription
        // Busca o plano para sessions_limit
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('id, name, monthly_price, sessions_limit')
          .eq('id', planId)
          .maybeSingle()

        const sessionsLimit = Number(plan?.sessions_limit) || 4

        // Cria/atualiza customer_subscriptions
        const { data: existingSub } = await supabase
          .from('customer_subscriptions')
          .select('id')
          .eq('customer_id', clientId)
          .eq('tenant_id', tenantId)
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .maybeSingle()

        if (existingSub) {
          await supabase
            .from('customer_subscriptions')
            .update({
              status: 'active',
              sessions_used: 0,
              sessions_limit: sessionsLimit,
              plan_id: planId,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', existingSub.id)
        } else {
          await supabase.from('customer_subscriptions').insert({
            customer_id: clientId,
            tenant_id: tenantId,
            plan_id: planId,
            stripe_subscription_id: stripeSubscriptionId,
            status: 'active',
            sessions_used: 0,
            sessions_limit: sessionsLimit,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }

        // Notifica cliente por WhatsApp se possível.
        try {
          const { data: client } = await supabase
            .from('customers')
            .select('name, phone, tenant_id')
            .eq('id', clientId)
            .maybeSingle()
          if (client?.phone) {
            const msg = `Olá ${client.name}! 🎉 Sua assinatura do plano "${plan?.name || ''}" está ativa. Aproveite seus ${sessionsLimit} créditos de agendamento!`
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
      }

      // -------------------------------------------------------------------
      // Fluxo legado (sem scenario explícito — compatibilidade com checkout
      // antigo de assinatura de cliente via plano).
      // -------------------------------------------------------------------
      else if (planId && clientId && tenantId) {
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select(
            'id, name, price, prepaid_months, prepaid_discount_pct, prepaid_price, sessions_limit',
          )
          .eq('id', planId)
          .maybeSingle()

        const price = Number(plan?.price) || 0
        const months = Number(plan?.prepaid_months) || 0
        const discountPct = Number(plan?.prepaid_discount_pct) || 0
        const prepaidPrice = Number(plan?.prepaid_price) || 0
        const sessionsLimit = Number(plan?.sessions_limit) || 4
        const paymentType = session.metadata?.payment_type || 'monthly'

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

        // Cria/reativa customer_subscriptions (créditos de agendamento)
        const { data: existingSub } = await supabase
          .from('customer_subscriptions')
          .select('id')
          .eq('customer_id', clientId)
          .eq('tenant_id', tenantId)
          .eq('stripe_subscription_id', session.subscription || session.id)
          .maybeSingle()

        if (existingSub) {
          await supabase
            .from('customer_subscriptions')
            .update({
              status: 'active',
              sessions_used: 0,
              sessions_limit: sessionsLimit,
              plan_id: planId,
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
            })
            .eq('id', existingSub.id)
        } else {
          await supabase.from('customer_subscriptions').insert({
            customer_id: clientId,
            tenant_id: tenantId,
            plan_id: planId,
            stripe_subscription_id: session.subscription || session.id,
            status: 'active',
            sessions_used: 0,
            sessions_limit: sessionsLimit,
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
          })
        }

        if (session.id) {
          await supabase.from('subscription_invoices').insert({
            subscription_id: null,
            stripe_invoice_id: session.id,
            amount: amountPaid,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
        }
      }
    }

    // =========================================================================
    // invoice.payment_succeeded
    //   - billing_reason = 'subscription_cycle' (renovação mensal): ZERAR
    //     sessions_used na customer_subscriptions (REGRA #4). Sem isso o cliente
    //     paga o segundo mês e não consegue agendar.
    //   - billing_reason = 'subscription_create': manter sessions_used = 0.
    // =========================================================================
    else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      const billingReason = invoice.billing_reason

      // Zera sessions_used na renovação de ciclo.
      if (subscriptionId && billingReason === 'subscription_cycle') {
        const { data: custSub } = await supabase
          .from('customer_subscriptions')
          .select('id, customer_id, tenant_id')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle()

        if (custSub) {
          await supabase
            .from('customer_subscriptions')
            .update({
              sessions_used: 0,
              status: 'active',
              current_period_start: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString()
                : new Date().toISOString(),
              current_period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', custSub.id)
          console.log('[stripe-webhook] sessions_used zerado (renovação):', subscriptionId)
        }
      }

      // Legado: atualiza subscriptions (end_date + invoice).
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
    }

    // =========================================================================
    // invoice.payment_failed — marca customer_subscriptions como 'past_due'
    // =========================================================================
    else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription

      if (subscriptionId) {
        await supabase
          .from('customer_subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)
      }

      // Legado: subscriptions
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
    }

    // =========================================================================
    // customer.subscription.deleted — marca customer_subscriptions como
    // 'cancelled'
    // =========================================================================
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object

      await supabase
        .from('customer_subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', subscription.id)

      // Legado: subscriptions
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      if (sub) {
        await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
      }
    }

    // =========================================================================
    // account.updated (Stripe Connect) — atualiza charges_enabled etc.
    // =========================================================================
    else if (event.type === 'account.updated') {
      const account = event.data.object
      const accountId = account.id

      await supabase
        .from('stripe_connect_accounts')
        .update({
          charges_enabled: !!account.charges_enabled,
          payouts_enabled: !!account.payouts_enabled,
          details_submitted: !!account.details_submitted,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', accountId)

      // Sincroniza cache no tenant
      const { data: connectRow } = await supabase
        .from('stripe_connect_accounts')
        .select('tenant_id, charges_enabled')
        .eq('stripe_account_id', accountId)
        .maybeSingle()

      if (connectRow?.tenant_id) {
        await supabase
          .from('tenants')
          .update({ stripe_connect_enabled: !!connectRow.charges_enabled })
          .eq('id', connectRow.tenant_id)
      }
    }

    return json({ received: true })
  } catch (err: any) {
    console.error('[stripe-webhook] error:', err)
    return json({ error: err.message || 'Internal server error' }, 500)
  }
})
