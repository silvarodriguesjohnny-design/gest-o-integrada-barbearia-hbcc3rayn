import { db } from './db'
import type { Appointment, AppointmentWithRelations, Service } from '@/types'

export async function getAppointmentsByDate(
  date: Date,
): Promise<{ data: AppointmentWithRelations[] | null; error: any }> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await db
    .from('appointments')
    .select(
      '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
    )
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time')

  return { data: data as AppointmentWithRelations[] | null, error }
}

export async function createAppointment(data: {
  customer_id: string
  service_id: string
  barber_name?: string
  start_time: string
  duration_minutes: number
}): Promise<{ data: Appointment | null; error: any }> {
  const start = new Date(data.start_time)
  const end = new Date(start.getTime() + data.duration_minutes * 60000)

  const { data: conflicts } = await db
    .from('appointments')
    .select('id')
    .neq('status', 'cancelled')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())
    .eq('barber_name', data.barber_name || null)

  if (conflicts && conflicts.length > 0) {
    return {
      data: null,
      error: { message: 'Conflito de horário detectado para este profissional.' },
    }
  }

  const { data: result, error } = await db
    .from('appointments')
    .insert({
      customer_id: data.customer_id,
      service_id: data.service_id,
      barber_name: data.barber_name,
      status: 'scheduled',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .select('*')
    .single()

  return { data: result as Appointment | null, error }
}

export async function getUniqueBarbers(): Promise<{ data: string[] | null; error: any }> {
  const { data, error } = await db
    .from('appointments')
    .select('barber_name')
    .not('barber_name', 'is', null)
  if (error) return { data: null, error }
  const unique = [...new Set((data || []).map((a: any) => a.barber_name).filter(Boolean))]
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
