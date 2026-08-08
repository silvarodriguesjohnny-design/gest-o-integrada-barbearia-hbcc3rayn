import { supabase } from '@/lib/supabase/client'

export type ManualMessageType = 'ausencia' | 'campanha' | 'confirmacao' | 'teste'

export async function sendManualMessage(
  tenantId: string,
  customerId: string,
  messageType: ManualMessageType,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('send-manual-message', {
    body: { tenant_id: tenantId, customer_id: customerId, message_type: messageType },
  })
  return { data, error }
}
