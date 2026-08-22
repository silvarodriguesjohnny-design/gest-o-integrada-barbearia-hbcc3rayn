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

function stripAuthForRead() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(supabaseUrl, serviceKey)
}

/** Cria um cliente Supabase autenticado com o JWT do usuário. */
function userClient(authHeader: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader ?? '' } },
  })
}

/** Resolve o tenant_id autenticado do usuário (ou null). */
async function getTenantIdFromUser(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null
  const client = userClient(authHeader)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null
  const { data: profile } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.tenant_id ?? null
}

/** Busca a conta Stripe Connect ativa (charges_enabled) do tenant. */
async function getConnectAccount(supabase: ReturnType<typeof stripAuthForRead>, tenantId: string) {
  const { data, error } = await supabase
    .from('stripe_connect_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.error('[stripe-create-checkout] connect lookup error:', error)
  }
  if (data && data.charges_enabled && data.stripe_account_id) {
    return data
  }
  return null
}

/** Chamada POST no formato x-www-form-urlencoded. */
async function stripePost(
  path: string,
  secretKey: string,
  params: URLSearchParams,
  stripeAccount?: string,
): Promise<{ ok: boolean; data: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (stripeAccount) headers['Stripe-Account'] = stripeAccount
  const resp = await fetch(`${stripeApiBase}${path}`, {
    method: 'POST',
    headers,
    body: params.toString(),
  })
  const data = await resp.json().catch(() => null)
  return { ok: resp.ok, data }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization') ?? null
    const body = await req.json().catch(() => ({}))
    const scenario = body.scenario as string | undefined
    const { secretKey: stripeSecretKey } = await getStripeSecrets()

    if (!stripeSecretKey) {
      return json({ error: 'Stripe não configurado na plataforma.' }, 500)
    }

    const supabase = stripAuthForRead()
    const appUrl =
      Deno.env.get('APP_URL') ??
      req.headers.get('origin') ??
      'https://gestao-integrada-barbearia-a3c26.goskip.app'

    // =====================================================================
    // CENÁRIO 1 — SaaS: barbearia assinando a plataforma (trial de 30 dias)
    // =====================================================================
    if (scenario === 'saas' || body.price_id) {
      // tenant_id vem do JWT, nunca do body.
      const tenantId = await getTenantIdFromUser(authHeader)
      if (!tenantId) {
        return json({ error: 'Usuário sem barbearia associada.' }, 403)
      }

      const priceId = body.price_id
      const successUrl = body.success_url || `${appUrl}/onboarding/sucesso`
      const cancelUrl = body.cancel_url || `${appUrl}/dashboard/pagamentos`
      const planType = body.plan_type || ''
      const tenantSlug = body.tenant_slug || ''

      // Recupera a barbearia para criar/atualizar o Customer
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug, owner_email, subscription_status')
        .eq('id', tenantId)
        .maybeSingle()

      // Cria (ou recupera) o Stripe Customer associado à barbearia
      let customerId = ''
      const { data: existingCustomer } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .maybeSingle()

      if (existingCustomer?.stripe_customer_id) {
        customerId = existingCustomer.stripe_customer_id
      } else {
        const createCustomerParams = new URLSearchParams()
        createCustomerParams.append('email', tenant?.owner_email || '')
        createCustomerParams.append('name', tenant?.name || 'Barbearia')
        createCustomerParams.append('metadata[tenant_id]', tenantId)
        const cResp = await stripePost('/customers', stripeSecretKey, createCustomerParams)
        if (!cResp.ok) {
          console.error('[stripe-create-checkout] create customer error:', cResp.data)
          return json({ error: 'Erro ao criar cliente Stripe.' }, 502)
        }
        customerId = cResp.data.id
        await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId)
      }

      const params = new URLSearchParams()
      params.append('mode', 'subscription')
      params.append('customer', customerId)
      params.append('line_items[0][price]', priceId)
      params.append('line_items[0][quantity]', '1')
      // REGRA #1: cartão DEVE ser coletado no trial (sempre 'always').
      // Sem isso no 31º dia não há como cobrar.
      params.append('payment_method_collection', 'always')
      params.append('success_url', successUrl)
      params.append('cancel_url', cancelUrl)
      params.append('metadata[tenant_id]', tenantId)
      params.append('metadata[plan_type]', planType)
      params.append('metadata[scenario]', 'saas')
      if (tenantSlug) params.append('metadata[tenant_slug]', tenantSlug)
      // subscription_data com metadata (o trial_period_days já está no Price)
      params.append('subscription_data[metadata][tenant_id]', tenantId)
      params.append('subscription_data[metadata][plan_type]', planType)

      const resp = await stripePost('/checkout/sessions', stripeSecretKey, params)
      if (!resp.ok) {
        console.error('[stripe-create-checkout] SaaS checkout error:', resp.data)
        return json({ error: 'Erro ao criar sessão de checkout SaaS.', details: resp.data }, 502)
      }
      return json({ url: resp.data.url, session_id: resp.data.id })
    }

    // =====================================================================
    // CENÁRIO 2 — Agendamento: cliente final pagando por um agendamento
    // =====================================================================
    if (scenario === 'appointment' || body.appointment_id) {
      const appointmentId = String(body.appointment_id || '')
      const amountCents = Number(body.amount) // já em centavos
      const customerName = String(body.customer_name || '')
      const customerEmail = String(body.customer_email || '')
      const successUrl = body.success_url || `${appUrl}/agendar/sucesso`
      const cancelUrl = body.cancel_url || `${appUrl}/agendar/cancelado`

      // REGRA #6: tenant_id NUNCA vem do body. Para fluxo público vem do
      // appointment (que foi criado com tenant_id do dono da barbearia).
      // Recupera o tenant_id a partir do appointment_id.
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, tenant_id, status')
        .eq('id', appointmentId)
        .maybeSingle()

      if (!appointment) {
        return json({ error: 'Agendamento não encontrado.' }, 404)
      }
      const tenantId = appointment.tenant_id
      if (!tenantId) {
        return json({ error: 'Agendamento sem tenant_id.' }, 400)
      }

      // REGRA #8: o agendamento DEVE já estar salvo com status 'pending_payment'
      // antes do redirect ao Stripe (reserva o horário). Verificamos aqui.
      if (appointment.status !== 'pending_payment') {
        // Se não está em pending_payment, não conseguimos garantir a reserva do
        // horário. Avisamos mas não bloqueamos — o fluxo público já cria antes.
        console.warn(
          '[stripe-create-checkout] appointment não está em pending_payment:',
          appointment.status,
        )
      }

      const connectAccount = await getConnectAccount(supabase, tenantId)

      const params = new URLSearchParams()
      params.append('mode', 'payment')
      params.append('line_items[0][quantity]', '1')
      params.append('line_items[0][price_data][currency]', 'brl')
      params.append(
        'line_items[0][price_data][product_data][name]',
        `Agendamento - ${customerName || 'Cliente'}`,
      )
      params.append('line_items[0][price_data][unit_amount]', String(amountCents))
      params.append('success_url', successUrl)
      params.append('cancel_url', cancelUrl)
      params.append('metadata[appointment_id]', appointmentId)
      params.append('metadata[tenant_id]', tenantId)
      params.append('metadata[customer_name]', customerName)
      params.append('metadata[scenario]', 'appointment')
      if (customerEmail) {
        params.append('customer_email', customerEmail)
      }

      // REGRA #5: se a barbearia NÃO tem Connect ativo, o pagamento cai na
      // plataforma (sem application_fee nem transfer_data). O cliente final
      // NUNCA vê erro — apenas a comissão fica pendente de repasse.
      if (connectAccount?.stripe_account_id) {
        const feeAmount = Math.round(amountCents * 0.02) // 2% de comissão
        params.append('payment_intent_data[application_fee_amount]', String(feeAmount))
        params.append(
          'payment_intent_data[transfer_data][destination]',
          connectAccount.stripe_account_id,
        )
        params.append('metadata[connect_account_id]', connectAccount.stripe_account_id)
      }

      const resp = await stripePost('/checkout/sessions', stripeSecretKey, params)
      if (!resp.ok) {
        console.error('[stripe-create-checkout] appointment checkout error:', resp.data)
        return json({ error: 'Erro ao criar checkout de agendamento.', details: resp.data }, 502)
      }
      return json({ url: resp.data.url, session_id: resp.data.id })
    }

    // =====================================================================
    // CENÁRIO 3 — Assinatura: cliente final assinando plano recorrente
    // =====================================================================
    if (scenario === 'subscription' || body.plan_id) {
      const planId = String(body.plan_id || '')
      const clientCpf = String(body.client_cpf || '').replace(/\D/g, '')
      const successUrl = body.success_url || `${appUrl}/agendar/sucesso`
      const cancelUrl = body.cancel_url || `${appUrl}/agendar/cancelado`

      // Recupera o plano e o tenant
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id, tenant_id, name, monthly_price, stripe_price_id, sessions_limit')
        .eq('id', planId)
        .maybeSingle()

      if (!plan) {
        return json({ error: 'Plano não encontrado.' }, 404)
      }
      const tenantId = plan.tenant_id
      if (!tenantId) {
        return json({ error: 'Plano sem tenant_id.' }, 400)
      }

      // Busca cliente por CPF no tenant (cria se não existir)
      const { data: customerRow } = await supabase
        .from('customers')
        .select('id, name, email, cpf')
        .eq('tenant_id', tenantId)
        .eq('cpf', clientCpf)
        .maybeSingle()

      let customerId = customerRow?.id
      let customerName = customerRow?.name || ''
      let customerEmail = customerRow?.email || ''

      if (!customerId) {
        const { data: newCustomer, error: insertErr } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenantId,
            name: body.client_name || `Cliente CPF ${clientCpf}`,
            email: body.client_email || null,
            cpf: clientCpf,
          })
          .select('id, name, email')
          .single()
        if (insertErr) {
          console.error('[stripe-create-checkout] insert customer error:', insertErr)
          return json({ error: 'Erro ao criar cliente.' }, 500)
        }
        customerId = newCustomer.id
        customerName = newCustomer.name
        customerEmail = newCustomer.email || ''
      }

      // Resolve o Stripe Price do plano
      const stripePriceId = plan.stripe_price_id
      if (!stripePriceId) {
        return json({ error: 'Plano sem Stripe Price configurado.' }, 400)
      }

      // Busca/cria o Stripe Customer para o cliente final
      let stripeCustomerId = ''
      const { data: custSub } = await supabase
        .from('customer_subscriptions')
        .select('stripe_customer_id')
        .eq('customer_id', customerId)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .maybeSingle()

      // Busca Stripe Customer diretamente via metadata
      const customerSearchParams = new URLSearchParams()
      customerSearchParams.append(
        'query',
        `metadata[customer_id]:'${customerId}' AND metadata[tenant_id]:'${tenantId}'`,
      )
      customerSearchParams.append('limit', '1')
      const searchResp = await stripePost(
        '/customers/search',
        stripeSecretKey,
        customerSearchParams,
      )
      if (searchResp.ok && searchResp.data?.data?.length > 0) {
        stripeCustomerId = searchResp.data.data[0].id
      }

      if (!stripeCustomerId) {
        const createParams = new URLSearchParams()
        if (customerEmail) createParams.append('email', customerEmail)
        if (customerName) createParams.append('name', customerName)
        createParams.append('metadata[customer_id]', customerId)
        createParams.append('metadata[tenant_id]', tenantId)
        createParams.append('metadata[cpf]', clientCpf)
        const cResp = await stripePost('/customers', stripeSecretKey, createParams)
        if (!cResp.ok) {
          console.error('[stripe-create-checkout] create customer (sub) error:', cResp.data)
          return json({ error: 'Erro ao criar cliente Stripe.' }, 502)
        }
        stripeCustomerId = cResp.data.id
      }

      void custSub

      const connectAccount = await getConnectAccount(supabase, tenantId)

      const params = new URLSearchParams()
      params.append('mode', 'subscription')
      params.append('customer', stripeCustomerId)
      params.append('line_items[0][price]', stripePriceId)
      params.append('line_items[0][quantity]', '1')
      // REGRA #1: cartão coletado no trial/sempre.
      params.append('payment_method_collection', 'always')
      params.append('success_url', successUrl)
      params.append('cancel_url', cancelUrl)
      params.append('metadata[plan_id]', planId)
      params.append('metadata[customer_id]', customerId)
      params.append('metadata[tenant_id]', tenantId)
      params.append('metadata[scenario]', 'subscription_client')
      // REGRA #2: comissão de 2% em TODA transação do cliente final, inclusive
      // renovações — usamos application_fee_percent no subscription_data.
      params.append('subscription_data[application_fee_percent]', '2.0')
      params.append('subscription_data[metadata][plan_id]', planId)
      params.append('subscription_data[metadata][customer_id]', customerId)
      params.append('subscription_data[metadata][tenant_id]', tenantId)

      // Se a barbearia tem Connect ativo, a assinatura é criada na conta dela
      // (com a comissão da plataforma via application_fee_percent).
      if (connectAccount?.stripe_account_id) {
        params.append(
          'subscription_data[transfer_data][destination]',
          connectAccount.stripe_account_id,
        )
      }

      const resp = await stripePost('/checkout/sessions', stripeSecretKey, params)
      if (!resp.ok) {
        console.error('[stripe-create-checkout] subscription checkout error:', resp.data)
        return json({ error: 'Erro ao criar checkout de assinatura.', details: resp.data }, 502)
      }
      return json({ url: resp.data.url, session_id: resp.data.id })
    }

    return json({ error: 'Cenário de checkout desconhecido.' }, 400)
  } catch (err: any) {
    console.error('[stripe-create-checkout] error:', err)
    return json({ error: err.message || 'Internal server error' }, 500)
  }
})
