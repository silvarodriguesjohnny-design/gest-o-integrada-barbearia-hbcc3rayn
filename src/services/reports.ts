import { db } from './db'
import type { AppointmentStatus } from '@/types'

export interface ReportAppointment {
  id: string
  start_time: string
  status: AppointmentStatus
  barber_name: string | null
  tenant_id: string | null
  tenant_name: string
  customer_name: string
  customer_phone: string | null
  service_name: string
  service_price: number
}

export interface ReportTenant {
  id: string
  name: string
}

export interface ReportService {
  id: string
  name: string
}

export interface ReportFilters {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  tenantId: string | 'all'
  status: AppointmentStatus | 'all'
  serviceId: string | 'all'
}

export interface ReportSummary {
  totalAppointments: number
  totalCompleted: number
  attendanceRate: number
  totalRevenue: number
  averageTicket: number
  topServiceName: string
}

export interface BillingRow {
  tenantName: string
  monthYear: string
  totalAppointments: number
  completed: number
  attendanceRate: number
  revenue: number
  averageTicket: number
}

/**
 * Fetch appointments joined with customers, services and tenants, filtered by
 * the report filters. Runs as the authenticated admin (RLS-enforced).
 */
export async function fetchReportAppointments(
  filters: ReportFilters,
): Promise<{ data: ReportAppointment[] | null; error: any }> {
  const startIso = `${filters.startDate}T00:00:00`
  const endIso = `${filters.endDate}T23:59:59`

  let query = db
    .from('appointments')
    .select(
      'id, start_time, status, barber_name, tenant_id, tenant:tenants(name), customer:customers(name, phone), service:services(name, price)',
    )
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .order('start_time', { ascending: true })

  if (filters.tenantId !== 'all') query = query.eq('tenant_id', filters.tenantId)
  if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.serviceId !== 'all') query = query.eq('service_id', filters.serviceId)

  const { data, error } = await query
  if (error) return { data: null, error }

  const rows: ReportAppointment[] = (data || []).map((a: any) => ({
    id: a.id,
    start_time: a.start_time,
    status: a.status,
    barber_name: a.barber_name,
    tenant_id: a.tenant_id,
    tenant_name: a.tenant?.name || '—',
    customer_name: a.customer?.name || '—',
    customer_phone: a.customer?.phone || null,
    service_name: a.service?.name || '—',
    service_price: Number(a.service?.price ?? 0),
  }))

  return { data: rows, error: null }
}

export async function fetchReportTenants(): Promise<{
  data: ReportTenant[] | null
  error: any
}> {
  const { data, error } = await db
    .from('tenants')
    .select('id, name')
    .order('name', { ascending: true })
  return { data: data || [], error }
}

export async function fetchReportServices(tenantId?: string): Promise<{
  data: ReportService[] | null
  error: any
}> {
  let query = db.from('services').select('id, name').order('name', { ascending: true })
  if (tenantId && tenantId !== 'all') query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  return { data: data || [], error }
}

export function computeSummary(appointments: ReportAppointment[]): ReportSummary {
  const totalAppointments = appointments.length
  const completed = appointments.filter((a) => a.status === 'completed')
  const totalCompleted = completed.length
  const attendanceRate =
    totalAppointments > 0 ? Math.round((totalCompleted / totalAppointments) * 100) : 0
  const totalRevenue = completed.reduce((sum, a) => sum + (a.service_price || 0), 0)
  const averageTicket = totalCompleted > 0 ? totalRevenue / totalCompleted : 0

  const svcCount: Record<string, number> = {}
  completed.forEach((a) => {
    const name = a.service_name || 'Outro'
    svcCount[name] = (svcCount[name] || 0) + 1
  })
  const topServiceName = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  return {
    totalAppointments,
    totalCompleted,
    attendanceRate,
    totalRevenue,
    averageTicket,
    topServiceName,
  }
}

export function computeBilling(appointments: ReportAppointment[]): BillingRow[] {
  const groups: Record<string, ReportAppointment[]> = {}
  appointments.forEach((a) => {
    const d = new Date(a.start_time)
    const monthYear = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const key = `${a.tenant_name}__${monthYear}`
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  })

  return Object.entries(groups)
    .map(([key, items]) => {
      const [tenantName, monthYear] = key.split('__')
      const totalAppointments = items.length
      const completedItems = items.filter((a) => a.status === 'completed')
      const completed = completedItems.length
      const attendanceRate =
        totalAppointments > 0 ? Math.round((completed / totalAppointments) * 100) : 0
      const revenue = completedItems.reduce((sum, a) => sum + (a.service_price || 0), 0)
      const averageTicket = completed > 0 ? revenue / completed : 0
      return {
        tenantName,
        monthYear,
        totalAppointments,
        completed,
        attendanceRate,
        revenue,
        averageTicket,
      }
    })
    .sort((a, b) => {
      if (a.tenantName === b.tenantName) {
        return a.monthYear.localeCompare(b.monthYear)
      }
      return a.tenantName.localeCompare(b.tenantName)
    })
}
