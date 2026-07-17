import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const FRONTEND_URL = 'https://gestao-integrada-barbearia-a3c26.goskip.app'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method === 'GET')
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const body = await req.json()
    const phone = String(body.from || body.phone || body.sender || '')
    const message = String(body.message || body.body?.text || body.text || '').toLowerCase()
    const tenantId = String(body.tenant_id || body.metadata?.tenant_id || '')

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'Missing phone or message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle()

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ name: `Cliente WhatsApp ${phone.slice(-4)}`, phone, tenant_id: tenantId || null })
        .select('*')
        .single()
      customer = newCustomer
    }

    const tid = customer?.tenant_id || tenantId
    let responseText = ''

    if (message.includes('agendar') || message.includes('horario') || message.includes('marcar')) {
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tid)
        .order('name')
      const slots: string[] = []
      for (let d = 0; d < 3 && slots.length < 6; d++) {
        const date = new Date()
        date.setDate(date.getDate() + d)
        date.setHours(9, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(18, 0, 0, 0)
        const { data: booked } = await supabase
          .from('appointments')
          .select('start_time')
          .gte('start_time', date.toISOString())
          .lte('start_time', dayEnd.toISOString())
          .neq('status', 'cancelled')
        const bookedHours = new Set(
          (booked || []).map((a: any) => new Date(a.start_time).getHours()),
        )
        for (let h = 9; h < 18 && slots.length < 6; h++) {
          if (!bookedHours.has(h)) {
            slots.push(
              `${date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${String(h).padStart(2, '0')}:00`,
            )
          }
        }
      }
      const svcList = (services || [])
        .map((s: any, i: number) => `${i + 1}. ${s.name} - R$ ${s.price}`)
        .join('\n')
      responseText =
        slots.length > 0
          ? `Olá ${customer?.name}! Serviços:\n${svcList}\n\nHorários disponíveis:\n${slots.join('\n')}\n\nResponda com o número do serviço e horário (ex: "1 ${slots[0]}").`
          : `Olá ${customer?.name}! Não há horários disponíveis. Agende pelo link: ${FRONTEND_URL}/book/${tid}`
    } else if (message.includes('servico') || message.includes('preco')) {
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tid)
        .order('name')
      responseText = services?.length
        ? `Serviços:\n${services.map((s: any, i: number) => `${i + 1}. ${s.name} - R$ ${s.price} (${s.duration_minutes}min)`).join('\n')}\n\nDigite "agendar" para marcar.`
        : 'Nenhum serviço cadastrado.'
    } else if (message.includes('link') || message.includes('site')) {
      responseText = `Agende online: ${FRONTEND_URL}/book/${tid}`
    } else if (/^\d+/.test(message)) {
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tid)
        .order('name')
      const idx = parseInt(message.match(/(\d+)/)?.[1] ?? '0') - 1
      if (services && idx >= 0 && idx < services.length) {
        const svc = services[idx]
        const start = new Date()
        start.setDate(start.getDate() + 1)
        start.setHours(10, 0, 0, 0)
        const end = new Date(start.getTime() + svc.duration_minutes * 60000)
        const { error } = await supabase.from('appointments').insert({
          customer_id: customer?.id,
          service_id: svc.id,
          barber_name: 'A definir',
          status: 'scheduled',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          tenant_id: tid,
        })
        responseText = error
          ? `Erro ao agendar. Tente pelo link: ${FRONTEND_URL}/book/${tid}`
          : `✅ Agendado!\nServiço: ${svc.name}\nData: ${start.toLocaleString('pt-BR')}`
      } else {
        responseText = 'Opção inválida. Digite "agendar" para ver horários.'
      }
    } else {
      responseText = `Olá ${customer?.name}! Posso ajudar:\n• "agendar" - marcar horário\n• "serviços" - ver preços\n• "link" - agendamento online`
    }

    return new Response(
      JSON.stringify({ success: true, response: responseText, customer_id: customer?.id }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
