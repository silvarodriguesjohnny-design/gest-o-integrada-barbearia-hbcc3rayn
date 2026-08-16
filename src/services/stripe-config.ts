import { supabase } from '@/lib/supabase/client'

export interface StripeKeyStatus {
  configured: boolean
  masked: string | null
  updated_at: string | null
  source: 'database' | 'env' | null
}

export interface StripeConfigStatus {
  configured: boolean
  publishable_key: StripeKeyStatus
  secret_key: StripeKeyStatus
  webhook_secret: StripeKeyStatus
  webhook_active: boolean
  last_webhook_event: {
    event_type: string
    event_id: string | null
    received_at: string
  } | null
}

export async function getStripeConfigStatus(): Promise<{
  data: StripeConfigStatus | null
  error: any
}> {
  const { data, error } = await supabase.functions.invoke('stripe-config', {
    method: 'GET',
  })
  return { data: data as StripeConfigStatus | null, error }
}

export async function saveStripeConfig(input: {
  publishable_key?: string
  secret_key: string
  webhook_secret?: string
}): Promise<{
  data: { success: boolean; message: string; account?: { id: string; country?: string } } | null
  error: any
}> {
  const { data, error } = await supabase.functions.invoke('stripe-config', {
    method: 'POST',
    body: input,
  })
  return { data, error }
}
