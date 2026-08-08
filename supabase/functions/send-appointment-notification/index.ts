import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  validateWhatsAppConfig,
  buildWaMeLink,
  getMissingConfigFields,
} from '../_shared/evolution-api.ts'
import { formatBrasiliaDateTime } from '../_shared/datetime.ts'

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
      '[send-appointment-notification] STEP 1: Processing appointment:',
      appointment_id,
      '| type:',
      type,
    )

    console.log('[send-appointment-notification] STEP 2: Loading appointment data with relations')
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(
        '*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name, slug)',
      )
      .eq('id', appointment_id)
      .single()

    if (apptError || !appt) {
      console.error(
        '[send-appointment-notification] STEP 2 FAILED: Appointment not found:',
        apptError?.message,
        '| code:',
        apptError?.code,
      )
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log(
      '[send-appointment-notification] STEP 2 RESULT: Appointment loaded:',
      '| id:',
      appt.id,
      '| tenant_id:',
      appt.tenant_id,
      '| customer:',
      appt.customer?.name,
      '| phone:',
      appt.customer?.phone,
      '| service:',
      appt.service?.name,
      '| tenant:',
      appt.tenant?.name,
    )

    if (type === 'confirmation') {
      console.log(
        '[send-appointment-notification] STEP 2b: Checking for existing sent confirmation (duplicate protection)',
      )
      const { data: existingLogs, error: existingLogsError } = await supabase
        .from('notification_logs')
        .select('id, status')
        .eq('appointment_id', appointment_id)
        .eq('channel', 'whatsapp')
        .eq('notification_type', 'confirmation')
        .eq('status', 'sent')
        .limit(1)

      if (existingLogsError) {
        console.error(
          '[send-appointment-notification] STEP 2b WARNING: Error checking existing logs:',
          existingLogsError.message,
        )
      }

      if (existingLogs && existingLogs.length > 0) {
        console.log(
          '[send-appointment-notification] STEP 2b: Confirmation already sent successfully for appointment:',
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
      console.log(
        '[send-appointment-notification] STEP 2b RESULT: No existing confirmation found — proceeding',
      )
    }

    const dateStr = formatBrasiliaDateTime(appt.start_time)
    const messages: Record<string, string> = {
      confirmation: `✅ *Confirmação*\n\nOlá ${appt.customer?.name}!\nSeu agendamento foi confirmado:\n• Serviço: ${appt.service?.name}\n• Barbeiro: ${appt.barber_name || 'A definir'}\n• Data/Hora: ${dateStr}\n\n${appt.tenant?.name}`,
      reminder: `⏰ *Lembrete*\n\nOlá ${appt.customer?.name}!\nVocê tem um agendamento para ${appt.service?.name} em ${dateStr}.\n\n${appt.tenant?.name}`,
      cancellation: `❌ *Cancelamento*\n\nOlá ${appt.customer?.name}!\nSeu agendamento de ${appt.service?.name} em ${dateStr} foi cancelado.\nPara remarcar, acesse nosso site.\n\n${appt.tenant?.name}`,
      absence: `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${dateStr}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`,
    }
    const body = messages[type] || messages.confirmation

    console.log(
      '[send-appointment-notification] STEP 3: Reading WhatsApp config from messaging_configs for tenant:',
      appt.tenant_id,
    )
    const waConfig = await getWhatsAppConfig(supabase, appt.tenant_id)
    console.log(
      '[send-appointment-notification] STEP 3 RESULT: config loaded:',
      !!waConfig,
      '| base_url:',
      waConfig?.base_url ? `(set, length=${waConfig.base_url.length})` : '(MISSING)',
      '| instance_name:',
      waConfig?.instance_name ? `"${waConfig.instance_name}"` : '(MISSING)',
      '| api_key:',
      waConfig?.api_key ? `(set, length=${waConfig.api_key.length})` : '(MISSING)',
    )

    console.log('[send-appointment-notification] STEP 4: Validating WhatsApp config')
    const valErr = validateWhatsAppConfig(waConfig)
    console.log(
      '[send-appointment-notification] STEP 4 RESULT: validation:',
      valErr ? `FAILED — ${valErr}` : 'PASSED',
    )

    let waResult: { success: boolean; error?: string; details?: any; wa_me?: string } = {
      success: false,
      error: 'Not processed',
    }
    let logStatus = 'failed'
    let logBody = body

    if (valErr) {
      console.error(
        '[send-appointment-notification] STEP 4 FAILED: Config validation failed:',
        valErr,
      )
      const missing = getMissingConfigFields(waConfig)
      console.error(
        '[send-appointment-notification] STEP 4 FAILED: Missing/invalid fields:',
        missing.join(', '),
      )
      waResult = { success: false, error: valErr }
      logBody = `[FALHA CONFIG] ${valErr}\n\n${body}`
      if (appt.customer?.phone) {
        waResult.wa_me = buildWaMeLink(appt.customer.phone, body)
        console.log(
          '[send-appointment-notification] STEP 4: wa.me fallback link generated:',
          waResult.wa_me,
        )
      }
    } else if (!appt.customer?.phone) {
      const noPhoneErr = 'Cliente não possui número de telefone cadastrado.'
      console.error('[send-appointment-notification] STEP 5 SKIPPED:', noPhoneErr)
      waResult = { success: false, error: noPhoneErr }
      logBody = `[FALHA] ${noPhoneErr}\n\n${body}`
    } else {
      console.log(
        '[send-appointment-notification] STEP 5: Calling Evolution API sendWhatsAppMessage — target:',
        appt.customer.phone,
        '| message length:',
        body.length,
      )
      const result = await sendWhatsAppMessage(waConfig!, appt.customer.phone, body)
      waResult = { ...result, wa_me: buildWaMeLink(appt.customer.phone, body) }
      console.log(
        '[send-appointment-notification] STEP 5 RESULT: sendWhatsAppMessage returned:',
        result.success ? 'SUCCESS' : 'FAILED',
        result.error ? `| error: ${result.error}` : '',
        result.details ? `| details: ${JSON.stringify(result.details)}` : '',
      )

      if (result.success) {
        logStatus = 'sent'
        console.log(
          '[send-appointment-notification] STEP 5 SUCCESS: Message sent successfully to:',
          appt.customer.phone,
        )
      } else {
        const friendlyError = result.error || 'Falha desconhecida ao enviar mensagem.'
        logBody = `[FALHA ENVIO] ${friendlyError}\n\n${body}`
        console.error('[send-appointment-notification] STEP 5 FAILED: Send failed:', friendlyError)
        if (result.details) {
          console.error(
            '[send-appointment-notification] STEP 5 ERROR DETAILS:',
            JSON.stringify(result.details),
          )
        }
      }
    }

    console.log(
      '[send-appointment-notification] STEP 6: Logging to notification_logs:',
      '| appointment_id:',
      appt.id,
      '| status:',
      logStatus,
      '| tenant_id:',
      appt.tenant_id,
      '| channel: whatsapp',
      '| notification_type:',
      type,
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
      console.error(
        '[send-appointment-notification] STEP 6 CRITICAL: Failed to log notification:',
        logError.message,
        '| code:',
        logError.code,
        '| details:',
        JSON.stringify(logError),
      )
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha crítica ao registrar log de notificação: ${logError.message}`,
          type,
          body,
          whatsapp: waResult,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    console.log(
      '[send-appointment-notification] STEP 6 RESULT: notification_logs insert SUCCESSFUL — status:',
      logStatus,
    )

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
    console.error(
      '[send-appointment-notification] CRITICAL: Internal error:',
      String(err),
      '| stack:',
      (err as Error)?.stack,
    )
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
