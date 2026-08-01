import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body = await req.json()

  switch (body.action) {
    case 'get_tenant': {
      const { tenant_id } = body
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, logo_url, slug, whatsapp_phone')
        .eq('id', tenant_id)
        .single()
      const { data: services } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('tenant_id', tenant_id)
        .order('name')
      return json({ tenant, services })
    }
    case 'get_slots': {
      const { tenant_id, date } = body
      const ds = new Date(date + 'T00:00:00.000Z')
      const de = new Date(date + 'T23:59:59.999Z')
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time, barber_name')
        .eq('tenant_id', tenant_id)
        .gte('start_time', ds.toISOString())
        .lte('start_time', de.toISOString())
        .neq('status', 'cancelled')
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('tenant_id', tenant_id)
        .in('role', ['admin', 'operator'])
      const barbers = (profiles || []).map((p: any) => p.full_name).filter(Boolean)
      return json({ appointments: appointments || [], barbers })
    }
    case 'identify_customer': {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('cpf', body.cpf)
        .eq('tenant_id', body.tenant_id)
        .maybeSingle()
      return json({ customer, error })
    }
    case 'create_customer': {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: body.tenant_id,
          cpf: body.cpf,
          name: body.name,
          phone: body.phone,
          email: body.email,
          communication_preferences: body.communication_preferences,
        })
        .select('*')
        .single()
      return json({ customer, error })
    }
    case 'create_booking': {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', body.service_id)
        .single()
      const dur = service?.duration_minutes || 30
      const start = new Date(`${body.date}T${body.time}:00`)
      const end = new Date(start.getTime() + dur * 60000)
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          tenant_id: body.tenant_id,
          customer_id: body.customer_id,
          service_id: body.service_id,
          barber_name: body.barber_name || null,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'scheduled',
        })
        .select('*')
        .single()
      return json({ appointment, error })
    }
    default:
      return json({ error: 'Invalid action' }, 400)
  }
})
