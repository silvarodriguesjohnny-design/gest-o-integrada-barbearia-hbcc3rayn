import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Carrega as chaves do Stripe.
 *
 * Ordem de precedência:
 *  1. Variável de ambiente do Deno (Deno.env.get) — configuração "global"
 *  2. Tabela `public.platform_secrets` — configuração salva pelo painel admin
 *
 * Isso permite que o Super Admin configure o Stripe pela UI sem precisar mexer
 * nas secrets do projeto, mantendo compatibilidade com secrets já definidas.
 */
export async function getStripeSecrets(): Promise<{
  publishableKey: string
  secretKey: string
  webhookSecret: string
}> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // Defaults das secrets de ambiente
  let publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? ''
  let secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  let webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  // Sobrescreve com valores salvos no banco, se existirem
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data } = await supabase
      .from('platform_secrets')
      .select('key, value')
      .in('key', ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])

    if (data) {
      for (const row of data) {
        if (!row.value) continue
        if (row.key === 'STRIPE_PUBLISHABLE_KEY') publishableKey = row.value
        if (row.key === 'STRIPE_SECRET_KEY') secretKey = row.value
        if (row.key === 'STRIPE_WEBHOOK_SECRET') webhookSecret = row.value
      }
    }
  } catch (err) {
    console.error('[stripe-shared] Erro ao ler platform_secrets:', String(err))
  }

  return { publishableKey, secretKey, webhookSecret }
}

/**
 * Verifica se o Stripe está minimamente configurado (secret key presente).
 */
export async function isStripeConfigured(): Promise<boolean> {
  const { secretKey } = await getStripeSecrets()
  return !!secretKey
}
