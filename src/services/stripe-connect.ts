import { supabase } from '@/lib/supabase/client'
import type { StripeConnectAccount } from '@/types'

/**
 * Status retornado pela edge function stripe-connect (GET).
 */
export interface StripeConnectStatus {
  has_account: boolean
  account: {
    id: string
    stripe_account_id: string | null
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
  } | null
}

/**
 * Busca o status da conta Stripe Connect do tenant autenticado.
 */
export async function getStripeConnectStatus(): Promise<{
  data: StripeConnectStatus | null
  error: any
}> {
  const { data, error } = await supabase.functions.invoke('stripe-connect', {
    method: 'GET',
  })
  return { data: data as StripeConnectStatus | null, error }
}

/**
 * Cria onboarding (ou gera login link se já onboarding completo).
 * Retorna a URL para onde o usuário deve ser redirecionado.
 */
export async function startStripeConnectOnboarding(): Promise<{
  data: { account_link_url: string; stripe_account_id?: string; action?: string } | null
  error: any
}> {
  const { data, error } = await supabase.functions.invoke('stripe-connect', {
    method: 'POST',
  })
  return { data, error }
}

/**
 * Busca a conta Connect diretamente da tabela (leitura controlada por RLS,
 * apenas o dono do tenant vê a sua). Útil para cache local.
 */
export async function getStripeConnectAccount(): Promise<{
  data: StripeConnectAccount | null
  error: any
}> {
  const { data, error } = await supabase.from('stripe_connect_accounts').select('*').maybeSingle()
  return { data: data as StripeConnectAccount | null, error }
}
