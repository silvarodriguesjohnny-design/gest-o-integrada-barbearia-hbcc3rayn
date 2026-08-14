import { db } from './db'
import type { AppointmentWithRelations } from '@/types'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'

export interface AdminDashboardData {
  todayTotal: number
  todayConfirmed: number
  todayCompleted: number
  todayCancelled: number
  attendanceRate: number
  chart7Days: {
    date: string
    label: string
    confirmed: number
    completed: number
    cancelled: number
    scheduled: number
  }[]
  topServices: { name: string; value: number; fill: string }[]
  loyaltyReadyCount: number
  stampsThisMonth: number
  upcomingAppointments: AppointmentWithRelations[]
  pendingTenants: {
    id: string
    full_name: string
    nome_negocio: string
    email: string
    created_at: string
    cidade: string | null
    estado: string | null
  }[]
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export async function getAdminDashboardData(): Promise<{
  data: AdminDashboardData | null
  error: any
}> {
  const now = new Date()
  const todayStr = formatLocalDateYYYYMMDD(now)

  // 7-day window: from 6 days ago (start) through end of today, plus a margin
  const sixDaysAgo = new Date(now)
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysWindowStart = new Date(sixDaysAgo)
  sevenDaysWindowStart.setDate(sevenDaysWindowStart.getDate() - 1) // margin
  const sevenDaysWindowEnd = new Date(now)
  sevenDaysWindowEnd.setDate(sevenDaysWindowEnd.getDate() + 1) // margin
  // For "upcoming" appointments we want everything from now forward
  const upcomingWindowEnd = new Date(now)
  upcomingWindowEnd.setDate(upcomingWindowEnd.getDate() + 60)

  const [apptRes, loyaltyRes, pendingRes] = await Promise.all([
    db
      .from('appointments')
      .select(
        '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
      )
      .gte('start_time', sevenDaysWindowStart.toISOString())
      .lte('start_time', sevenDaysWindowEnd.toISOString())
      .order('start_time', { ascending: true }),
    db.from('loyalty_cards').select('*'),
    db
      .from('pending_tenants')
      .select('id, full_name, nome_negocio, email, created_at, cidade, estado, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (apptRes.error) return { data: null, error: apptRes.error }
  if (loyaltyRes.error) return { data: null, error: loyaltyRes.error }

  const allAppointments: AppointmentWithRelations[] = apptRes.data || []
  const loyaltyCards: any[] = loyaltyRes.data || []
  const pendingTenants: any[] = pendingRes.data || []

  // --- Today's metrics (filter by local date to avoid tz issues) ---
  const todays = allAppointments.filter((a) => formatLocalDateYYYYMMDD(a.start_time) === todayStr)
  const todayTotal = todays.length
  const todayConfirmed = todays.filter((a) => a.status === 'confirmed').length
  const todayCompleted = todays.filter((a) => a.status === 'completed').length
  const todayCancelled = todays.filter((a) => a.status === 'cancelled').length
  // Taxa de comparecimento: concluídos vs total de agendados hoje
  const attendanceRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  // --- 7-day chart: per-day counts by status ---
  const chart7Days: AdminDashboardData['chart7Days'] = []
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(now))
    d.setDate(d.getDate() - i)
    const dStr = formatLocalDateYYYYMMDD(d)
    const dayAppts = allAppointments.filter((a) => formatLocalDateYYYYMMDD(a.start_time) === dStr)
    chart7Days.push({
      date: dStr,
      label: WEEKDAY_LABELS[d.getDay()],
      confirmed: dayAppts.filter((a) => a.status === 'confirmed').length,
      completed: dayAppts.filter((a) => a.status === 'completed').length,
      cancelled: dayAppts.filter((a) => a.status === 'cancelled').length,
      scheduled: dayAppts.filter((a) => a.status === 'scheduled').length,
    })
  }

  // --- Top services (completed, all-time-ish within window) ---
  const svcCount: Record<string, number> = {}
  allAppointments
    .filter((a) => a.status === 'completed')
    .forEach((a) => {
      const name = a.service?.name || 'Outro'
      svcCount[name] = (svcCount[name] || 0) + 1
    })
  const topServices = Object.entries(svcCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], i) => ({
      name,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))

  // --- Loyalty summary ---
  const loyaltyReadyCount = loyaltyCards.filter((lc) => lc.is_reward_ready).length
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // loyalty_cards has no per-stamp timestamp; approximate stamps given this month
  // by counting cards created or updated this month. Use created_at as proxy.
  const stampsThisMonth = loyaltyCards
    .filter((lc) => new Date(lc.created_at) >= monthStart)
    .reduce((sum, lc) => sum + (lc.stamps_count || 0), 0)

  // --- Upcoming appointments (next 10 from now) ---
  const upcomingAppointments = allAppointments
    .filter((a) => new Date(a.start_time) >= now && a.status !== 'cancelled')
    .slice(0, 10)

  void upcomingWindowEnd

  return {
    data: {
      todayTotal,
      todayConfirmed,
      todayCompleted,
      todayCancelled,
      attendanceRate,
      chart7Days,
      topServices,
      loyaltyReadyCount,
      stampsThisMonth,
      upcomingAppointments,
      pendingTenants,
    },
    error: null,
  }
}
