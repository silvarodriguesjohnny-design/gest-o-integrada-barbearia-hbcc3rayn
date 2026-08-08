import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getWhatsAppConfig, sendWhatsAppMessage, buildWaMeLink } from '../_shared/evolution-api.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { channel, config, tenant_id } = await req.json()

    if (channel === 'whatsapp') {
      const recipient = (config?.recipient as string) || (config?.phone_number as string) || ''
      const testMessage = `🧪 *Teste de Configuração WhatsApp*\n\nEste é um mensagem de teste do sistema.\n\nSe você recebeu esta mensagem, a configuração está funcionando!`

      const evolutionConfig = {
        api_key: config?.api_key || '',
        base_url: config?.base_url || '',
        instance_name: config?.instance_name || '',
        phone_number: config?.phone_number || '',
        webhook_url: config?.webhook_url || '',
      }

      if (!evolutionConfig.api_key || !evolutionConfig.base_url || !evolutionConfig.instance_name) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Configuração incompleta: base_url, instance_name e api_key são obrigatórios.',
            waMeLink: recipient ? buildWaMeLink(recipient, testMessage) : undefined,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (!recipient) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Número de telefone do destinatário é obrigatório para o teste.',
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const result = await sendWhatsAppMessage(evolutionConfig, recipient, testMessage)

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success
            ? 'Mensagem WhatsApp enviada com sucesso!'
            : 'Falha ao enviar mensagem WhatsApp.',
          error: result.error,
          waMeLink: result.waMeLink,
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
      JSON.stringify({
        success: true,
        message: 'Teste realizado com sucesso (simulado)',
        channel,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
