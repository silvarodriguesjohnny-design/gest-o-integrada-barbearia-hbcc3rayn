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

/**
 * Sanitizes and normalizes a phone number for Evolution API (WhatsApp JID format).
 * - Removes non-digit characters (spaces, hyphens, parentheses).
 * - Strips leading trunk zeros (e.g. 011 -> 11).
 * - Automatically prepends Brazilian country code '55' if length is 10 or 11 digits.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')

  // Remove leading zeros if present before DDD (e.g. 011995482267 -> 11995482267)
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.replace(/^0+/, '')
  }

  // Brazilian numbers with 10 (landline) or 11 (mobile) digits need country code '55'
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  return digits
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

  if (!number || number.length < 10) {
    const err = `O telefone "${toPhone}" é inválido ou está incompleto após a normalização (${number || 'vazio'}). Verifique se o número possui DDD válido.`
    console.error('[evolution-api]', err)
    return { success: false, error: err }
  }

  const url = `${baseUrl}/message/sendText/${instance}`
  console.log(
    '[evolution-api] Sending WhatsApp message - Original target:',
    toPhone,
    '| Formatted JID number:',
    number,
    '| URL:',
    url,
  )

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
      console.error('[evolution-api] Send failed with status:', resp.status, 'body:', body)

      let friendlyError = ''

      // Handle "exists: false" response from Evolution API (number not registered on WhatsApp)
      if (
        body.includes('"exists":false') ||
        body.includes('"exists": false') ||
        body.includes('exists: false') ||
        body.includes('exists:false')
      ) {
        friendlyError = `O número ${toPhone} não possui uma conta de WhatsApp válida.`
      } else {
        try {
          const jsonBody = JSON.parse(body)
          if (jsonBody.response?.message && Array.isArray(jsonBody.response.message)) {
            const joined = jsonBody.response.message.join(', ')
            if (joined.includes('exists: false') || joined.includes('exists:false')) {
              friendlyError = `O número ${toPhone} não possui uma conta de WhatsApp válida.`
            } else {
              friendlyError = `Evolution API: ${joined}`
            }
          } else if (jsonBody.message) {
            const msg = Array.isArray(jsonBody.message)
              ? jsonBody.message.join(', ')
              : String(jsonBody.message)
            if (msg.includes('exists: false') || msg.includes('exists:false')) {
              friendlyError = `O número ${toPhone} não possui uma conta de WhatsApp válida.`
            } else {
              friendlyError = `Evolution API: ${msg}`
            }
          }
        } catch (_) {
          // Fallback if body parsing fails
        }

        if (!friendlyError) {
          friendlyError = `Evolution API retornou erro ${resp.status} ${resp.statusText}. URL: ${url}. Resposta: ${body.slice(0, 300)}`
        }
      }

      return {
        success: false,
        error: friendlyError,
        details: {
          status: resp.status,
          statusText: resp.statusText,
          responseBody: body.slice(0, 500),
          requestUrl: url,
        },
      }
    }

    console.log('[evolution-api] Message successfully sent to formatted number:', number)
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
      '- trying fallback',
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
    '[evolution-api] Config loaded for tenant:',
    tenantId,
    '- base_url:',
    !!config.base_url,
    'instance:',
    !!config.instance_name,
    'api_key:',
    !!config.api_key,
  )
  return config
}
