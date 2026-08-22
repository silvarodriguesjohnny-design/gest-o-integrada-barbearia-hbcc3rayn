import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  normalizePhone,
  validateWhatsAppConfig,
  getMissingConfigFields,
  buildWaMeLink,
} from '../_shared/evolution-api.ts'
import { formatBrasiliaDateTime } from '../_shared/datetime.ts'

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

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {}

  if (body.action === 'new_tenant') {
    const { data: superAdmin } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('is_super_admin', true)
      .single()
    const recipientEmail = superAdmin?.email || 'rodriguesjohnny@hotmail.com'
    const notification = {
      type: 'new_tenant_alert',
      recipient: recipientEmail,
      tenant_name: (body.tenant_name as string) || 'Unknown',
      plan_type: (body.plan_type as string) || 'Unknown',
      message: `Novo tenant provisionado: ${(body.tenant_name as string) || 'Unknown'} (Plano: ${(body.plan_type as string) || 'Unknown'}).`,
      timestamp: new Date().toISOString(),
    }
    return new Response(JSON.stringify({ success: true, notification }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const now = new Date()
  const todayMonthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  try {
    const notifications: Record<string, unknown>[] = []
    const tenantWaConfigs: Record<string, any> = {}

    const getWaConfig = async (tenantId: string) => {
      if (!tenantWaConfigs[tenantId]) {
        console.log(
          '[send-notifications] STEP CONFIG: Reading WhatsApp config for tenant:',
          tenantId,
        )
        tenantWaConfigs[tenantId] = await getWhatsAppConfig(supabase, tenantId)
        const cfg = tenantWaConfigs[tenantId]
        console.log(
          '[send-notifications] STEP CONFIG RESULT: tenant:',
          tenantId,
          '| config loaded:',
          !!cfg,
          '| base_url:',
          cfg?.base_url ? '(set)' : '(MISSING)',
          '| instance_name:',
          cfg?.instance_name || '(MISSING)',
          '| api_key:',
          cfg?.api_key ? '(set)' : '(MISSING)',
        )
      }
      return tenantWaConfigs[tenantId]
    }

    const trySendWa = async (tenantId: string, phone: string, msg: string) => {
      if (!phone) {
        console.error(
          '[send-notifications] STEP SEND SKIPPED: Phone is empty for tenant:',
          tenantId,
        )
        return { waSent: false, error: 'Telefone do destinatário vazio' }
      }
      console.log(
        '[send-notifications] STEP VALIDATE: Validating WhatsApp config for tenant:',
        tenantId,
      )
      const waConfig = await getWaConfig(tenantId)
      const valErr = validateWhatsAppConfig(waConfig)
      if (valErr) {
        const missing = getMissingConfigFields(waConfig)
        console.error(
          '[send-notifications] STEP VALIDATE FAILED: Config validation failed for tenant',
          tenantId,
          '| error:',
          valErr,
          '| missing fields:',
          missing.join(', '),
        )
        return { waSent: false, error: valErr }
      }
      console.log('[send-notifications] STEP VALIDATE PASSED for tenant:', tenantId)
      console.log(
        '[send-notifications] STEP SEND: Calling Evolution API — target:',
        normalizePhone(phone),
        '| tenant:',
        tenantId,
        '| message length:',
        msg.length,
      )
      const result = await sendWhatsAppMessage(waConfig!, phone, msg)
      console.log(
        '[send-notifications] STEP SEND RESULT: tenant:',
        tenantId,
        '| target:',
        normalizePhone(phone),
        '| success:',
        result.success,
        result.error ? `| error: ${result.error}` : '',
      )
      if (!result.success) {
        console.error(
          '[send-notifications] STEP SEND FAILED for tenant',
          tenantId,
          ':',
          result.error,
          result.details ? `| details: ${JSON.stringify(result.details)}` : '',
        )
      }
      return { waSent: result.success, error: result.error }
    }

    const wasAlreadySent = async (appointmentId: string, channel: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('channel', channel)
        .in('status', ['sent', 'pending'])
        .limit(1)
      if (error) {
        console.error(
          '[send-notifications] wasAlreadySent ERROR:',
          error.message,
          '| appointment:',
          appointmentId,
          '| channel:',
          channel,
        )
      }
      return !!(data && data.length > 0)
    }

    const sendApptNotif = async (appt: any, msg: string, channel: string, notifType: string) => {
      console.log(
        '[send-notifications] STEP NOTIF: Sending',
        notifType,
        'for appointment:',
        appt.id,
        '| customer:',
        appt.customer?.name,
        '| phone:',
        appt.customer?.phone,
      )

      // Atomically claim the notification slot (race-safe dedup via unique partial index)
      const { data: claim, error: claimError } = await supabase
        .from('notification_logs')
        .insert({
          tenant_id: appt.tenant_id,
          appointment_id: appt.id,
          channel,
          body: msg,
          status: 'pending',
          notification_type: notifType,
          sent_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (claimError) {
        if (claimError.code === '23505') {
          console.log(
            '[send-notifications] DUPLICATE BLOCKED: Race condition — another process already claimed slot for appointment:',
            appt.id,
            '| channel:',
            channel,
            '| type:',
            notifType,
          )
          notifications.push({
            type: notifType,
            customer: appt.customer?.name,
            phone: appt.customer?.phone,
            tenant_id: appt.tenant_id,
            whatsapp_sent: false,
            duplicate: true,
            message: 'Skipped — duplicate notification blocked',
          })
          return
        }
        console.error(
          '[send-notifications] Error claiming notification slot:',
          claimError.message,
          '| appointment:',
          appt.id,
          '| channel:',
          channel,
        )
      }

      const logId = claim?.id
      const { waSent, error } = await trySendWa(appt.tenant_id, appt.customer?.phone, msg)
      const logStatus = waSent ? 'sent' : 'failed'
      console.log(
        '[send-notifications] STEP LOG: Updating notification_logs — appointment_id:',
        appt.id,
        '| channel:',
        channel,
        '| status:',
        logStatus,
        '| tenant_id:',
        appt.tenant_id,
      )

      if (logId) {
        const { error: updateError } = await supabase
          .from('notification_logs')
          .update({ status: logStatus })
          .eq('id', logId)
        if (updateError) {
          console.error(
            '[send-notifications] STEP LOG FAILED: Error updating notification:',
            updateError.message,
            '| appointment:',
            appt.id,
            '| channel:',
            channel,
          )
        } else {
          console.log(
            '[send-notifications] STEP LOG SUCCESS: notification_logs updated — appointment:',
            appt.id,
            '| status:',
            logStatus,
          )
        }
      } else {
        const { error: logError } = await supabase.from('notification_logs').insert({
          tenant_id: appt.tenant_id,
          appointment_id: appt.id,
          channel,
          body: msg,
          status: logStatus,
          notification_type: notifType,
          sent_at: new Date().toISOString(),
        })
        if (logError) {
          console.error(
            '[send-notifications] STEP LOG FAILED: Error logging notification:',
            logError.message,
            '| appointment:',
            appt.id,
            '| channel:',
            channel,
          )
        } else {
          console.log(
            '[send-notifications] STEP LOG SUCCESS: notification_logs insert OK — appointment:',
            appt.id,
            '| status:',
            logStatus,
          )
        }
      }

      notifications.push({
        type: notifType,
        customer: appt.customer?.name,
        phone: appt.customer?.phone,
        tenant_id: appt.tenant_id,
        whatsapp_sent: waSent,
        error,
        wa_me: appt.customer?.phone ? buildWaMeLink(appt.customer.phone, msg) : null,
        message: msg,
      })
    }

    // 1. One-day-before reminders
    console.log('[send-notifications] === STEP 1: One-day-before reminders ===')
    const window24Start = new Date(now.getTime() + 22 * 60 * 60 * 1000)
    const window24End = new Date(now.getTime() + 26 * 60 * 60 * 1000)
    const { data: upcoming24h, error: upcoming24hError } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', window24Start.toISOString())
      .lte('start_time', window24End.toISOString())

    if (upcoming24hError) {
      console.error('[send-notifications] STEP 1 QUERY ERROR:', upcoming24hError.message)
    }
    console.log(
      '[send-notifications] STEP 1: Found',
      upcoming24h?.length || 0,
      'appointments in 22-26h window',
    )

    for (const appt of upcoming24h ?? []) {
      if (await wasAlreadySent(appt.id, 'whatsapp_reminder_1day')) {
        console.log(
          '[send-notifications] STEP 1: Skipping appointment',
          appt.id,
          '— reminder already sent',
        )
        continue
      }
      const apptDate = formatBrasiliaDateTime(appt.start_time)
      const msg = `⏰ *Lembrete: Seu agendamento é amanhã!*\n\nOlá ${appt.customer?.name}! Este é um lembrete do seu agendamento para ${appt.service?.name} com ${appt.barber_name || 'nosso barbeiro'} amanhã às ${apptDate}.\n\n${appt.tenant?.name}`
      await sendApptNotif(appt, msg, 'whatsapp_reminder_1day', 'appointment_reminder_1day')
    }

    // 2. Same-day reminders
    console.log('[send-notifications] === STEP 2: Same-day reminders ===')
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const { data: todayAppts, error: todayApptsError } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', now.toISOString())
      .lte('start_time', endOfToday.toISOString())

    if (todayApptsError) {
      console.error('[send-notifications] STEP 2 QUERY ERROR:', todayApptsError.message)
    }
    console.log('[send-notifications] STEP 2: Found', todayAppts?.length || 0, 'appointments today')

    for (const appt of todayAppts ?? []) {
      if (await wasAlreadySent(appt.id, 'whatsapp_reminder_today')) {
        console.log(
          '[send-notifications] STEP 2: Skipping appointment',
          appt.id,
          '— reminder already sent',
        )
        continue
      }
      const apptDate = formatBrasiliaDateTime(appt.start_time)
      const msg = `⏰ *Lembrete: Seu agendamento é hoje!*\n\nOlá ${appt.customer?.name}! Este é um lembrete do seu agendamento para ${appt.service?.name} com ${appt.barber_name || 'nosso barbeiro'} hoje às ${apptDate}.\n\n${appt.tenant?.name}`
      await sendApptNotif(appt, msg, 'whatsapp_reminder_today', 'appointment_reminder_today')
    }

    // 3. No-show detection
    // DISABLED (v0.0.86): the no-show block was auto-cancelling past-due
    // appointments and sending WhatsApp absence messages. Commented out per
    // request. Step kept here as a no-op placeholder so the numbering stays
    // stable for the steps that follow.
    console.log('[send-notifications] === STEP 3: No-show detection (DISABLED) ===')
    // const { data: noShowAppts, error: noShowError } = await supabase
    //   .from('appointments')
    //   .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
    //   .in('status', ['scheduled', 'confirmed'])
    //   .lt('end_time', now.toISOString())
    //   .neq('reminder_sent', true)
    //
    // if (noShowError) {
    //   console.error('[send-notifications] STEP 3 QUERY ERROR:', noShowError.message)
    // }
    // console.log(
    //   '[send-notifications] STEP 3: Found',
    //   noShowAppts?.length || 0,
    //   'no-show appointments',
    // )
    //
    // for (const appt of noShowAppts ?? []) {
    //   const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
    //   const msg = `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${apptDate}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`
    //   await sendApptNotif(appt, msg, 'whatsapp_absence', 'absence_alert')
    //   console.log(
    //     '[send-notifications] STEP 3: Marking appointment',
    //     appt.id,
    //     'as cancelled + reminder_sent',
    //   )
    //   const { error: updateError } = await supabase
    //     .from('appointments')
    //     .update({ status: 'cancelled', reminder_sent: true })
    //     .eq('id', appt.id)
    //   if (updateError) {
    //     console.error(
    //       '[send-notifications] STEP 3: Error updating appointment status:',
    //       updateError.message,
    //     )
    //   }
    // }

    // 4. Birthday notifications
    console.log('[send-notifications] === STEP 4: Birthday notifications ===')
    const { data: birthdayCustomers, error: birthdayError } = await supabase
      .from('customers')
      .select('*')
      .filter('birthday', 'like', `%-${todayMonthDay}`)

    if (birthdayError) {
      console.error('[send-notifications] STEP 4 QUERY ERROR:', birthdayError.message)
    }
    console.log(
      '[send-notifications] STEP 4: Found',
      birthdayCustomers?.length || 0,
      'birthday customers',
    )

    for (const customer of birthdayCustomers ?? []) {
      const msg = `🎂 *Feliz Aniversário!*\n\nFeliz aniversário ${customer.name}! Venha comemorar com a gente!`
      console.log(
        '[send-notifications] STEP 4: Sending birthday message to:',
        customer.name,
        '| phone:',
        customer.phone,
        '| tenant:',
        customer.tenant_id,
      )
      const { waSent, error } = await trySendWa(customer.tenant_id, customer.phone, msg)
      console.log(
        '[send-notifications] STEP 4 LOG: Logging birthday notification — customer:',
        customer.name,
        '| status:',
        waSent ? 'sent' : 'failed',
      )
      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: customer.tenant_id,
        channel: 'whatsapp_birthday',
        body: msg,
        status: waSent ? 'sent' : 'failed',
        notification_type: 'birthday',
        sent_at: new Date().toISOString(),
      })
      if (logError) {
        console.error('[send-notifications] STEP 4 LOG FAILED:', logError.message)
      }
      notifications.push({
        type: 'birthday',
        customer: customer.name,
        phone: customer.phone,
        tenant_id: customer.tenant_id,
        whatsapp_sent: waSent,
        error,
        message: msg,
      })
    }

    // 5. Inactivity alerts
    console.log('[send-notifications] === STEP 5: Inactivity alerts ===')
    const { data: alerts, error: alertsError } = await supabase
      .from('inactivity_alerts')
      .select('*, tenants(id, name)')
      .eq('active', true)

    if (alertsError) {
      console.error('[send-notifications] STEP 5 QUERY ERROR:', alertsError.message)
    }
    console.log(
      '[send-notifications] STEP 5: Found',
      alerts?.length || 0,
      'active inactivity alerts',
    )

    for (const alert of alerts ?? []) {
      const cutoffDate = new Date(now)
      cutoffDate.setDate(cutoffDate.getDate() - alert.days)
      const { data: inactiveCustomers, error: inactiveError } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', alert.tenant_id)
        .or(`last_visit_at.is.null,last_visit_at.lt.${cutoffDate.toISOString()}`)
      if (inactiveError) {
        console.error(
          '[send-notifications] STEP 5 QUERY ERROR (inactive customers):',
          inactiveError.message,
        )
      }
      console.log(
        '[send-notifications] STEP 5: Found',
        inactiveCustomers?.length || 0,
        'inactive customers for alert:',
        alert.id,
        '| tenant:',
        alert.tenant_id,
      )
      for (const customer of inactiveCustomers ?? []) {
        const msg = (alert.message || '').replace(/\{nome\}/g, customer.name || '')
        console.log(
          '[send-notifications] STEP 5: Sending inactivity alert to:',
          customer.name,
          '| phone:',
          customer.phone,
          '| tenant:',
          alert.tenant_id,
        )
        const { waSent, error } = await trySendWa(alert.tenant_id, customer.phone, msg)
        console.log(
          '[send-notifications] STEP 5 LOG: Logging inactivity notification — customer:',
          customer.name,
          '| status:',
          waSent ? 'sent' : 'failed',
        )
        const { error: logError } = await supabase.from('notification_logs').insert({
          tenant_id: alert.tenant_id,
          channel: 'whatsapp_inactivity',
          body: msg,
          status: waSent ? 'sent' : 'failed',
          notification_type: 'inactivity_alert',
          sent_at: new Date().toISOString(),
        })
        if (logError) {
          console.error('[send-notifications] STEP 5 LOG FAILED:', logError.message)
        }
        notifications.push({
          type: 'inactivity_alert',
          customer: customer.name,
          phone: customer.phone,
          tenant_id: alert.tenant_id,
          channels: alert.channels,
          whatsapp_sent: waSent,
          error,
          message: msg,
        })
      }
    }

    console.log(
      '[send-notifications] === COMPLETE: Total notifications processed:',
      notifications.length,
      '===',
    )
    return new Response(
      JSON.stringify({ success: true, count: notifications.length, notifications }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error(
      '[send-notifications] CRITICAL: Fatal error:',
      String(err),
      '| stack:',
      (err as Error)?.stack,
    )
    return new Response(
      JSON.stringify({ error: 'Failed to process notifications', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
