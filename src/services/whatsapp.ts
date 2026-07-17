import { supabase } from '@/lib/supabase/client'

export async function testWhatsAppAssistant(
  message: string,
  phone: string,
  tenantId?: string,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('ai-whatsapp', {
    body: { message, from: phone, tenant_id: tenantId },
  })
  return { data, error }
}

export function getWhatsAppWebhookUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  return `${supabaseUrl}/functions/v1/ai-whatsapp`
}
