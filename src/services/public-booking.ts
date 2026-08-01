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
  return { data: data as { appointments: SlotAppointment[]; barbers: string[] } | null, error }
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

export function groupSlotsByPeriod(slots: string[]): { period: string; slots: string[] }[] {
  const parse = (s: string) => parseInt(s.split(':')[0])
  const groups = [
    { period: 'Manhã', slots: slots.filter((s) => parse(s) < 12) },
    { period: 'Tarde', slots: slots.filter((s) => parse(s) >= 12 && parse(s) < 18) },
    { period: 'Noite', slots: slots.filter((s) => parse(s) >= 18) },
  ]
  return groups.filter((g) => g.slots.length > 0)
}
