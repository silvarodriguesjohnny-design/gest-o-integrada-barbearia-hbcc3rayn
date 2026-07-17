import { supabase } from '@/lib/supabase/client'

export async function triggerNotifications(
  body?: Record<string, unknown>,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke(
    'send-notifications',
    body ? { body } : undefined,
  )
  return { data, error }
}
