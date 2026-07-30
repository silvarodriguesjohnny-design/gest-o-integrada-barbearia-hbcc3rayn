import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

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
    const tenantName = (body.tenant_name as string) || 'Unknown'
    const planType = (body.plan_type as string) || 'Unknown'

    const notification = {
      type: 'new_tenant_alert',
      recipient: recipientEmail,
      tenant_name: tenantName,
      plan_type: planType,
      message: `Novo tenant provisionado: ${tenantName} (Plano: ${planType}).`,
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

    const { data: birthdayCustomers } = await supabase
      .from('customers')
      .select('*')
      .filter('birthday', 'like', `%-${todayMonthDay}`)

    const { data: alerts } = await supabase
      .from('inactivity_alerts')
      .select('*, tenants(id, name)')
      .eq('active', true)

    const notifications: Record<string, unknown>[] = []

    for (const appt of confirmedAppts ?? []) {
      notifications.push({
        type: 'appointment_reminder',
        customer: appt.customer?.name,
        phone: appt.customer?.phone,
        tenant_id: appt.tenant_id,
        message: `Olá ${appt.customer?.name}! Você tem um agendamento para ${appt.service?.name} em ${new Date(appt.start_time).toLocaleString('pt-BR')}.`,
      })
    }

    for (const customer of birthdayCustomers ?? []) {
      notifications.push({
        type: 'birthday',
        customer: customer.name,
        phone: customer.phone,
        tenant_id: customer.tenant_id,
        message: `Feliz aniversário ${customer.name}! Venha comemorar com a gente!`,
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
        notifications.push({
          type: 'inactivity_alert',
          customer: customer.name,
          phone: customer.phone,
          tenant_id: alert.tenant_id,
          channels: alert.channels,
          message: msg,
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: notifications.length, notifications }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to process notifications', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
