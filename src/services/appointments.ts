import { db } from './db'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'
import type { Appointment, AppointmentWithRelations } from '@/types'
import type { PublicBarberSchedule } from './public-booking'

export async function getAppointmentsByDate(
  date: Date,
): Promise<{ data: AppointmentWithRelations[] | null; error: any }> {
  const dateStr = formatLocalDateYYYYMMDD(date)
  const [year, month, day] = dateStr.split('-').map(Number)

  // Extended range window to ensure cross-timezone query coverage
  const startWindow = new Date(year, month - 1, day - 1, 12, 0, 0, 0)
  const endWindow = new Date(year, month - 1, day + 1, 12, 0, 0, 0)

  const { data, error } = await db
    .from('appointments')
    .select(
      '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
    )
    .gte('start_time', startWindow.toISOString())
    .lte('start_time', endWindow.toISOString())
    .order('start_time')

  if (error) return { data: null, error }

  // Filter precisely by local date match
  const filtered = (data || []).filter((app) => formatLocalDateYYYYMMDD(app.start_time) === dateStr)

  return { data: filtered as AppointmentWithRelations[], error: null }
}

export async function getBarberSchedules(): Promise<{
  data: PublicBarberSchedule[] | null
  error: any
}> {
  const { data, error } = await db
    .from('barber_schedules')
    .select('day_of_week, start_time, end_time, barber:barbers(name)')

  if (error) return { data: null, error }

  const formatted: PublicBarberSchedule[] = (data || []).map((s: any) => ({
    barber_name: s.barber?.name || '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
  }))

  return { data: formatted, error: null }
}

export async function createAppointment(data: {
  customer_id: string
  service_id: string
  barber_name?: string
  start_time: string
  duration_minutes: number
}): Promise<{ data: Appointment | null; error: any; notification?: any }> {
  const start = new Date(data.start_time)
  const end = new Date(start.getTime() + data.duration_minutes * 60000)

  let conflictQuery = db
    .from('appointments')
    .select('id')
    .neq('status', 'cancelled')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())

  if (data.barber_name) {
    conflictQuery = conflictQuery.eq('barber_name', data.barber_name)
  }

  const { data: conflicts } = await conflictQuery

  if (conflicts && conflicts.length > 0) {
    return {
      data: null,
      error: { message: 'Este horário está indisponível para o profissional selecionado.' },
    }
  }

  // Resolve barber_id from barber_name so the public barber agenda can show
  // this appointment. Only matches within the current tenant (RLS scopes).
  let barber_id: string | null = null
  if (data.barber_name) {
    const { data: barberRow } = await db
      .from('barbers')
      .select('id')
      .eq('name', data.barber_name)
      .maybeSingle()
    barber_id = barberRow?.id ?? null
  }

  const { data: result, error } = await db
    .from('appointments')
    .insert({
      customer_id: data.customer_id,
      service_id: data.service_id,
      barber_name: data.barber_name,
      barber_id,
      status: 'scheduled',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      confirmation_token: crypto.randomUUID(),
    })
    .select('*')
    .single()

  let notification: any = undefined
  if (result) {
    try {
      const { data: notifData, error: notifError } = await db.functions.invoke(
        'send-appointment-notification',
        { body: { appointment_id: result.id, type: 'confirmation' } },
      )
      if (notifError) {
        console.error('[appointments] Confirmation notification error:', notifError)
      }
      if (notifData && !notifData.success && notifData.whatsapp?.error) {
        console.warn('[appointments] Confirmation notification issue:', notifData.whatsapp.error)
      }
      notification = notifData
    } catch (err: any) {
      console.error('[appointments] Failed to trigger confirmation notification:', String(err))
    }
  }

  return { data: result as Appointment | null, error, notification }
}

export async function getUniqueBarbers(): Promise<{ data: string[] | null; error: any }> {
  const [apptRes, barberRes] = await Promise.all([
    db.from('appointments').select('barber_name').not('barber_name', 'is', null),
    db.from('barbers').select('name').eq('is_active', true).order('name'),
  ])
  if (apptRes.error) return { data: null, error: apptRes.error }
  const apptBarbers = (apptRes.data || []).map((a: any) => a.barber_name).filter(Boolean)
  const tableBarbers = (barberRes.data || []).map((b: any) => b.name)
  const unique = [...new Set([...tableBarbers, ...apptBarbers])]
  return { data: unique, error: null }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { data, error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select(
      '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
    )
    .single()
  return { data: data as AppointmentWithRelations | null, error }
}

export async function updateAppointment(
  id: string,
  updates: {
    barber_name?: string | null
    service_id?: string
    start_time?: string
    end_time?: string
    status?: string
  },
) {
  // Keep barber_id in sync when barber_name changes so the public barber
  // agenda continues to show the appointment under the right professional.
  let resolvedUpdates: Record<string, unknown> = { ...updates }
  if ('barber_name' in updates) {
    if (updates.barber_name) {
      const { data: barberRow } = await db
        .from('barbers')
        .select('id')
        .eq('name', updates.barber_name)
        .maybeSingle()
      resolvedUpdates.barber_id = barberRow?.id ?? null
    } else {
      resolvedUpdates.barber_id = null
    }
  }

  const { data: result, error } = await db
    .from('appointments')
    .update(resolvedUpdates)
    .eq('id', id)
    .select(
      '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
    )
    .single()
  return { data: result as AppointmentWithRelations | null, error }
}

export async function cancelAppointment(id: string, notify: boolean) {
  const { data, error } = await updateAppointmentStatus(id, 'cancelled')
  if (notify && data) {
    db.functions
      .invoke('send-appointment-notification', {
        body: { appointment_id: id, type: 'cancellation' },
      })
      .catch(() => {})
  }
  return { data, error }
}

export async function markNoShow(
  id: string,
): Promise<{ data: AppointmentWithRelations | null; error: any }> {
  const { data, error } = await db
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select(
      '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
    )
    .single()

  if (data) {
    db.functions
      .invoke('send-appointment-notification', {
        body: { appointment_id: id, type: 'absence' },
      })
      .catch(() => {})
  }

  return { data: data as AppointmentWithRelations | null, error }
}
