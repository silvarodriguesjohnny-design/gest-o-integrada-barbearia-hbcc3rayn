import { supabase } from '@/lib/supabase/client'

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
}

export interface TimeSlot {
  time: string
  available: boolean
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
      .catch(() => {})
  }
  return { data: result, error }
}

export function calculateAvailableSlots(
  appointments: SlotAppointment[],
  durationMinutes: number,
  date: Date,
  startHour = 9,
  endHour = 20,
): string[] {
  const slots: string[] = []
  const dayStart = new Date(date)
  dayStart.setHours(startHour, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(endHour, 0, 0, 0)

  let current = new Date(dayStart)
  while (current < dayEnd) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000)
    if (slotEnd > dayEnd) break

    const conflict = appointments.some((appt) => {
      const apptStart = new Date(appt.start_time)
      const apptEnd = new Date(appt.end_time)
      return current < apptEnd && slotEnd > apptStart
    })

    if (!conflict) slots.push(current.toTimeString().slice(0, 5))
    current = new Date(current.getTime() + 30 * 60000)
  }
  return slots
}

export function calculateAvailableSlotsForBarber(
  appointments: SlotAppointment[],
  barberName: string | null,
  durationMinutes: number,
  date: Date,
): string[] {
  const filtered = barberName
    ? appointments.filter((a) => a.barber_name === barberName)
    : appointments
  return calculateAvailableSlots(filtered, durationMinutes, date)
}

export function calculateAllSlots(
  appointments: SlotAppointment[],
  durationMinutes: number,
  date: Date,
  startHour = 9,
  endHour = 20,
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const dayStart = new Date(date)
  dayStart.setHours(startHour, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(endHour, 0, 0, 0)

  let current = new Date(dayStart)
  while (current < dayEnd) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000)
    if (slotEnd > dayEnd) break

    const conflict = appointments.some((appt) => {
      const apptStart = new Date(appt.start_time)
      const apptEnd = new Date(appt.end_time)
      return current < apptEnd && slotEnd > apptStart
    })

    slots.push({
      time: current.toTimeString().slice(0, 5),
      available: !conflict,
    })
    current = new Date(current.getTime() + 30 * 60000)
  }
  return slots
}

export function calculateAllSlotsForBarber(
  appointments: SlotAppointment[],
  barberName: string | null,
  durationMinutes: number,
  date: Date,
): TimeSlot[] {
  const filtered = barberName
    ? appointments.filter((a) => a.barber_name === barberName)
    : appointments
  return calculateAllSlots(filtered, durationMinutes, date)
}

export function groupSlotsByPeriod(slots: TimeSlot[]): { period: string; slots: TimeSlot[] }[] {
  const parse = (s: TimeSlot) => parseInt(s.time.split(':')[0])
  const groups = [
    { period: 'Manhã', slots: slots.filter((s) => parse(s) < 12) },
    { period: 'Tarde', slots: slots.filter((s) => parse(s) >= 12 && parse(s) < 18) },
    { period: 'Noite', slots: slots.filter((s) => parse(s) >= 18) },
  ]
  return groups.filter((g) => g.slots.length > 0)
}

function mergeTimeRanges(
  ranges: { start: string; end: string }[],
): { start: string; end: string }[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start))
  const merged = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end
    } else {
      merged.push({ ...sorted[i] })
    }
  }
  return merged
}

export function calculateSlotsWithSchedules(
  appointments: SlotAppointment[],
  barberSchedules: PublicBarberSchedule[],
  selectedBarber: string | null,
  durationMinutes: number,
  date: Date,
): TimeSlot[] {
  const dayOfWeek = date.getDay()
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const buildSlots = (
    ranges: { start: string; end: string }[],
    checkConflict: (current: Date, slotEnd: Date) => boolean,
  ): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (const range of ranges) {
      const [sH, sM] = range.start.split(':').map(Number)
      const [eH, eM] = range.end.split(':').map(Number)
      const current = new Date(date)
      current.setHours(sH, sM, 0, 0)
      const rangeEnd = new Date(date)
      rangeEnd.setHours(eH, eM, 0, 0)

      while (current < rangeEnd) {
        const slotEnd = new Date(current.getTime() + durationMinutes * 60000)
        if (slotEnd > rangeEnd) break
        const conflict = checkConflict(current, slotEnd)
        const isPast = isToday && current < now
        slots.push({
          time: current.toTimeString().slice(0, 5),
          available: !conflict && !isPast,
        })
        current.setTime(current.getTime() + 30 * 60000)
      }
    }
    return slots
  }

  if (selectedBarber) {
    const ranges = barberSchedules
      .filter((s) => s.barber_name === selectedBarber && s.day_of_week === dayOfWeek)
      .map((s) => ({ start: s.start_time, end: s.end_time }))
    if (ranges.length === 0) return []
    const barberAppts = appointments.filter((a) => a.barber_name === selectedBarber)
    return buildSlots(ranges, (current, slotEnd) =>
      barberAppts.some((appt) => {
        const aS = new Date(appt.start_time)
        const aE = new Date(appt.end_time)
        return current < aE && slotEnd > aS
      }),
    )
  }

  const daySchedules = barberSchedules.filter((s) => s.day_of_week === dayOfWeek)
  if (daySchedules.length === 0) return []
  const barbersWithSchedule = [...new Set(daySchedules.map((s) => s.barber_name))]
  const merged = mergeTimeRanges(
    daySchedules.map((s) => ({ start: s.start_time, end: s.end_time })),
  )

  return buildSlots(merged, (current, slotEnd) =>
    barbersWithSchedule.every((barberName) => {
      const barberRanges = daySchedules
        .filter((s) => s.barber_name === barberName)
        .map((s) => ({ start: s.start_time, end: s.end_time }))
      const worksNow = barberRanges.some((r) => {
        const [bsH, bsM] = r.start.split(':').map(Number)
        const [beH, beM] = r.end.split(':').map(Number)
        const wS = new Date(date)
        wS.setHours(bsH, bsM, 0, 0)
        const wE = new Date(date)
        wE.setHours(beH, beM, 0, 0)
        return current >= wS && slotEnd <= wE
      })
      if (!worksNow) return true
      return appointments.some((appt) => {
        if (appt.barber_name !== barberName) return false
        const aS = new Date(appt.start_time)
        const aE = new Date(appt.end_time)
        return current < aE && slotEnd > aS
      })
    }),
  )
}
