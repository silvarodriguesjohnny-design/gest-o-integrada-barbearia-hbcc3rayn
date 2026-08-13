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
      '[send-appointment-notification] Processing appointment:',
      appointment_id,
      '| type:',
      type,
    )

    // --- Step 1: Load appointment data ---
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(
        '*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name, slug)',
      )
      .eq('id', appointment_id)
      .single()

    if (apptError || !appt) {
      console.error(
        '[send-appointment-notification] Appointment not found:',
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
      '[send-appointment-notification] Appointment loaded:',
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

    // --- Step 2: Build message (timezone-aware, DD/MM/YYYY, HH:MM, no seconds) ---
    const dateStr = formatBrasiliaDateTime(appt.start_time)
    const tenantName = appt.tenant?.name || 'Barbearia'
    const customerName = appt.customer?.name || 'cliente'
    const serviceName = appt.service?.name || 'serviço'

    // Confirmation includes a confirmation link (confirmation_token) + loyalty
    // summary. The link points to the app's public /confirmar/:token route.
    const APP_BASE_URL = 'https://gestao-integrada-barbearia-a3c26.goskip.app'
    let confirmationBody = ''
    if (type === 'confirmation') {
      const confirmUrl = appt.confirmation_token
        ? `${APP_BASE_URL}/confirmar/${appt.confirmation_token}`
        : `${APP_BASE_URL}`

      // Loyalty summary (may not exist yet -> 0 stamps). Only stamp when
      // appointment reaches 'completed', so confirmation never awards a stamp.
      let stamps = 0
      try {
        const { data: loyalty } = await supabase
          .from('loyalty_cards')
          .select('stamps_count')
          .eq('customer_id', appt.customer_id)
          .maybeSingle()
        stamps = loyalty?.stamps_count ?? 0
      } catch (e) {
        console.warn('[send-appointment-notification] Could not load loyalty card:', String(e))
      }
      const remaining = Math.max(0, 12 - stamps)

      confirmationBody =
        `✂️ *Agendamento Confirmado — ${tenantName}*\n\n` +
        `Olá *${customerName}*! Seu horário está reservado:\n\n` +
        `📅 *Data/Hora:* ${dateStr}\n` +
        `💈 *Serviço:* ${serviceName}\n\n` +
        `Toque no link abaixo para *confirmar sua presença*:\n` +
        `👉 ${confirmUrl}\n\n` +
        `---\n\n` +
        `🎁 *Fidelidade:* A cada visita concluída você ganha um carimbo! Com 12 carimbos, o próximo corte é por nossa conta. Você tem *${stamps}* carimbo(s) — faltam *${remaining}* para a recompensa!\n\n` +
        `Se precisar reagendar, é só avisar. Até lá! 💈`
    }

    const messages: Record<string, string> = {
      confirmation: confirmationBody,
      reminder: `⏰ *Lembrete*\n\nOlá ${appt.customer?.name}!\nVocê tem um agendamento para ${appt.service?.name} em ${dateStr}.\n\n${appt.tenant?.name}`,
      cancellation: `❌ *Cancelamento*\n\nOlá ${appt.customer?.name}!\nSeu agendamento de ${appt.service?.name} em ${dateStr} foi cancelado.\nPara remarcar, acesse nosso site.\n\n${appt.tenant?.name}`,
      absence: `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${dateStr}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`,
    }
    const body = messages[type] || messages.confirmation

    // --- Step 3: Check for existing sent/pending notification (dedup check) ---
    const { data: existingLogs, error: existingLogsError } = await supabase
      .from('notification_logs')
      .select('id, status')
      .eq('appointment_id', appointment_id)
      .eq('channel', 'whatsapp')
      .eq('notification_type', type)
      .in('status', ['sent', 'pending'])
      .limit(1)

    if (existingLogsError) {
      console.error(
        '[send-appointment-notification] Error checking existing logs:',
        existingLogsError.message,
      )
    }

    if (existingLogs && existingLogs.length > 0) {
      console.log(
        '[send-appointment-notification] DUPLICATE BLOCKED: Already sent/pending for appointment:',
        appointment_id,
        '| type:',
        type,
        '| existing status:',
        existingLogs[0].status,
      )
      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          message: 'Notificação já enviada ou em processamento.',
          type,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // --- Step 4: Atomically claim the notification slot (race-safe dedup) ---
    // Insert a 'pending' log. The unique partial index on
    // (appointment_id, notification_type, channel) WHERE status IN ('sent', 'pending')
    // ensures only one process can claim this slot, even under concurrency.
    const { data: claim, error: claimError } = await supabase
      .from('notification_logs')
      .insert({
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        channel: 'whatsapp',
        body: body,
        status: 'pending',
        notification_type: type,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (claimError) {
      // 23505 = unique_violation — another process already claimed this slot
      if (claimError.code === '23505') {
        console.log(
          '[send-appointment-notification] DUPLICATE BLOCKED: Race condition — another process claimed it first for appointment:',
          appointment_id,
          '| type:',
          type,
        )
        return new Response(
          JSON.stringify({
            success: true,
            duplicate: true,
            message: 'Notificação já está sendo processada por outro processo.',
            type,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }
      console.error(
        '[send-appointment-notification] Error claiming notification slot:',
        claimError.message,
        '| code:',
        claimError.code,
      )
    }

    const logId = claim?.id
    console.log(
      '[send-appointment-notification] Claimed notification slot:',
      logId,
      '| appointment:',
      appointment_id,
      '| type:',
      type,
    )

    // --- Step 5: Read and validate WhatsApp config ---
    console.log(
      '[send-appointment-notification] Reading WhatsApp config for tenant:',
      appt.tenant_id,
    )
    const waConfig = await getWhatsAppConfig(supabase, appt.tenant_id)
    console.log(
      '[send-appointment-notification] Config loaded:',
      !!waConfig,
      '| base_url:',
      waConfig?.base_url ? '(set)' : '(MISSING)',
      '| instance_name:',
      waConfig?.instance_name || '(MISSING)',
      '| api_key:',
      waConfig?.api_key ? '(set)' : '(MISSING)',
    )

    const valErr = validateWhatsAppConfig(waConfig)
    console.log(
      '[send-appointment-notification] Config validation:',
      valErr ? `FAILED — ${valErr}` : 'PASSED',
    )

    let waResult: { success: boolean; error?: string; details?: any; wa_me?: string } = {
      success: false,
      error: 'Not processed',
    }
    let logStatus = 'failed'
    let logBody = body

    if (valErr) {
      console.error('[send-appointment-notification] Config validation failed:', valErr)
      const missing = getMissingConfigFields(waConfig)
      console.error('[send-appointment-notification] Missing/invalid fields:', missing.join(', '))
      waResult = { success: false, error: valErr }
      logBody = `[FALHA CONFIG] ${valErr}\n\n${body}`
      if (appt.customer?.phone) {
        waResult.wa_me = buildWaMeLink(appt.customer.phone, body)
        console.log('[send-appointment-notification] wa.me fallback link generated')
      }
    } else if (!appt.customer?.phone) {
      const noPhoneErr = 'Cliente não possui número de telefone cadastrado.'
      console.error('[send-appointment-notification] SKIPPED:', noPhoneErr)
      waResult = { success: false, error: noPhoneErr }
      logBody = `[FALHA] ${noPhoneErr}\n\n${body}`
    } else {
      console.log(
        '[send-appointment-notification] Calling Evolution API — target:',
        appt.customer.phone,
        '| message length:',
        body.length,
      )
      const result = await sendWhatsAppMessage(waConfig!, appt.customer.phone, body)
      waResult = { ...result, wa_me: buildWaMeLink(appt.customer.phone, body) }
      console.log(
        '[send-appointment-notification] Send result:',
        result.success ? 'SUCCESS' : 'FAILED',
        result.error ? `| error: ${result.error}` : '',
        result.details ? `| details: ${JSON.stringify(result.details)}` : '',
      )

      if (result.success) {
        logStatus = 'sent'
        console.log(
          '[send-appointment-notification] Message sent successfully to:',
          appt.customer.phone,
        )
      } else {
        const friendlyError = result.error || 'Falha desconhecida ao enviar mensagem.'
        logBody = `[FALHA ENVIO] ${friendlyError}\n\n${body}`
        console.error('[send-appointment-notification] Send failed:', friendlyError)
      }
    }

    // --- Step 6: Update the log with final status ---
    if (logId) {
      const { error: updateError } = await supabase
        .from('notification_logs')
        .update({ status: logStatus, body: logBody })
        .eq('id', logId)
      if (updateError) {
        console.error(
          '[send-appointment-notification] Error updating log status:',
          updateError.message,
          '| code:',
          updateError.code,
        )
      } else {
        console.log(
          '[send-appointment-notification] Log updated — id:',
          logId,
          '| status:',
          logStatus,
        )
      }
    } else {
      // Fallback: insert a new log if the claim failed (e.g., unique index not yet created)
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
          '[send-appointment-notification] Fallback log insert failed:',
          logError.message,
          '| code:',
          logError.code,
        )
      }
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
    console.error(
      '[send-appointment-notification] CRITICAL:',
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
