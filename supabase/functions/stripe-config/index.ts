import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SaveBody {
  publishable_key?: string
  secret_key?: string
  webhook_secret?: string
}

/**
 * Valida a conexão com a API do Stripe fazendo uma chamada de teste
 * (GET /v1/account). Retorna { valid, account_id, error }.
 */
async function validateStripe(secretKey: string): Promise<{
  valid: boolean
  account_id?: string
  country?: string
  error?: string
}> {
  if (!secretKey) return { valid: false, error: 'Chave secreta não informada.' }
  try {
    const resp = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = await resp.json()
    if (!resp.ok) {
      return { valid: false, error: data?.error?.message || 'Credenciais inválidas.' }
    }
    return {
      valid: true,
      account_id: data.id,
      country: data.country,
    }
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Falha ao conectar com o Stripe.' }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // --- GET: retorna o status da configuração (sem expor as chaves) ---
    if (req.method === 'GET') {
      const { data: rows } = await supabase
        .from('platform_secrets')
        .select('key, value, updated_at')
        .in('key', ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])

      const map = new Map<string, { value: string; updated_at: string }>()
      for (const r of rows || []) {
        if (r.value) map.set(r.key, { value: r.value, updated_at: r.updated_at })
      }

      const hasPublishable = map.has('STRIPE_PUBLISHABLE_KEY')
      const hasSecret = map.has('STRIPE_SECRET_KEY')
      const hasWebhook = map.has('STRIPE_WEBHOOK_SECRET')

      // Também considera secrets de ambiente do projeto
      const envPublishable = !!Deno.env.get('STRIPE_PUBLISHABLE_KEY')
      const envSecret = !!Deno.env.get('STRIPE_SECRET_KEY')
      const envWebhook = !!Deno.env.get('STRIPE_WEBHOOK_SECRET')

      const configuredPublishable = hasPublishable || envPublishable
      const configuredSecret = hasSecret || envSecret
      const configuredWebhook = hasWebhook || envWebhook

      // Último evento de webhook recebido
      const { data: lastEvent } = await supabase
        .from('stripe_webhook_events')
        .select('event_type, event_id, received_at')
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Máscara das chaves (não expõe valores completos)
      const mask = (key: string) => {
        const v = map.get(key)?.value
        if (!v) return null
        if (v.length <= 12) return '••••'
        return `${v.slice(0, 8)}••••${v.slice(-4)}`
      }

      return new Response(
        JSON.stringify({
          configured: configuredSecret,
          publishable_key: {
            configured: configuredPublishable,
            masked: mask('STRIPE_PUBLISHABLE_KEY'),
            updated_at: map.get('STRIPE_PUBLISHABLE_KEY')?.updated_at || null,
            source: hasPublishable ? 'database' : envPublishable ? 'env' : null,
          },
          secret_key: {
            configured: configuredSecret,
            masked: mask('STRIPE_SECRET_KEY'),
            updated_at: map.get('STRIPE_SECRET_KEY')?.updated_at || null,
            source: hasSecret ? 'database' : envSecret ? 'env' : null,
          },
          webhook_secret: {
            configured: configuredWebhook,
            masked: mask('STRIPE_WEBHOOK_SECRET'),
            updated_at: map.get('STRIPE_WEBHOOK_SECRET')?.updated_at || null,
            source: hasWebhook ? 'database' : envWebhook ? 'env' : null,
          },
          webhook_active: !!lastEvent,
          last_webhook_event: lastEvent || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- POST: salva as chaves e valida a conexão ---
    if (req.method === 'POST') {
      const body: SaveBody = await req.json()
      const { publishable_key, secret_key, webhook_secret } = body

      if (!secret_key) {
        return new Response(
          JSON.stringify({ error: 'A chave secreta (secret_key) é obrigatória.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // 1. Valida a conexão com o Stripe ANTES de salvar
      const validation = await validateStripe(secret_key)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            error: `Falha ao validar a chave do Stripe: ${validation.error}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // 2. Upsert das chaves na tabela platform_secrets
      const upserts: { key: string; value: string }[] = []
      if (publishable_key) upserts.push({ key: 'STRIPE_PUBLISHABLE_KEY', value: publishable_key })
      upserts.push({ key: 'STRIPE_SECRET_KEY', value: secret_key })
      if (webhook_secret) upserts.push({ key: 'STRIPE_WEBHOOK_SECRET', value: webhook_secret })

      const { error: upsertError } = await supabase
        .from('platform_secrets')
        .upsert(upserts, { onConflict: 'key' })

      if (upsertError) {
        return new Response(JSON.stringify({ error: `Erro ao salvar: ${upsertError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Configuração do Stripe salva e validada com sucesso.',
          account: {
            id: validation.account_id,
            country: validation.country,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ error: 'Método não suportado.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[stripe-config] error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
