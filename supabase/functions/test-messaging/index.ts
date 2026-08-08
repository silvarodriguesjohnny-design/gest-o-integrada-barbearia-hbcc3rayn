import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getWhatsAppConfig,
  sendWhatsAppMessage,
  buildWaMeLink,
  validateWhatsAppConfig,
} from '../_shared/evolution-api.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { channel, config, tenant_id } = await req.json()

    if (channel === 'whatsapp') {
      const recipient = (config?.recipient as string) || (config?.phone_number as string) || ''
      const testMessage = `🧪 *Teste de Configuração WhatsApp*\n\nEste é uma mensagem de teste do sistema.\n\nSe você recebeu esta mensagem, a configuração está funcionando!`

      let evolutionConfig = {
        api_key: (config?.api_key as string) || '',
        base_url: (config?.base_url as string) || (config?.evolution_base_url as string) || '',
        instance_name:
          (config?.instance_name as string) || (config?.evolution_instance as string) || '',
        phone_number: (config?.phone_number as string) || '',
        webhook_url: (config?.webhook_url as string) || '',
      }

      if (
        (!evolutionConfig.api_key || !evolutionConfig.base_url || !evolutionConfig.instance_name) &&
        tenant_id
      ) {
        console.log('[test-messaging] Loading config from database for tenant:', tenant_id)
        const dbConfig = await getWhatsAppConfig(supabase, tenant_id)
        if (dbConfig) {
          evolutionConfig = {
            api_key: evolutionConfig.api_key || dbConfig.api_key,
            base_url: evolutionConfig.base_url || dbConfig.base_url,
            instance_name: evolutionConfig.instance_name || dbConfig.instance_name,
            phone_number: evolutionConfig.phone_number || dbConfig.phone_number,
            webhook_url: evolutionConfig.webhook_url || dbConfig.webhook_url || '',
          }
        }
      }

      const validationError = validateWhatsAppConfig(evolutionConfig)
      if (validationError) {
        console.error('[test-messaging] Config validation failed:', validationError)
        return new Response(
          JSON.stringify({
            success: false,
            error: validationError,
            waMeLink: recipient ? buildWaMeLink(recipient, testMessage) : undefined,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (!recipient) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Número de telefone do destinatário é obrigatório para o teste. Preencha o campo "Número (WhatsApp Business)" na configuração.',
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      console.log('[test-messaging] Sending test message to:', recipient)
      const result = await sendWhatsAppMessage(evolutionConfig, recipient, testMessage)
      const waMeLink = recipient ? buildWaMeLink(recipient, testMessage) : undefined

      console.log('[test-messaging] Result:', result.success, result.error || '')

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success
            ? 'Mensagem WhatsApp enviada com sucesso!'
            : 'Falha ao enviar mensagem WhatsApp.',
          error: result.error,
          details: result.details,
          waMeLink,
          channel,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    await supabase.from('email_logs').insert({
      tenant_id: tenant_id || null,
      recipient: config?.from_email || config?.sender_id || 'test@simulado.com',
      subject: `[TESTE] Configuração de ${channel}`,
      body: JSON.stringify(config || {}),
      status: 'simulated',
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Teste realizado com sucesso (simulado)', channel }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error('[test-messaging] Internal error:', String(err))
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
