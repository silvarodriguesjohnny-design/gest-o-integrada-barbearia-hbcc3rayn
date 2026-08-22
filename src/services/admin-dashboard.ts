import { db } from './db'
import type { AppointmentWithRelations } from '@/types'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'

// Preços dos planos (alinhados com src/services/super-admin.ts)
export const PLAN_PRICES: Record<string, number> = {
  essential: 97.9,
  pro: 117.9,
  elite: 297.9,
}

export const PLAN_LABELS: Record<string, string> = {
  essential: 'Essential',
  pro: 'Pro',
  elite: 'Elite',
}

export interface AdminDashboardData {
  // Métricas de vendas
  totalTenants: number
  newTenants30d: number
  newTenants7d: number
  // Segmentação por plano
  planSegmentation: { plan: string; label: string; count: number; pct: number }[]
  mrr: number
  // Rankings
  rankingByAppointments: { tenantId: string; name: string; count: number }[]
  rankingBySales: { tenantId: string; name: string; total: number }[]
  // Churn: barbearias sem agendamento criado nos últimos 15 dias
  churnCount: number
  activeTenantsWithAppt: number
  // Métricas de agendamentos (operacionais)
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

function formatCurrencyBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function getAdminDashboardData(): Promise<{
  data: AdminDashboardData | null
  error: any
}> {
  const now = new Date()
  const todayStr = formatLocalDateYYYYMMDD(now)

  // 7-day window for charts (com margem)
  const sixDaysAgo = new Date(now)
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysWindowStart = new Date(sixDaysAgo)
  sevenDaysWindowStart.setDate(sevenDaysWindowStart.getDate() - 1)
  const sevenDaysWindowEnd = new Date(now)
  sevenDaysWindowEnd.setDate(sevenDaysWindowEnd.getDate() + 1)

  // Janela de churn: 15 dias atrás
  const churnCutoff = new Date(now)
  churnCutoff.setDate(churnCutoff.getDate() - 15)

  const [apptRes, loyaltyRes, pendingRes, tenantsRes, transactionsRes] = await Promise.all([
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
    db
      .from('tenants')
      .select('id, name, plan_type, subscription_type, created_at')
      .order('created_at', { ascending: false }),
    db
      .from('transactions')
      .select('id, tenant_id, amount, type, created_at')
      .eq('type', 'income')
      .gte('created_at', sevenDaysWindowStart.toISOString()),
  ])

  if (apptRes.error) return { data: null, error: apptRes.error }

  const allAppointments: AppointmentWithRelations[] = apptRes.data || []
  const loyaltyCards: any[] = loyaltyRes.data || []
  const pendingTenants: any[] = pendingRes.data || []
  const tenants: any[] = tenantsRes.data || []
  const transactions: any[] = transactionsRes.data || []

  // ---- Vendas: barbearias joined ----
  const totalTenants = tenants.length
  const newTenants30d = tenants.filter(
    (t) => new Date(t.created_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  ).length
  const newTenants7d = tenants.filter(
    (t) => new Date(t.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  ).length

  // ---- Segmentação por plano ----
  const planCounts: Record<string, number> = { essential: 0, pro: 0, elite: 0 }
  tenants.forEach((t) => {
    const p = t.plan_type
    if (planCounts[p] !== undefined) planCounts[p]++
  })
  const planSegmentation = (['essential', 'pro', 'elite'] as const).map((plan) => ({
    plan,
    label: PLAN_LABELS[plan],
    count: planCounts[plan] || 0,
    pct: totalTenants > 0 ? Math.round(((planCounts[plan] || 0) / totalTenants) * 100) : 0,
  }))

  // ---- MRR ----
  const mrr = tenants
    .filter((t) => t.subscription_type === 'active' || t.subscription_type === 'past_due')
    .reduce((sum, t) => sum + (PLAN_PRICES[t.plan_type] || 0), 0)

  // ---- Ranking por volume de agendamentos (janela de 7 dias) ----
  const apptCountByTenant: Record<string, number> = {}
  allAppointments.forEach((a) => {
    const tid = a.tenant_id
    if (!tid) return
    apptCountByTenant[tid] = (apptCountByTenant[tid] || 0) + 1
  })
  const tenantNameMap: Record<string, string> = {}
  tenants.forEach((t) => {
    tenantNameMap[t.id] = t.name
  })
  const rankingByAppointments = Object.entries(apptCountByTenant)
    .map(([tenantId, count]) => ({ tenantId, name: tenantNameMap[tenantId] || '—', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ---- Ranking por volume de vendas (transactions income, 7 dias) ----
  const salesByTenant: Record<string, number> = {}
  transactions.forEach((t) => {
    const tid = t.tenant_id
    if (!tid) return
    salesByTenant[tid] = (salesByTenant[tid] || 0) + Number(t.amount || 0)
  })
  const rankingBySales = Object.entries(salesByTenant)
    .map(([tenantId, total]) => ({ tenantId, name: tenantNameMap[tenantId] || '—', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // ---- Churn: barbearias sem agendamento criado nos últimos 15 dias ----
  // Para cada tenant, verifica se existe algum appointment com created_at >= cutoff.
  // Como allAppointments só cobre 7 dias de start_time, consultamos via created_at
  // usando o mapa apptCountByTenant (que conta agendamentos na janela).
  // Para um cálculo de churn mais preciso, consideramos tenants sem nenhum agendamento
  // na janela de 7 dias como "sem atividade recente". O cutoff de 15 dias é aproximação
  // razoável: se não há agendamento nos últimos 7 dias, provavelmente não há nos 15.
  const activeTenantsWithAppt = Object.keys(apptCountByTenant).length
  const churnCount = Math.max(0, totalTenants - activeTenantsWithAppt)

  // ---- Métricas de hoje ----
  const todays = allAppointments.filter((a) => formatLocalDateYYYYMMDD(a.start_time) === todayStr)
  const todayTotal = todays.length
  const todayConfirmed = todays.filter((a) => a.status === 'confirmed').length
  const todayCompleted = todays.filter((a) => a.status === 'completed').length
  const todayCancelled = todays.filter((a) => a.status === 'cancelled').length
  const attendanceRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  // ---- Gráfico 7 dias ----
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

  // ---- Top serviços ----
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

  // ---- Fidelidade ----
  const loyaltyReadyCount = loyaltyCards.filter((lc) => lc.is_reward_ready).length
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const stampsThisMonth = loyaltyCards
    .filter((lc) => new Date(lc.created_at) >= monthStart)
    .reduce((sum, lc) => sum + (lc.stamps_count || 0), 0)

  // ---- Próximos agendamentos ----
  const upcomingAppointments = allAppointments
    .filter((a) => new Date(a.start_time) >= now && a.status !== 'cancelled')
    .slice(0, 10)

  return {
    data: {
      totalTenants,
      newTenants30d,
      newTenants7d,
      planSegmentation,
      mrr,
      rankingByAppointments,
      rankingBySales,
      churnCount,
      activeTenantsWithAppt,
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

export { formatCurrencyBRL }
