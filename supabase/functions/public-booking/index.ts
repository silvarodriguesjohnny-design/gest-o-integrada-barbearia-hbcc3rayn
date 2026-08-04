import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { action } = body

    if (action === 'get_tenant') {
      const { tenant_id } = body
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant_id)
        .single()
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenant_id)
      return new Response(JSON.stringify({ tenant, services: services || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_slots') {
      const { tenant_id, date } = body
      const [year, month, day] = date.split('-').map(Number)

      const prevDay = new Date(`${date}T00:00:00-03:00`)
      prevDay.setUTCDate(prevDay.getUTCDate() - 1)
      const nextDay = new Date(`${date}T23:59:59-03:00`)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time, barber_name, status')
        .eq('tenant_id', tenant_id)
        .neq('status', 'cancelled')
        .gte('start_time', prevDay.toISOString())
        .lte('start_time', nextDay.toISOString())

      const { data: barbers } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)

      const { data: schedules } = await supabase
        .from('barber_schedules')
        .select('barber_id, day_of_week, start_time, end_time, barbers(name)')
        .eq('tenant_id', tenant_id)

      const formattedSchedules = (schedules || []).map((s: any) => ({
        barber_name: s.barbers?.name || '',
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }))

      return new Response(
        JSON.stringify({
          appointments: appointments || [],
          barbers: (barbers || []).map((b: any) => b.name),
          barber_schedules: formattedSchedules,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'identify_customer') {
      const { tenant_id, cpf } = body
      const cleanCpf = cpf.replace(/\D/g, '')
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, phone, email, cpf')
        .eq('tenant_id', tenant_id)
        .eq('cpf', cleanCpf)
        .maybeSingle()

      return new Response(JSON.stringify({ customer: customer || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create_customer') {
      const { tenant_id, cpf, name, phone, email, communication_preferences } = body
      const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          cpf: cleanCpf,
          name,
          phone,
          email,
          communication_preferences: communication_preferences || ['email', 'whatsapp'],
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ customer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create_booking') {
      const { tenant_id, service_id, customer_id, barber_name, date, time } = body

      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .single()

      const duration = service?.duration_minutes || 30

      const [year, month, day] = date.split('-').map(Number)
      const [hours, minutes] = time.split(':').map(Number)
      const startTime = new Date(`${date}T${time}:00-03:00`)
      const endTime = new Date(startTime.getTime() + duration * 60000)

      let conflictQuery = supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', tenant_id)
        .neq('status', 'cancelled')
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString())

      if (barber_name) {
        conflictQuery = conflictQuery.eq('barber_name', barber_name)
      }

      const { data: conflicts } = await conflictQuery

      if (conflicts && conflicts.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Este horário está indisponível para o profissional selecionado.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (barber_name) {
        const dayOfWeek = new Date(year, month - 1, day).getDay()
        const { data: barberData } = await supabase
          .from('barbers')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('name', barber_name)
          .single()

        if (barberData) {
          const { data: schedules } = await supabase
            .from('barber_schedules')
            .select('*')
            .eq('barber_id', barberData.id)
            .eq('day_of_week', dayOfWeek)

          if (schedules && schedules.length > 0) {
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            const endTotalMinutes = hours * 60 + minutes + duration
            const endH = Math.floor(endTotalMinutes / 60) % 24
            const endM = endTotalMinutes % 60
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

            const isWithinSchedule = schedules.some((s: any) => {
              return s.start_time <= timeStr && s.end_time >= endTimeStr
            })

            if (!isWithinSchedule) {
              return new Response(
                JSON.stringify({ error: 'O profissional não atende neste horário.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
              )
            }
          }
        }
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          tenant_id,
          service_id,
          customer_id,
          barber_name: barber_name || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ appointment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
