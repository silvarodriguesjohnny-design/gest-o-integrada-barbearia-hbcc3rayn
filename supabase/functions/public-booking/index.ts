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

      // --- Direct server-side WhatsApp confirmation (no browser dependency) ---
      try {
        console.log(
          '[public-booking] STEP 1: Loading full appointment data for appointment:',
          appointment.id,
        )
        const { data: fullAppt, error: fullApptError } = await supabase
          .from('appointments')
          .select(
            '*, customer:customers(name, phone, email), service:services(name, price, duration_minutes), tenant:tenants(name)',
          )
          .eq('id', appointment.id)
          .single()

        if (fullApptError) {
          console.error(
            '[public-booking] STEP 1 FAILED: Error loading full appointment:',
            fullApptError.message,
            '| code:',
            fullApptError.code,
            '| details:',
            JSON.stringify(fullApptError),
          )
        }
        console.log(
          '[public-booking] STEP 1 RESULT: fullAppt loaded:',
          !!fullAppt,
          '| customer:',
          fullAppt?.customer?.name,
          '| phone:',
          fullAppt?.customer?.phone,
          '| service:',
          fullAppt?.service?.name,
          '| tenant:',
          fullAppt?.tenant?.name,
        )

        if (fullAppt) {
          console.log('[public-booking] STEP 2: Checking for existing confirmation logs')
          const { data: existingLogs, error: existingLogsError } = await supabase
            .from('notification_logs')
            .select('id, status')
            .eq('appointment_id', appointment.id)
            .eq('channel', 'whatsapp')
            .eq('notification_type', 'confirmation')
            .eq('status', 'sent')
            .limit(1)

          if (existingLogsError) {
            console.error(
              '[public-booking] STEP 2 WARNING: Error checking existing logs:',
              existingLogsError.message,
            )
          }
          console.log(
            '[public-booking] STEP 2 RESULT: existing sent confirmations:',
            existingLogs?.length || 0,
          )

          if (!existingLogs || existingLogs.length === 0) {
            const dateStr = formatBrasiliaDateTime(fullAppt.start_time)
            const body =
              `✅ *Confirmação*\n\nOlá ${fullAppt.customer?.name}!\n` +
              `Seu agendamento foi confirmado:\n` +
              `• Serviço: ${fullAppt.service?.name}\n` +
              `• Barbeiro: ${fullAppt.barber_name || 'A definir'}\n` +
              `• Data/Hora: ${dateStr}\n\n${fullAppt.tenant?.name}`

            console.log(
              '[public-booking] STEP 3: Reading WhatsApp config from messaging_configs for tenant:',
              tenant_id,
            )
            const waConfig = await getWhatsAppConfig(supabase, tenant_id)
            console.log(
              '[public-booking] STEP 3 RESULT: config loaded:',
              !!waConfig,
              '| base_url:',
              waConfig?.base_url ? `(set, length=${waConfig.base_url.length})` : '(MISSING)',
              '| instance_name:',
              waConfig?.instance_name ? `"${waConfig.instance_name}"` : '(MISSING)',
              '| api_key:',
              waConfig?.api_key ? `(set, length=${waConfig.api_key.length})` : '(MISSING)',
            )

            console.log('[public-booking] STEP 4: Validating WhatsApp config')
            const valErr = validateWhatsAppConfig(waConfig)
            console.log(
              '[public-booking] STEP 4 RESULT: validation:',
              valErr ? `FAILED — ${valErr}` : 'PASSED',
            )

            let logStatus = 'failed'
            let logBody = body

            if (valErr) {
              console.error(
                '[public-booking] STEP 4 FAILED: WhatsApp config validation failed:',
                valErr,
              )
              logBody = `[FALHA CONFIG] ${valErr}\n\n${body}`
            } else if (!fullAppt.customer?.phone) {
              console.error(
                '[public-booking] STEP 5 SKIPPED: Customer has no phone number registered — cannot send WhatsApp',
              )
              logBody = `[FALHA] Cliente não possui telefone cadastrado.\n\n${body}`
            } else {
              console.log(
                '[public-booking] STEP 5: Calling Evolution API sendWhatsAppMessage — target:',
                fullAppt.customer.phone,
                '| message length:',
                body.length,
              )
              const result = await sendWhatsAppMessage(waConfig!, fullAppt.customer.phone, body)
              console.log(
                '[public-booking] STEP 5 RESULT: sendWhatsAppMessage returned:',
                result.success ? 'SUCCESS' : 'FAILED',
                result.error ? `| error: ${result.error}` : '',
                result.details ? `| details: ${JSON.stringify(result.details)}` : '',
              )

              if (result.success) {
                logStatus = 'sent'
                console.log(
                  '[public-booking] STEP 5 SUCCESS: WhatsApp confirmation sent successfully to:',
                  fullAppt.customer.phone,
                )
              } else {
                logBody = `[FALHA ENVIO] ${result.error}\n\n${body}`
                console.error('[public-booking] STEP 5 FAILED: WhatsApp send failed:', result.error)
                if (result.details) {
                  console.error(
                    '[public-booking] STEP 5 ERROR DETAILS:',
                    JSON.stringify(result.details),
                  )
                }
              }
            }

            console.log(
              '[public-booking] STEP 6: Logging notification to notification_logs — appointment_id:',
              appointment.id,
              '| status:',
              logStatus,
              '| channel: whatsapp',
            )
            const { error: logError } = await supabase.from('notification_logs').insert({
              tenant_id,
              appointment_id: appointment.id,
              channel: 'whatsapp',
              body: logBody,
              status: logStatus,
              notification_type: 'confirmation',
              sent_at: new Date().toISOString(),
            })

            if (logError) {
              console.error(
                '[public-booking] STEP 6 CRITICAL: Failed to log notification:',
                logError.message,
                '| code:',
                logError.code,
                '| details:',
                JSON.stringify(logError),
              )
            } else {
              console.log(
                '[public-booking] STEP 6 RESULT: notification_logs insert SUCCESSFUL — status:',
                logStatus,
                '| appointment_id:',
                appointment.id,
              )
            }
          } else {
            console.log('[public-booking] STEP 2: Confirmation already sent successfully, skipping')
          }
        } else {
          console.error(
            '[public-booking] STEP 1 FAILED: fullAppt is null — cannot send confirmation. This may indicate a PostgREST join error or RLS issue. Error:',
            fullApptError ? JSON.stringify(fullApptError) : 'unknown',
          )
        }
      } catch (notifyErr) {
        console.error(
          '[public-booking] CRITICAL: Confirmation notification error:',
          String(notifyErr),
          '| stack:',
          (notifyErr as Error)?.stack,
        )
      }

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
