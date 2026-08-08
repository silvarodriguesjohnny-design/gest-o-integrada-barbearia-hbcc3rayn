export interface EvolutionConfig {
  api_key: string
  phone_number: string
  webhook_url?: string
  base_url?: string
  instance_name?: string
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export async function sendWhatsAppMessage(
  config: EvolutionConfig,
  toPhone: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = config.base_url || config.webhook_url || ''
  const instance = config.instance_name || 'default'
  const apiKey = config.api_key

  if (!apiKey) {
    return { success: false, error: 'API key não configurada' }
  }

  const number = normalizePhone(toPhone)
  if (!number) {
    return { success: false, error: 'Telefone do destinatário inválido' }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number,
        text,
        options: { delay: 300, presence: 'composing' },
      }),
    })

    if (!resp.ok) {
      const body = await resp.text()
      return { success: false, error: `Evolution API ${resp.status}: ${body.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function getWhatsAppConfig(
  supabase: any,
  tenantId: string,
): Promise<EvolutionConfig | null> {
  const { data } = await supabase
    .from('messaging_configs')
    .select('config_json, is_active')
    .eq('tenant_id', tenantId)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null
  return (data.config_json as EvolutionConfig) || null
}
