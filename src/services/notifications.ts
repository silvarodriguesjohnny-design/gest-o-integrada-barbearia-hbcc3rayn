import { supabase } from '@/lib/supabase/client'

export async function triggerNotifications(): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('send-notifications')
  return { data, error }
}
