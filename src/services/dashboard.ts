import { db } from './db'
import type { DashboardMetrics, AppointmentWithRelations } from '@/types'

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
]

export async function getDashboardMetrics(): Promise<{
  data: DashboardMetrics | null
  error: any
}> {
  const [txRes, apptRes, custRes, loyaltyRes] = await Promise.all([
    db.from('transactions').select('*'),
    db
      .from('appointments')
      .select(
        '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
      )
      .order('start_time', { ascending: false }),
    db.from('customers').select('*'),
    db.from('loyalty_cards').select('*'),
  ])

  if (txRes.error) return { data: null, error: txRes.error }

  const transactions = txRes.data || []
  const appointments: AppointmentWithRelations[] = apptRes.data || []
  const customers = custRes.data || []
  const loyaltyCards = loyaltyRes.data || []

  const income = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((s: number, t: any) => s + Number(t.amount), 0)
  const expense = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalRevenue = income - expense

  const completedAppts = appointments.filter((a: any) => a.status === 'completed')
  const ticketMedio = completedAppts.length > 0 ? income / completedAppts.length : 0

  const vipCount = loyaltyCards.filter((lc: any) => lc.stamps_count >= 10).length

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const inactiveCount = customers.filter((c: any) => {
    if (!c.last_visit_at) return new Date(c.created_at) < sixtyDaysAgo
    return new Date(c.last_visit_at) < sixtyDaysAgo
  }).length

  const inactivityLoss = inactiveCount * ticketMedio

  const revByDay: Record<string, number> = {}
  transactions
    .filter((t: any) => t.type === 'income')
    .forEach((t: any) => {
      const day = new Date(t.created_at).getDate().toString().padStart(2, '0')
      revByDay[day] = (revByDay[day] || 0) + Number(t.amount)
    })

  const svcCount: Record<string, number> = {}
  completedAppts.forEach((a: any) => {
    const name = a.service?.name || 'Outro'
    svcCount[name] = (svcCount[name] || 0) + 1
  })

  const metrics: DashboardMetrics = {
    totalRevenue,
    ticketMedio,
    vipCount,
    inactiveCount,
    inactivityLoss,
    revenueData: Object.entries(revByDay).map(([day, inc]) => ({ day, income: inc })),
    serviceData: Object.entries(svcCount).map(([name, value], i) => ({
      name,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    recentAppointments: appointments.slice(0, 5),
  }

  return { data: metrics, error: null }
}
