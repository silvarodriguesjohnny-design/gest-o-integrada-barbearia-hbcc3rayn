import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { appointment_id, type = 'confirmation' } = await req.json()

    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name, slug)')
      .eq('id', appointment_id)
      .single()

    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado.' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: configs } = await supabase
      .from('messaging_configs')
      .select('channel')
      .eq('tenant_id', appt.tenant_id)
      .eq('is_active', true)

    let channels = (configs || []).map((c: any) => c.channel)
    if (channels.length === 0) channels = ['email']

    const dateStr = new Date(appt.start_time).toLocaleString('pt-BR')
    const messages: Record<string, string> = {
      confirmation: `Confirmação: ${appt.customer?.name} - ${appt.service?.name} em ${dateStr}. ${appt.tenant?.name}`,
      reminder: `Lembrete: ${appt.customer?.name}, você tem ${appt.service?.name} agendado para ${dateStr}.`,
      cancellation: `Cancelamento: ${appt.customer?.name} - ${appt.service?.name} em ${dateStr} foi cancelado.`,
    }
    const body = messages[type] || messages.confirmation

    for (const channel of channels) {
      await supabase.from('notification_logs').insert({
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        channel,
        body,
        sent_at: new Date().toISOString(),
      })
    }

    return new Response(JSON.stringify({ success: true, channels, type, body }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
