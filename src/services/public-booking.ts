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

export interface SlotAppointment {
  start_time: string
  end_time: string
}

export async function getTenantData(slug: string) {
  const { data, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'get_tenant', slug },
  })
  return { data: data as { tenant: PublicTenant; services: PublicService[] } | null, error }
}

export async function getSlots(slug: string, date: string) {
  const { data, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'get_slots', slug, date },
  })
  return { data: data as { appointments: SlotAppointment[] } | null, error }
}

export async function createBooking(data: {
  slug: string
  service_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  date: string
  time: string
}) {
  const { data: result, error } = await supabase.functions.invoke('public-booking', {
    body: { action: 'create_booking', ...data },
  })
  return { data: result, error }
}

export function calculateAvailableSlots(
  appointments: SlotAppointment[],
  durationMinutes: number,
  date: Date,
  startHour = 9,
  endHour = 18,
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

    if (!conflict) {
      slots.push(current.toTimeString().slice(0, 5))
    }
    current = new Date(current.getTime() + 30 * 60000)
  }
  return slots
}
