import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    switch (body.action) {
      case 'get_tenant': {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, logo_url, slug, whatsapp_phone')
          .eq('id', body.tenant_id)
          .single()

        const { data: services } = await supabase
          .from('services')
          .select('id, name, description, price, duration_minutes')
          .eq('tenant_id', body.tenant_id)

        return new Response(JSON.stringify({ tenant, services: services || [] }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      case 'get_slots': {
        const date = new Date(body.date)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const { data: appointments } = await supabase
          .from('appointments')
          .select('start_time, end_time, barber_name')
          .eq('tenant_id', body.tenant_id)
          .neq('status', 'cancelled')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())

        const { data: barbersData } = await supabase
          .from('barbers')
          .select('id, name, is_active')
          .eq('tenant_id', body.tenant_id)

        const { data: schedulesData } = await supabase
          .from('barber_schedules')
          .select('barber_id, day_of_week, start_time, end_time')
          .eq('tenant_id', body.tenant_id)

        const barberMap = new Map((barbersData || []).map((b: any) => [b.id, b.name]))
        const barberSchedules = (schedulesData || [])
          .map((s: any) => ({
            barber_name: barberMap.get(s.barber_id) || null,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          }))
          .filter((s: any) => s.barber_name !== null)

        const activeBarberNames = new Set(
          (barbersData || []).filter((b: any) => b.is_active !== false).map((b: any) => b.name),
        )
        const barbers = [...new Set(barberSchedules.map((s: any) => s.barber_name))].filter(
          (name: string) => activeBarberNames.has(name),
        )

        return new Response(
          JSON.stringify({
            appointments: appointments || [],
            barbers,
            barber_schedules: barberSchedules,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      case 'identify_customer': {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, phone, email, cpf')
          .eq('tenant_id', body.tenant_id)
          .eq('cpf', body.cpf)
          .single()

        return new Response(JSON.stringify({ customer }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      case 'create_customer': {
        const { data: customer, error } = await supabase
          .from('customers')
          .insert({
            tenant_id: body.tenant_id,
            cpf: body.cpf,
            name: body.name,
            phone: body.phone,
            email: body.email || null,
            communication_preferences: body.communication_preferences || ['email', 'whatsapp'],
          })
          .select('id, name, phone, email, cpf')
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        return new Response(JSON.stringify({ customer }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      case 'create_booking': {
        const { data: service } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', body.service_id)
          .single()

        const duration = service?.duration_minutes || 30
        const startTime = new Date(`${body.date}T${body.time}`)
        const endTime = new Date(startTime.getTime() + duration * 60000)
        const barberName = body.barber_name || null

        if (barberName) {
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .neq('status', 'cancelled')
            .lt('start_time', endTime.toISOString())
            .gt('end_time', startTime.toISOString())
            .eq('tenant_id', body.tenant_id)
            .eq('barber_name', barberName)

          if (conflicts && conflicts.length > 0) {
            return new Response(
              JSON.stringify({ error: 'Conflito de horário detectado para este profissional.' }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
            )
          }
        }

        const { data: appointment, error } = await supabase
          .from('appointments')
          .insert({
            tenant_id: body.tenant_id,
            customer_id: body.customer_id,
            service_id: body.service_id,
            barber_name: barberName,
            status: 'scheduled',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          })
          .select('*')
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        return new Response(JSON.stringify({ appointment }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
