import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getWhatsAppConfig,
  sendWhatsAppMessage,
  buildWaMeLink,
  normalizePhone,
  validateWhatsAppConfig,
} from '../_shared/evolution-api.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { tenant_id, customer_id, message_type } = await req.json()

    if (!tenant_id || !customer_id || !message_type) {
      return new Response(
        JSON.stringify({ error: 'tenant_id, customer_id e message_type são obrigatórios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (custError || !customer) {
      console.error('[send-manual-message] Customer not found:', {
        customer_id,
        error: custError?.message,
      })
      return new Response(JSON.stringify({ error: 'Cliente não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!customer.phone) {
      return new Response(
        JSON.stringify({ error: 'Cliente não possui número de telefone cadastrado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    console.log('[send-manual-message] Loading WhatsApp config for tenant:', tenant_id)
    const waConfig = await getWhatsAppConfig(supabase, tenant_id)

    const validationError = validateWhatsAppConfig(waConfig)
    if (validationError) {
      console.error('[send-manual-message] Config validation failed:', validationError)
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const messages: Record<string, string> = {
      ausencia: `⚠️ *Aviso de Ausência*\n\nOlá ${customer.name}!\nNotamos que você não compareceu ao seu último agendamento.\nEntre em contato para remarcar!`,
      campanha: `🎉 *Campanha Promocional*\n\nOlá ${customer.name}!\nTemos uma oferta especial para você! Aproveite condições únicas em nossos serviços.\nAgende já o seu horário!`,
      confirmacao: `✅ *Confirmação de Agendamento*\n\nOlá ${customer.name}!\nSeu agendamento foi confirmado.\nEstamos te esperando!`,
      teste: `🧪 *Mensagem de Teste*\n\nOlá ${customer.name}!\nEste é um teste do sistema de mensagens.\nSe você recebeu esta mensagem, a configuração está funcionando!`,
    }

    const body = messages[message_type] || messages.teste
    const phone = normalizePhone(customer.phone)
    console.log('[send-manual-message] Sending type:', message_type, 'to:', phone)

    const result = await sendWhatsAppMessage(waConfig!, phone, body)
    const waMeLink = buildWaMeLink(phone, body)

    await supabase.from('notification_logs').insert({
      tenant_id,
      appointment_id: null,
      channel: 'whatsapp',
      body,
      sent_at: new Date().toISOString(),
    })

    console.log('[send-manual-message] Result:', result.success, result.error || '')

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? 'Mensagem enviada com sucesso!'
          : 'Falha ao enviar mensagem via Evolution API.',
        error: result.error,
        details: result.details,
        waMeLink,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error('[send-manual-message] Internal error:', String(err))
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
