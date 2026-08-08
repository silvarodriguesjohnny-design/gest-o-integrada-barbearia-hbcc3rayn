import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendWhatsAppMessage, getWhatsAppConfig, normalizePhone } from '../_shared/evolution-api.ts'

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

  try {
    const { appointment_id, type = 'confirmation' } = await req.json()

    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(
        '*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name, slug)',
      )
      .eq('id', appointment_id)
      .single()

    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: 'Agendamento não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      confirmation: `✅ *Confirmação*\n\nOlá ${appt.customer?.name}!\nSeu agendamento foi confirmado:\n• Serviço: ${appt.service?.name}\n• Barbeiro: ${appt.barber_name || 'A definir'}\n• Data/Hora: ${dateStr}\n\n${appt.tenant?.name}`,
      reminder: `⏰ *Lembrete*\n\nOlá ${appt.customer?.name}!\nVocê tem um agendamento para ${appt.service?.name} em ${dateStr}.\n\n${appt.tenant?.name}`,
      cancellation: `❌ *Cancelamento*\n\nOlá ${appt.customer?.name}!\nSeu agendamento de ${appt.service?.name} em ${dateStr} foi cancelado.\nPara remarcar, acesse nosso site.\n\n${appt.tenant?.name}`,
      absence: `⚠️ *Aviso de Ausência*\n\nOlá ${appt.customer?.name}!\nNotamos que você não compareceu ao agendamento de ${appt.service?.name} em ${dateStr}.\nEntre em contato para remarcar!\n\n${appt.tenant?.name}`,
    }
    const body = messages[type] || messages.confirmation

    const waConfig = await getWhatsAppConfig(supabase, appt.tenant_id)
    let waResult: { success: boolean; error?: string; wa_me?: string } | null = null

    if (waConfig && appt.customer?.phone) {
      const phone = normalizePhone(appt.customer.phone)
      const result = await sendWhatsAppMessage(waConfig, phone, body)
      waResult = {
        ...result,
        wa_me: `https://wa.me/${phone}?text=${encodeURIComponent(body)}`,
      }
    } else if (appt.customer?.phone) {
      const phone = normalizePhone(appt.customer.phone)
      waResult = {
        success: false,
        error: 'WhatsApp não configurado — usando wa.me como fallback',
        wa_me: `https://wa.me/${phone}?text=${encodeURIComponent(body)}`,
      }
    }

    for (const channel of channels) {
      await supabase.from('notification_logs').insert({
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        channel,
        body,
        sent_at: new Date().toISOString(),
      })
    }

    return new Response(
      JSON.stringify({ success: true, channels, type, body, whatsapp: waResult }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
