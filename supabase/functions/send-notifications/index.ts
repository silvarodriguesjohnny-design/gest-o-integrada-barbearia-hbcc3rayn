import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  normalizePhone,
  validateWhatsAppConfig,
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
        tenantWaConfigs[tenantId] = await getWhatsAppConfig(supabase, tenantId)
      }
      return tenantWaConfigs[tenantId]
    }

    const trySendWa = async (tenantId: string, phone: string, msg: string) => {
      if (!phone) return { waSent: false, error: 'Telefone do destinatário vazio' }
      const waConfig = await getWaConfig(tenantId)
      const valErr = validateWhatsAppConfig(waConfig)
      if (valErr) {
        console.error(
          '[send-notifications] Config validation failed for tenant',
          tenantId,
          ':',
          valErr,
        )
        return { waSent: false, error: valErr }
      }
      console.log(
        '[send-notifications] Sending WhatsApp to:',
        normalizePhone(phone),
        'for tenant:',
        tenantId,
      )
      const result = await sendWhatsAppMessage(waConfig!, phone, msg)
      if (!result.success)
        console.error('[send-notifications] Send failed for tenant', tenantId, ':', result.error)
      return { waSent: result.success, error: result.error }
    }

    const wasAlreadySent = async (appointmentId: string, channel: string): Promise<boolean> => {
      const { data } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('channel', channel)
        .limit(1)
      return !!(data && data.length > 0)
    }

    const sendApptNotif = async (appt: any, msg: string, channel: string, notifType: string) => {
      const { waSent, error } = await trySendWa(appt.tenant_id, appt.customer?.phone, msg)
      console.log('[send-notifications] Logging to notification_logs:', {
        appointment_id: appt.id,
        channel,
        tenant_id: appt.tenant_id,
      })
      await supabase.from('notification_logs').insert({
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        channel,
        body: msg,
        status: waSent ? 'sent' : 'failed',
        notification_type: notifType,
        sent_at: new Date().toISOString(),
      })
      notifications.push({
        type: notifType,
        customer: appt.customer?.name,
        phone: appt.customer?.phone,
        tenant_id: appt.tenant_id,
        whatsapp_sent: waSent,
        error,
        wa_me: appt.customer?.phone
          ? `https://wa.me/${normalizePhone(appt.customer.phone)}?text=${encodeURIComponent(msg)}`
          : null,
        message: msg,
      })
    }

    // 1. One-day-before reminders (appointments starting 22-26h from now)
    const window24Start = new Date(now.getTime() + 22 * 60 * 60 * 1000)
    const window24End = new Date(now.getTime() + 26 * 60 * 60 * 1000)
    const { data: upcoming24h } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', window24Start.toISOString())
      .lte('start_time', window24End.toISOString())

    for (const appt of upcoming24h ?? []) {
      if (await wasAlreadySent(appt.id, 'whatsapp_reminder_1day')) continue
      const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
      const msg = `⏰ *Lembrete: Seu agendamento é amanhã!*\n\nOlá ${appt.customer?.name}! Este é um lembrete do seu agendamento para ${appt.service?.name} com ${appt.barber_name || 'nosso barbeiro'} amanhã às ${apptDate}.\n\n${appt.tenant?.name}`
      await sendApptNotif(appt, msg, 'whatsapp_reminder_1day', 'appointment_reminder_1day')
    }

    // 2. Same-day reminders (appointments starting from now until end of today)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', now.toISOString())
      .lte('start_time', endOfToday.toISOString())

    for (const appt of todayAppts ?? []) {
      if (await wasAlreadySent(appt.id, 'whatsapp_reminder_today')) continue
      const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
      const msg = `⏰ *Lembrete: Seu agendamento é hoje!*\n\nOlá ${appt.customer?.name}! Este é um lembrete do seu agendamento para ${appt.service?.name} com ${appt.barber_name || 'nosso barbeiro'} hoje às ${apptDate}.\n\n${appt.tenant?.name}`
      await sendApptNotif(appt, msg, 'whatsapp_reminder_today', 'appointment_reminder_today')
    }

    // 3. No-show detection (past scheduled appointments not yet processed)
    const { data: noShowAppts } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .eq('status', 'scheduled')
      .lt('end_time', now.toISOString())
      .neq('reminder_sent', true)

    for (const appt of noShowAppts ?? []) {
      const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
      const msg = `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${apptDate}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`
      await sendApptNotif(appt, msg, 'whatsapp_absence', 'absence_alert')
      await supabase
        .from('appointments')
        .update({ status: 'cancelled', reminder_sent: true })
        .eq('id', appt.id)
    }

    // 4. Birthday notifications
    const { data: birthdayCustomers } = await supabase
      .from('customers')
      .select('*')
      .filter('birthday', 'like', `%-${todayMonthDay}`)

    for (const customer of birthdayCustomers ?? []) {
      const msg = `🎂 *Feliz Aniversário!*\n\nFeliz aniversário ${customer.name}! Venha comemorar com a gente!`
      const { waSent, error } = await trySendWa(customer.tenant_id, customer.phone, msg)
      await supabase.from('notification_logs').insert({
        tenant_id: customer.tenant_id,
        channel: 'whatsapp_birthday',
        body: msg,
        status: waSent ? 'sent' : 'failed',
        notification_type: 'birthday',
        sent_at: new Date().toISOString(),
      })
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
    const { data: alerts } = await supabase
      .from('inactivity_alerts')
      .select('*, tenants(id, name)')
      .eq('active', true)

    for (const alert of alerts ?? []) {
      const cutoffDate = new Date(now)
      cutoffDate.setDate(cutoffDate.getDate() - alert.days)
      const { data: inactiveCustomers } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', alert.tenant_id)
        .or(`last_visit_at.is.null,last_visit_at.lt.${cutoffDate.toISOString()}`)
      for (const customer of inactiveCustomers ?? []) {
        const msg = (alert.message || '').replace(/\{nome\}/g, customer.name || '')
        const { waSent, error } = await trySendWa(alert.tenant_id, customer.phone, msg)
        await supabase.from('notification_logs').insert({
          tenant_id: alert.tenant_id,
          channel: 'whatsapp_inactivity',
          body: msg,
          status: waSent ? 'sent' : 'failed',
          notification_type: 'inactivity_alert',
          sent_at: new Date().toISOString(),
        })
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

    return new Response(
      JSON.stringify({ success: true, count: notifications.length, notifications }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error('[send-notifications] Fatal error:', String(err))
    return new Response(
      JSON.stringify({ error: 'Failed to process notifications', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
