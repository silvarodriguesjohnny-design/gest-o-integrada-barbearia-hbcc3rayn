import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  normalizePhone,
  validateWhatsAppConfig,
  buildWaMeLink,
} from '../_shared/evolution-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

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

    // Duplicate-send protection: skip if a confirmation was already sent for this appointment
    if (type === 'confirmation') {
      const { data: existingLogs } = await supabase
        .from('notification_logs')
        .select('id, status')
        .eq('appointment_id', appointment_id)
        .eq('channel', 'whatsapp')
        .eq('notification_type', 'confirmation')
        .limit(1)

      if (existingLogs && existingLogs.length > 0) {
        console.log(
          '[send-appointment-notification] Confirmation already sent for appointment:',
          appointment_id,
          '| existing status:',
          existingLogs[0].status,
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
      '[send-appointment-notification] Message type:',
      type,
      '| Customer:',
      appt.customer?.name,
      '| Phone:',
      appt.customer?.phone,
      '| Tenant:',
      appt.tenant_id,
    )

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
      const normalizedPhone = normalizePhone(appt.customer.phone)
      console.log(
        '[send-appointment-notification] Phone normalized:',
        '| Original:',
        appt.customer.phone,
        '| Normalized:',
        normalizedPhone,
      )

      if (!normalizedPhone || normalizedPhone.length < 10) {
        const invalidErr = `O telefone do cliente ("${appt.customer.phone}") é inválido ou está incompleto após a normalização.`
        console.error('[send-appointment-notification]', invalidErr)
        waResult = {
          success: false,
          error: invalidErr,
          wa_me: buildWaMeLink(appt.customer.phone, body),
        }
        logBody = `[FALHA] ${invalidErr}\n\n${body}`
      } else {
        console.log('[send-appointment-notification] Sending WhatsApp message to:', normalizedPhone)
        const result = await sendWhatsAppMessage(waConfig!, normalizedPhone, body)
        waResult = { ...result, wa_me: buildWaMeLink(appt.customer.phone, body) }

        if (result.success) {
          logStatus = 'sent'
          console.log(
            '[send-appointment-notification] Message sent successfully to:',
            normalizedPhone,
          )
        } else {
          const friendlyError = result.error || 'Falha desconhecida ao enviar mensagem.'
          logBody = `[FALHA ENVIO] ${friendlyError}\n\n${body}`
          console.error('[send-appointment-notification] Send failed:', friendlyError)
          if (result.details) {
            console.error(
              '[send-appointment-notification] Details:',
              JSON.stringify(result.details),
            )
          }
        }
      }
    }

    console.log(
      '[send-appointment-notification] Logging to notification_logs:',
      '| appointment_id:',
      appt.id,
      '| channel: whatsapp',
      '| type:',
      type,
      '| status:',
      logStatus,
      '| tenant_id:',
      appt.tenant_id,
    )
    await supabase.from('notification_logs').insert({
      tenant_id: appt.tenant_id,
      appointment_id: appt.id,
      channel: 'whatsapp',
      body: logBody,
      status: logStatus,
      notification_type: type,
      sent_at: new Date().toISOString(),
    })

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
