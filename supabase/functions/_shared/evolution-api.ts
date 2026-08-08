export interface EvolutionConfig {
  api_key: string
  phone_number: string
  webhook_url?: string
  base_url?: string
  instance_name?: string
}

export interface SendMessageResult {
  success: boolean
  error?: string
  details?: {
    status?: number
    statusText?: string
    responseBody?: string
    requestUrl?: string
  }
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export function buildWaMeLink(phone: string, text: string): string {
  const number = normalizePhone(phone)
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function validateWhatsAppConfig(config: EvolutionConfig | null): string | null {
  if (!config) {
    return 'Configuração do WhatsApp não encontrada no banco de dados. Acesse Configurações → Canais de Comunicação e salve as credenciais.'
  }
  if (!config.base_url) {
    return 'URL da Instância do WhatsApp não configurada. Acesse Configurações → Canais de Comunicação → WhatsApp e preencha o campo "URL da Instância".'
  }
  if (!config.instance_name) {
    return 'Nome da Instância do WhatsApp não configurado. Acesse Configurações → Canais de Comunicação → WhatsApp e preencha o campo "Nome da Instância".'
  }
  if (!config.api_key) {
    return 'API Key do WhatsApp não configurada. Acesse Configurações → Canais de Comunicação → WhatsApp e preencha o campo "API Key".'
  }
  return null
}

export async function sendWhatsAppMessage(
  config: EvolutionConfig,
  toPhone: string,
  text: string,
): Promise<SendMessageResult> {
  const validationError = validateWhatsAppConfig(config)
  if (validationError) {
    console.error('[evolution-api] Config validation failed:', validationError)
    return { success: false, error: validationError }
  }

  const baseUrl = (config.base_url || '').replace(/\/$/, '')
  const instance = config.instance_name || ''
  const apiKey = config.api_key || ''
  const number = normalizePhone(toPhone)

  if (!number) {
    return { success: false, error: 'Telefone do destinatário inválido ou vazio.' }
  }

  const url = `${baseUrl}/message/sendText/${instance}`
  console.log('[evolution-api] Sending to:', number, 'url:', url)

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
      const errorDetail = `Evolution API retornou erro ${resp.status} ${resp.statusText}. URL: ${url}. Resposta: ${body.slice(0, 500)}`
      console.error('[evolution-api] Send failed:', errorDetail)
      return {
        success: false,
        error: errorDetail,
        details: {
          status: resp.status,
          statusText: resp.statusText,
          responseBody: body.slice(0, 500),
          requestUrl: url,
        },
      }
    }

    console.log('[evolution-api] Message sent successfully')
    return { success: true }
  } catch (err) {
    const errorMsg = `Erro de rede ao conectar com a Evolution API (${url}): ${String(err)}`
    console.error('[evolution-api] Network error:', errorMsg)
    return { success: false, error: errorMsg, details: { requestUrl: url } }
  }
}

export async function getWhatsAppConfig(
  supabase: any,
  tenantId: string,
): Promise<EvolutionConfig | null> {
  let { data, error } = await supabase
    .from('messaging_configs')
    .select('config_json, is_active')
    .eq('tenant_id', tenantId)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[evolution-api] Error fetching active config:', error.message)
  }

  if (!data) {
    console.warn(
      '[evolution-api] No active WhatsApp config for tenant:',
      tenantId,
      '- trying inactive',
    )
    const fallback = await supabase
      .from('messaging_configs')
      .select('config_json, is_active')
      .eq('tenant_id', tenantId)
      .eq('channel', 'whatsapp')
      .maybeSingle()
    if (fallback.error) {
      console.error('[evolution-api] Error fetching fallback config:', fallback.error.message)
    }
    data = fallback.data
  }

  if (!data) {
    console.warn('[evolution-api] No WhatsApp config found for tenant:', tenantId)
    return null
  }

  const raw = (data.config_json as Record<string, string>) || {}
  const config: EvolutionConfig = {
    api_key: raw.api_key || '',
    phone_number: raw.phone_number || '',
    webhook_url: raw.webhook_url || undefined,
    base_url: raw.base_url || raw.evolution_base_url || '',
    instance_name: raw.instance_name || raw.evolution_instance || '',
  }
  console.log(
    '[evolution-api] Config loaded - base_url:',
    !!config.base_url,
    'instance:',
    !!config.instance_name,
    'api_key:',
    !!config.api_key,
    'phone:',
    !!config.phone_number,
    'is_active:',
    data.is_active,
  )
  return config
}
