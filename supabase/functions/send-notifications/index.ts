import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const today = new Date()
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  try {
    const [confirmedRes, birthdayRes, inactiveRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, customer:customers(*), service:services(*)')
        .in('status', ['scheduled', 'confirmed'])
        .gte('start_time', today.toISOString()),
      supabase.from('customers').select('*').filter('birthday', 'like', `%-${todayMonthDay}`),
      supabase.from('inactive_customers').select('*'),
    ])

    const notifications: Record<string, unknown>[] = []

    for (const appt of confirmedRes.data ?? []) {
      notifications.push({
        type: 'appointment_reminder',
        customer: appt.customer?.name,
        phone: appt.customer?.phone,
        message: `Olá ${appt.customer?.name}! Você tem um agendamento para ${appt.service?.name} em ${new Date(appt.start_time).toLocaleString('pt-BR')}.`,
      })
    }

    for (const customer of birthdayRes.data ?? []) {
      notifications.push({
        type: 'birthday',
        customer: customer.name,
        phone: customer.phone,
        message: `Feliz aniversário ${customer.name}! Venha comemorar com a gente!`,
      })
    }

    for (const customer of inactiveRes.data ?? []) {
      notifications.push({
        type: 'inactivity_alert',
        customer: customer.name,
        phone: customer.phone,
        message: `Olá ${customer.name}, sentimos sua falta! Volta pra gente dar um trato no visual.`,
      })
    }

    if (whatsappApiKey && notifications.length > 0) {
      // TODO: Integrate with WhatsApp API using whatsappApiKey
      // await sendWhatsAppMessages(notifications, whatsappApiKey);
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
