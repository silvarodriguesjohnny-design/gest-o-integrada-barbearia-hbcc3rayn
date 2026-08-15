import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  getWhatsAppConfig,
  sendWhatsAppMessage,
  validateWhatsAppConfig,
  buildWaMeLink,
} from '../_shared/evolution-api.ts'
import { formatBrasiliaDateTime } from '../_shared/datetime.ts'

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
      const { tenant_id, slug } = body
      let tenant = null
      if (slug) {
        const { data } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle()
        tenant = data
      } else {
        const { data } = await supabase.from('tenants').select('*').eq('id', tenant_id).single()
        tenant = data
      }
      const effectiveId = tenant?.id || tenant_id
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', effectiveId)
      return new Response(JSON.stringify({ tenant, services: services || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_slots') {
      const { tenant_id, date } = body

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
      // Resolve barber_id from barber_name within the tenant so the new
      // appointment is associated with the barber for the public agenda.
      let barber_id: string | null = null
      if (barber_name && tenant_id) {
        const { data: barberRow } = await supabase
          .from('barbers')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('name', barber_name)
          .maybeSingle()
        barber_id = barberRow?.id ?? null
      }

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
          barber_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
          confirmation_token: crypto.randomUUID(),
        })
        .select()
        .single()

      if (error) throw error

      // --- Single notification path: invoke send-appointment-notification edge function ---
      // The inline WhatsApp send was removed to eliminate duplicate notifications.
      // All notification logic (including race-safe deduplication) lives in
      // send-appointment-notification, which is the sole sender for confirmations.
      try {
        const fnUrl = `${supabaseUrl}/functions/v1/send-appointment-notification`
        console.log(
          '[public-booking] Triggering confirmation notification for appointment:',
          appointment.id,
        )
        const notifResp = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ appointment_id: appointment.id, type: 'confirmation' }),
        })
        const notifData = await notifResp.json()
        console.log(
          '[public-booking] Confirmation notification result:',
          JSON.stringify({
            success: notifData.success,
            duplicate: notifData.duplicate,
            type: notifData.type,
          }),
        )
      } catch (notifyErr) {
        console.error(
          '[public-booking] Error triggering confirmation notification:',
          String(notifyErr),
          '| stack:',
          (notifyErr as Error)?.stack,
        )
      }

      return new Response(JSON.stringify({ appointment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_appointment_by_token') {
      const { token } = body
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token não informado.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fetch the appointment + relations by confirmation_token. This call uses
      // the service role key, so it bypasses RLS. The public page itself also
      // queries via the anon client (RLS allows select by token), but the
      // service-role fetch here is the canonical source for the page payload.
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select(
          'id, status, start_time, end_time, barber_name, confirmation_token, tenant_id, customer:customers(id, name), service:services(id, name, duration_minutes), tenant:tenants(id, name, logo_url)',
        )
        .eq('confirmation_token', token)
        .maybeSingle()

      if (apptError) throw apptError
      if (!appt) {
        return new Response(JSON.stringify({ appointment: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Loyalty summary for the customer (may not exist yet -> 0 stamps)
      const { data: loyalty } = await supabase
        .from('loyalty_cards')
        .select('stamps_count, is_reward_ready')
        .eq('customer_id', appt.customer?.id)
        .maybeSingle()

      return new Response(
        JSON.stringify({
          appointment: {
            id: appt.id,
            status: appt.status,
            start_time: appt.start_time,
            end_time: appt.end_time,
            barber_name: appt.barber_name,
            confirmation_token: appt.confirmation_token,
            customer_name: appt.customer?.name || null,
            service_name: appt.service?.name || null,
            tenant_name: appt.tenant?.name || null,
            tenant_logo_url: appt.tenant?.logo_url || null,
          },
          loyalty: {
            stamps_count: loyalty?.stamps_count ?? 0,
            is_reward_ready: loyalty?.is_reward_ready ?? false,
            target: 12,
            remaining: Math.max(0, 12 - (loyalty?.stamps_count ?? 0)),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'confirm_appointment') {
      const { token } = body
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token não informado.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Load current appointment to validate state
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select('id, status, confirmation_token')
        .eq('confirmation_token', token)
        .maybeSingle()

      if (apptError) throw apptError
      if (!appt) {
        return new Response(JSON.stringify({ error: 'Agendamento não encontrado.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (appt.status === 'confirmed') {
        return new Response(JSON.stringify({ already_confirmed: true, appointment: appt }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (appt.status !== 'scheduled') {
        return new Response(
          JSON.stringify({
            error: `Não é possível confirmar: status atual é "${appt.status}".`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appt.id)
        .eq('status', 'scheduled')
        .select('id, status')
        .single()

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true, appointment: updated }), {
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
