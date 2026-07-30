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
    const body = await req.json()
    const { action, tenant_id } = body

    if (action === 'get_tenant') {
      const { data: tenant, error: tError } = await supabase
        .from('tenants')
        .select('id, name, logo_url, slug, whatsapp_phone')
        .eq('id', tenant_id)
        .eq('status', 'active')
        .single()
      if (tError || !tenant) {
        return new Response(JSON.stringify({ error: 'Barbearia não encontrada.' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      const { data: services } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('tenant_id', tenant.id)
      return new Response(JSON.stringify({ tenant, services: services || [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (action === 'get_slots') {
      const { date } = body
      const start = new Date(date); start.setHours(0, 0, 0, 0)
      const end = new Date(date); end.setHours(23, 59, 59, 999)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('tenant_id', tenant_id)
        .neq('status', 'cancelled')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
      return new Response(JSON.stringify({ appointments: appointments || [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (action === 'create_booking') {
      const { service_id, customer_name, customer_phone, customer_email, date, time } = body
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('id', tenant_id)
        .single()
      if (!tenant) {
        return new Response(JSON.stringify({ error: 'Tenant não encontrado' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', service_id)
        .single()
      if (!service) {
        return new Response(JSON.stringify({ error: 'Serviço não encontrado' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      let customerId: string
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer_phone)
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer, error: cError } = await supabase
          .from('customers')
          .insert({
            name: customer_name,
            phone: customer_phone,
            email: customer_email,
            tenant_id: tenant.id,
          })
          .select()
          .single()
        if (cError) {
          return new Response(JSON.stringify({ error: cError.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        customerId = newCustomer.id
      }

      const startTime = new Date(`${date}T${time}`)
      const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)
      const { data: appointment, error: aError } = await supabase
        .from('appointments')
        .insert({
          customer_id: customerId,
          service_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
          tenant_id: tenant.id,
        })
        .select()
        .single()
      if (aError) {
        return new Response(JSON.stringify({ error: aError.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      await supabase.from('notification_logs').insert({
        tenant_id: tenant.id,
        appointment_id: appointment.id,
        channel: 'email',
        body: `Confirmação: ${customer_name} - ${service.name} em ${startTime.toLocaleString('pt-BR')}. ${tenant.name}`,
        sent_at: new Date().toISOString(),
      })

      return new Response(JSON.stringify({ success: true, appointment }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
