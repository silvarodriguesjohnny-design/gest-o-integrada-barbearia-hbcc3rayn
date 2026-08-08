import { supabase } from '@/lib/supabase/client'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'

export interface PublicTenant {
  id: string
  name: string
  logo_url: string | null
  slug: string
  whatsapp_phone: string | null
}

export interface PublicService {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
}

export interface PublicCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  cpf: string | null
}

export interface SlotAppointment {
  start_time: string
  end_time: string
  barber_name: string | null
  status?: string
}

export interface TimeSlot {
  time: string
  available: boolean
  reason?: string
}

export interface PublicBarberSchedule {
  barber_name: string
  day_of_week: number
  start_time: string
  end_time: string
}

export async function getTenantData(tenantId: string) {
  const { data, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'get_tenant', tenant_id: tenantId },
  })
  return { data: data as { tenant: PublicTenant; services: PublicService[] } | null, error }
}

export async function getSlots(tenantId: string, date: string) {
  const { data, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'get_slots', tenant_id: tenantId, date },
  })
  return {
    data: data as {
      appointments: SlotAppointment[]
      barbers: string[]
      barber_schedules: PublicBarberSchedule[]
    } | null,
    error,
  }
}

export async function identifyCustomer(tenantId: string, cpf: string) {
  const { data, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'identify_customer', tenant_id: tenantId, cpf },
  })
  return { data: data as { customer: PublicCustomer | null } | null, error }
}

export async function createPublicCustomer(data: {
  tenant_id: string
  cpf: string
  name: string
  phone: string
  email?: string
  communication_preferences?: string[]
}) {
  const { data: result, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'create_customer', ...data },
  })
  return { data: result as { customer: PublicCustomer | null } | null, error }
}

export async function createBooking(data: {
  tenant_id: string
  service_id: string
  customer_id: string
  barber_name?: string | null
  date: string
  time: string
}) {
  const { data: result, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'create_booking', ...data },
  })
  if (!error && result?.appointment) {
    supabase.functions
      .invoke('send-appointment-notification', {
        body: { appointment_id: result.appointment.id, type: 'confirmation' },
      })
      .then(({ data, error }: any) => {
        if (error) {
          console.error('[public-booking] Confirmation notification error:', error)
        } else if (data && !data.success && data.whatsapp?.error) {
          console.warn('[public-booking] Confirmation notification issue:', data.whatsapp.error)
        } else if (data && data.success) {
          console.log(
            '[public-booking] Confirmation notification sent successfully for:',
            result.appointment.id,
          )
        }
      })
      .catch((err: any) => {
        console.error('[public-booking] Failed to trigger confirmation notification:', String(err))
      })
  }
  return { data: result, error }
}

export function groupSlotsByPeriod(slots: TimeSlot[]): { period: string; slots: TimeSlot[] }[] {
  const parse = (s: TimeSlot) => parseInt(s.time.split(':')[0], 10)
  const groups = [
    { period: 'Manhã', slots: slots.filter((s) => parse(s) < 12) },
    { period: 'Tarde', slots: slots.filter((s) => parse(s) >= 12 && parse(s) < 18) },
    { period: 'Noite', slots: slots.filter((s) => parse(s) >= 18) },
  ]
  return groups.filter((g) => g.slots.length > 0)
}

export function calculateSlotsWithSchedules(
  appointments: SlotAppointment[],
  barberSchedules: PublicBarberSchedule[],
  selectedBarber: string | null,
  durationMinutes: number,
  date: Date,
  startHour = 8,
  endHour = 20,
): TimeSlot[] {
  const dayOfWeek = date.getDay()
  const now = new Date()
  const dateStr = formatLocalDateYYYYMMDD(date)
  const isToday = formatLocalDateYYYYMMDD(now) === dateStr

  const daySchedules = barberSchedules.filter((s) => s.day_of_week === dayOfWeek)
  const activeBarbers = [...new Set(daySchedules.map((s) => s.barber_name))].filter(Boolean)

  let effectiveStart = startHour
  let effectiveEnd = endHour

  daySchedules.forEach((s) => {
    const sH = parseInt(s.start_time.split(':')[0], 10)
    const eH = parseInt(s.end_time.split(':')[0], 10)
    if (!isNaN(sH) && sH < effectiveStart) effectiveStart = sH
    if (!isNaN(eH) && eH > effectiveEnd) effectiveEnd = eH
  })

  const activeAppointments = appointments.filter((a) => !a.status || a.status !== 'cancelled')

  const slots: TimeSlot[] = []
  const [year, month, day] = dateStr.split('-').map(Number)

  for (let hour = effectiveStart; hour < effectiveEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0)
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000)

      const windowEnd = new Date(year, month - 1, day, effectiveEnd, 0, 0, 0)
      if (slotEnd > windowEnd) {
        slots.push({ time: timeStr, available: false, reason: 'fora_horario' })
        continue
      }

      if (isToday && slotStart < now) {
        slots.push({ time: timeStr, available: false, reason: 'passado' })
        continue
      }

      const isBarberWorking = (barberName: string) => {
        const bSchedules = daySchedules.filter((s) => s.barber_name === barberName)
        return bSchedules.some((s) => {
          const [sH, sM] = s.start_time.split(':').map(Number)
          const [eH, eM] = s.end_time.split(':').map(Number)
          const workStart = new Date(year, month - 1, day, sH, sM, 0, 0)
          const workEnd = new Date(year, month - 1, day, eH, eM, 0, 0)
          return slotStart >= workStart && slotEnd <= workEnd
        })
      }

      const hasBarberConflict = (barberName: string) => {
        return activeAppointments.some((appt) => {
          if (appt.barber_name && appt.barber_name !== barberName) return false
          const aStart = new Date(appt.start_time)
          const aEnd = new Date(appt.end_time)
          return slotStart < aEnd && slotEnd > aStart
        })
      }

      if (selectedBarber && selectedBarber !== 'all' && selectedBarber !== 'Qualquer') {
        const working = isBarberWorking(selectedBarber)
        const conflict = hasBarberConflict(selectedBarber)
        slots.push({
          time: timeStr,
          available: working && !conflict,
          reason: !working ? 'fora_horario' : conflict ? 'ocupado' : undefined,
        })
      } else {
        if (activeBarbers.length === 0) {
          slots.push({ time: timeStr, available: false, reason: 'fora_horario' })
        } else {
          const availableBarber = activeBarbers.find(
            (bName) => isBarberWorking(bName) && !hasBarberConflict(bName),
          )
          slots.push({
            time: timeStr,
            available: !!availableBarber,
            reason: !availableBarber ? 'indisponivel' : undefined,
          })
        }
      }
    }
  }

  return slots
}
