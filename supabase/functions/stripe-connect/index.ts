import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripeSecrets } from '../_shared/stripe.ts'

const stripeApiBase = 'https://api.stripe.com/v1'

/**
 * Cria um cliente Supabase autenticado com o JWT do usuário que fez a
 * requisição. Garante que o tenant_id seja sempre o do profile autenticado,
 * nunca do body.
 *
 * Retorna o tenant_id válido OU null se o usuário não tiver tenant.
 */
async function getTenantIdFromUser(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return null
  const { data: profile } = await userClient
    .from('profiles')
    .select('id, tenant_id, is_super_admin')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.tenant_id ?? null
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
    const authHeader = req.headers.get('authorization') ?? null
    const tenantId = await getTenantIdFromUser(authHeader)

    if (!tenantId) {
      return json({ error: 'Usuário sem barbearia associada.' }, 403)
    }

    const { secretKey: stripeSecretKey } = await getStripeSecrets()
    if (!stripeSecretKey) {
      return json({ error: 'Stripe não configurado. Solicite a ativação ao administrador.' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Recupera a URL pública da app para preencher o business_profile.
    // APP_URL pode vir de variável de ambiente ou da Origin do request.
    const appUrl =
      Deno.env.get('APP_URL') ??
      req.headers.get('origin') ??
      req.headers.get('referer') ??
      'https://gestao-integrada-barbearia-a3c26.goskip.app'

    // --- GET: status da conta Connect do tenant ---
    if (req.method === 'GET') {
      const { data: account, error } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('[stripe-connect] GET lookup error:', error)
      }

      // Busca dados extras do Stripe se a conta já existir (sincronia oficial).
      let stripeData: Record<string, unknown> | null = null
      if (account?.stripe_account_id) {
        try {
          const resp = await fetch(`${stripeApiBase}/accounts/${account.stripe_account_id}`, {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          })
          if (resp.ok) {
            stripeData = await resp.json()
          }
        } catch (e) {
          console.error('[stripe-connect] Stripe account fetch error:', String(e))
        }
      }

      return json({
        has_account: !!account,
        account: account
          ? {
              id: account.id,
              stripe_account_id: account.stripe_account_id,
              charges_enabled: stripeData?.charges_enabled ?? account.charges_enabled,
              payouts_enabled: stripeData?.payouts_enabled ?? account.payouts_enabled,
              details_submitted: stripeData?.details_submitted ?? account.details_submitted,
            }
          : null,
      })
    }

    // --- POST: onboarding (ou login link se a conta já existir) ---
    if (req.method === 'POST') {
      // Busca conta existente
      const { data: existing, error: findError } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (findError && findError.code !== 'PGRST116') {
        console.error('[stripe-connect] POST lookup error:', findError)
      }

      // Busca slug do tenant para montar a URL de retorno de onboarding.
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('slug, name')
        .eq('id', tenantId)
        .maybeSingle()

      const tenantSlug = tenantRow?.slug || ''
      const businessUrl = tenantSlug
        ? `${appUrl.replace(/\/$/, '')}/agendar/${tenantSlug}`
        : appUrl.replace(/\/$/, '')

      const returnUrl = `${appUrl.replace(/\/$/, '')}/dashboard/pagamentos`

      let stripeAccountId: string

      // Cria a Express Account (MCC 7230 - Barber and Beauty Shops)
      if (!existing?.stripe_account_id) {
        const params = new URLSearchParams()
        params.append('type', 'express')
        params.append('country', 'BR')
        params.append('business_type', 'individual')
        params.append('business_profile[mcc]', '7230')
        params.append('business_profile[url]', businessUrl)
        params.append('business_profile[name]', tenantRow?.name || 'Barbearia')
        params.append('capabilities[card_payments][requested]', 'true')
        params.append('capabilities[transfers][requested]', 'true')
        params.append('metadata[tenant_id]', tenantId)

        const resp = await fetch(`${stripeApiBase}/accounts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        })
        const accountData = await resp.json()
        if (!resp.ok) {
          console.error('[stripe-connect] Stripe create account error:', accountData)
          return json({ error: 'Erro ao criar conta Stripe Connect.', details: accountData }, 502)
        }

        stripeAccountId = accountData.id

        // Salva a conta na tabela local (upsert por tenant_id)
        const { error: upsertError } = await supabase.from('stripe_connect_accounts').upsert(
          {
            tenant_id: tenantId,
            stripe_account_id: stripeAccountId,
            charges_enabled: !!accountData.charges_enabled,
            payouts_enabled: !!accountData.payouts_enabled,
            details_submitted: !!accountData.details_submitted,
          },
          { onConflict: 'tenant_id' },
        )

        if (upsertError) {
          console.error('[stripe-connect] upsert account error:', upsertError)
        }

        // Atualiza cache no tenant
        await supabase
          .from('tenants')
          .update({ stripe_connect_id: stripeAccountId })
          .eq('id', tenantId)
      } else {
        // Conta já existe: se já concluiu o onboarding, gera login link.
        stripeAccountId = existing.stripe_account_id
        if (existing.details_submitted && existing.charges_enabled) {
          const linkParams = new URLSearchParams()
          linkParams.append('account', stripeAccountId)
          const linkResp = await fetch(`${stripeApiBase}/account_links?${linkParams.toString()}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              account: stripeAccountId,
              redirect_url: returnUrl,
              refresh_url: returnUrl,
              type: 'account_onboarding',
            }).toString(),
          })
          const linkData = await linkResp.json()
          if (!linkResp.ok) {
            console.error('[stripe-connect] login link error:', linkData)
            return json({ error: 'Erro ao gerar link de acesso.' }, 502)
          }
          return json({
            account_link_url: linkData.url,
            stripe_account_id: stripeAccountId,
            action: 'login',
          })
        }
      }

      // Gera Account Link de onboarding
      const linkParams = new URLSearchParams()
      linkParams.append('account', stripeAccountId)
      linkParams.append('refresh_url', returnUrl)
      linkParams.append('return_url', returnUrl)
      linkParams.append('type', 'account_onboarding')

      const linkResp = await fetch(`${stripeApiBase}/account_links`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: linkParams.toString(),
      })
      const linkData = await linkResp.json()
      if (!linkResp.ok) {
        console.error('[stripe-connect] account_link error:', linkData)
        return json({ error: 'Erro ao gerar link de onboarding.' }, 502)
      }

      return json({
        account_link_url: linkData.url,
        stripe_account_id: stripeAccountId,
        action: existing?.stripe_account_id ? 'onboarding' : 'create',
      })
    }

    return json({ error: 'Método não suportado.' }, 405)
  } catch (err: any) {
    console.error('[stripe-connect] error:', err)
    return json({ error: err.message || 'Internal server error' }, 500)
  }
})
