import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  validateWhatsAppConfig,
  buildWaMeLink,
} from '../_shared/evolution-api.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      '[send-appointment-notification] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
    return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { appointment_id, type = 'confirmation' } = await req.json()
    console.log(
      '[send-appointment-notification] Processing appointment:',
      appointment_id,
      'type:',
      type,
    )

    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(
        '*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name, slug)',
      )
      .eq('id', appointment_id)
      .single()

    if (apptError || !appt) {
      console.error('[send-appointment-notification] Appointment not found:', apptError?.message)
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log(
      '[send-appointment-notification] Appointment loaded:',
      '| id:',
      appt.id,
      '| tenant_id:',
      appt.tenant_id,
      '| customer:',
      appt.customer?.name,
      '| phone:',
      appt.customer?.phone,
    )

    if (type === 'confirmation') {
      const { data: existingLogs } = await supabase
        .from('notification_logs')
        .select('id, status')
        .eq('appointment_id', appointment_id)
        .eq('channel', 'whatsapp')
        .eq('notification_type', 'confirmation')
        .eq('status', 'sent')
        .limit(1)

      if (existingLogs && existingLogs.length > 0) {
        console.log(
          '[send-appointment-notification] Confirmation already sent successfully for appointment:',
          appointment_id,
        )
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Confirmação já foi enviada anteriormente para este agendamento.',
            duplicate: true,
            type,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }
    }

    const dateStr = new Date(appt.start_time).toLocaleString('pt-BR')
    const messages: Record<string, string> = {
      confirmation: `✅ *Confirmação*\n\nOlá ${appt.customer?.name}!\nSeu agendamento foi confirmado:\n• Serviço: ${appt.service?.name}\n• Barbeiro: ${appt.barber_name || 'A definir'}\n• Data/Hora: ${dateStr}\n\n${appt.tenant?.name}`,
      reminder: `⏰ *Lembrete*\n\nOlá ${appt.customer?.name}!\nVocê tem um agendamento para ${appt.service?.name} em ${dateStr}.\n\n${appt.tenant?.name}`,
      cancellation: `❌ *Cancelamento*\n\nOlá ${appt.customer?.name}!\nSeu agendamento de ${appt.service?.name} em ${dateStr} foi cancelado.\nPara remarcar, acesse nosso site.\n\n${appt.tenant?.name}`,
      absence: `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${dateStr}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`,
    }
    const body = messages[type] || messages.confirmation

    console.log(
      '[send-appointment-notification] Loading WhatsApp config for tenant:',
      appt.tenant_id,
    )
    const waConfig = await getWhatsAppConfig(supabase, appt.tenant_id)
    console.log(
      '[send-appointment-notification] WhatsApp config loaded:',
      '| base_url:',
      waConfig?.base_url || '(missing)',
      '| instance:',
      waConfig?.instance_name || '(missing)',
      '| api_key present:',
      !!waConfig?.api_key,
    )

    const valErr = validateWhatsAppConfig(waConfig)
    let waResult: { success: boolean; error?: string; details?: any; wa_me?: string } = {
      success: false,
      error: 'Not processed',
    }
    let logStatus = 'failed'
    let logBody = body

    if (valErr) {
      console.error('[send-appointment-notification] Config validation failed:', valErr)
      waResult = { success: false, error: valErr }
      logBody = `[FALHA CONFIG] ${valErr}\n\n${body}`
      if (appt.customer?.phone) {
        waResult.wa_me = buildWaMeLink(appt.customer.phone, body)
      }
    } else if (!appt.customer?.phone) {
      const noPhoneErr = 'Cliente não possui número de telefone cadastrado.'
      console.error('[send-appointment-notification]', noPhoneErr)
      waResult = { success: false, error: noPhoneErr }
      logBody = `[FALHA] ${noPhoneErr}\n\n${body}`
    } else {
      console.log(
        '[send-appointment-notification] Sending WhatsApp message to:',
        appt.customer.phone,
      )
      const result = await sendWhatsAppMessage(waConfig!, appt.customer.phone, body)
      waResult = { ...result, wa_me: buildWaMeLink(appt.customer.phone, body) }

      if (result.success) {
        logStatus = 'sent'
        console.log('[send-appointment-notification] Message sent successfully')
      } else {
        const friendlyError = result.error || 'Falha desconhecida ao enviar mensagem.'
        logBody = `[FALHA ENVIO] ${friendlyError}\n\n${body}`
        console.error('[send-appointment-notification] Send failed:', friendlyError)
        if (result.details) {
          console.error('[send-appointment-notification] Details:', JSON.stringify(result.details))
        }
      }
    }

    console.log(
      '[send-appointment-notification] Logging to notification_logs:',
      '| appointment_id:',
      appt.id,
      '| status:',
      logStatus,
      '| tenant_id:',
      appt.tenant_id,
    )
    const { error: logError } = await supabase.from('notification_logs').insert({
      tenant_id: appt.tenant_id,
      appointment_id: appt.id,
      channel: 'whatsapp',
      body: logBody,
      status: logStatus,
      notification_type: type,
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.error('[send-appointment-notification] Failed to log notification:', logError.message)
    }

    return new Response(
      JSON.stringify({
        success: waResult.success,
        type,
        body,
        whatsapp: waResult,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error('[send-appointment-notification] Internal error:', String(err))
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
