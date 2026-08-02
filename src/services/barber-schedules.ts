import { db } from './db'
import type { BarberSchedule } from '@/types'

export async function getBarberSchedules(
  barberId: string,
): Promise<{ data: BarberSchedule[] | null; error: any }> {
  const { data, error } = await db
    .from('barber_schedules')
    .select('*')
    .eq('barber_id', barberId)
    .order('day_of_week')
  return { data: data as BarberSchedule[] | null, error }
}

export async function saveBarberSchedules(
  barberId: string,
  schedules: { day_of_week: number; start_time: string; end_time: string }[],
): Promise<{ error: any }> {
  const { error: deleteError } = await db
    .from('barber_schedules')
    .delete()
    .eq('barber_id', barberId)

  if (deleteError) return { error: deleteError }
  if (schedules.length === 0) return { error: null }

  const { error: insertError } = await db
    .from('barber_schedules')
    .insert(schedules.map((s) => ({ ...s, barber_id: barberId })))

  return { error: insertError }
}
