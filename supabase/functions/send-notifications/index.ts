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

  const today = new Date()
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  try {
    const { data: confirmedAppts } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', today.toISOString())
    const { data: noShowAppts } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), service:services(*), tenant:tenants(name)')
      .eq('status', 'scheduled')
      .lt('end_time', today.toISOString())
      .neq('reminder_sent', true)
    const { data: birthdayCustomers } = await supabase
      .from('customers')
      .select('*')
      .filter('birthday', 'like', `%-${todayMonthDay}`)
    const { data: alerts } = await supabase
      .from('inactivity_alerts')
      .select('*, tenants(id, name)')
      .eq('active', true)

    const notifications: Record<string, unknown>[] = []
    const tenantWaConfigs: Record<string, any> = {}

    async function getWaConfig(tenantId: string) {
      if (!tenantWaConfigs[tenantId]) {
        tenantWaConfigs[tenantId] = await getWhatsAppConfig(supabase, tenantId)
      }
      return tenantWaConfigs[tenantId]
    }

    async function trySendWa(tenantId: string, phone: string, msg: string) {
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
      const result = await sendWhatsAppMessage(waConfig!, phone, msg)
      if (!result.success)
        console.error('[send-notifications] Send failed for tenant', tenantId, ':', result.error)
      return { waSent: result.success, error: result.error }
    }

    for (const appt of confirmedAppts ?? []) {
      const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
      const msg = `⏰ *Lembrete*\n\nOlá ${appt.customer?.name}! Você tem um agendamento para ${appt.service?.name} com ${appt.barber_name || 'nosso barbeiro'} em ${apptDate}.\n\n${appt.tenant?.name}`
      const { waSent, error } = await trySendWa(appt.tenant_id, appt.customer?.phone, msg)
      notifications.push({
        type: 'appointment_reminder',
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

    for (const appt of noShowAppts ?? []) {
      const apptDate = new Date(appt.start_time).toLocaleString('pt-BR')
      const msg = `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${apptDate}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`
      const { waSent, error } = await trySendWa(appt.tenant_id, appt.customer?.phone, msg)
      await supabase
        .from('appointments')
        .update({ status: 'cancelled', reminder_sent: true })
        .eq('id', appt.id)
      notifications.push({
        type: 'absence_alert',
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

    for (const customer of birthdayCustomers ?? []) {
      const msg = `🎂 *Feliz Aniversário!*\n\nFeliz aniversário ${customer.name}! Venha comemorar com a gente!`
      const { waSent, error } = await trySendWa(customer.tenant_id, customer.phone, msg)
      notifications.push({
        type: 'birthday',
        customer: customer.name,
        phone: customer.phone,
        tenant_id: customer.tenant_id,
        whatsapp_sent: waSent,
        error,
        wa_me: customer.phone
          ? `https://wa.me/${normalizePhone(customer.phone)}?text=${encodeURIComponent(msg)}`
          : null,
        message: msg,
      })
    }

    for (const alert of alerts ?? []) {
      const cutoffDate = new Date(today)
      cutoffDate.setDate(cutoffDate.getDate() - alert.days)
      const { data: inactiveCustomers } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', alert.tenant_id)
        .or(`last_visit_at.is.null,last_visit_at.lt.${cutoffDate.toISOString()}`)
      for (const customer of inactiveCustomers ?? []) {
        const msg = (alert.message || '').replace(/\{nome\}/g, customer.name || '')
        const { waSent, error } = await trySendWa(alert.tenant_id, customer.phone, msg)
        notifications.push({
          type: 'inactivity_alert',
          customer: customer.name,
          phone: customer.phone,
          tenant_id: alert.tenant_id,
          channels: alert.channels,
          whatsapp_sent: waSent,
          error,
          wa_me: customer.phone
            ? `https://wa.me/${normalizePhone(customer.phone)}?text=${encodeURIComponent(msg)}`
            : null,
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
