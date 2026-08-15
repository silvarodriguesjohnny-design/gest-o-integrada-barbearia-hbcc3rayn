import { publicSupabase } from '@/lib/supabase/public-client'
import type { AppointmentStatus } from '@/types'

/**
 * Public barber agenda — read-only, no auth.
 * A visitor with the barber's `public_token` can load the barber's
 * name and their today/future appointments.
 */

export interface PublicBarberInfo {
  id: string
  name: string
}

export interface PublicBarberAppointment {
  id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  customer_name: string | null
  service_name: string | null
}

export interface PublicBarberAgenda {
  barber: PublicBarberInfo
  appointments: PublicBarberAppointment[]
}

export async function getPublicBarberByToken(
  token: string,
): Promise<{ data: PublicBarberInfo | null; error: any }> {
  const { data, error } = await (publicSupabase as any)
    .from('barbers')
    .select('id, name, public_token')
    .eq('public_token', token)
    .maybeSingle()
  return { data: data as PublicBarberInfo | null, error }
}

export async function getPublicBarberAgenda(
  token: string,
): Promise<{ data: PublicBarberAgenda | null; error: any }> {
  // 1. Resolve the barber by token
  const { data: barber, error: barberError } = await getPublicBarberByToken(token)
  if (barberError) return { data: null, error: barberError }
  if (!barber) return { data: null, error: null }

  // 2. Today (America/Sao_Paulo) start as an ISO string to filter future/today.
  const todayStartIso = getTodayStartSaoPauloIso()

  // 3. Fetch today + future appointments for this barber, with relations.
  //    RLS restricts anon to barber_id-bearing rows whose barber has a
  //    public_token AND whose start_time is >= today (Sao_Paulo).
  const { data: appts, error: apptError } = await (publicSupabase as any)
    .from('appointments')
    .select(
      'id, start_time, end_time, status, barber_id, customer:customers(name), service:services(name)',
    )
    .eq('barber_id', barber.id)
    .gte('start_time', todayStartIso)
    .order('start_time', { ascending: true })

  if (apptError) return { data: null, error: apptError }

  const appointments: PublicBarberAppointment[] = (appts || []).map((a: any) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    status: a.status as AppointmentStatus,
    customer_name: a.customer?.name ?? null,
    service_name: a.service?.name ?? null,
  }))

  return { data: { barber, appointments }, error: null }
}

/**
 * Returns the ISO string for the start of "today" in America/Sao_Paulo.
 * The DB column is timestamptz, so we compare against this UTC instant.
 */
function getTodayStartSaoPauloIso(): string {
  // Format today's date in Sao_Paulo, then build a UTC timestamp for that
  // calendar day at 00:00 local.
  const now = new Date()
  const brasiliaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = brasiliaParts.find((p) => p.type === 'year')?.value || '1970'
  const m = brasiliaParts.find((p) => p.type === 'month')?.value || '01'
  const d = brasiliaParts.find((p) => p.type === 'day')?.value || '01'
  // 00:00 at America/Sao_Paulo (-03:00) as an ISO instant
  return new Date(`${y}-${m}-${d}T00:00:00-03:00`).toISOString()
}
