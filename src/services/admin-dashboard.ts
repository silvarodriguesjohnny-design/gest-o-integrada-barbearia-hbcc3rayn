import { db } from './db'

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

export interface PlanSegmentationItem {
  plan: 'essential' | 'pro' | 'elite'
  label: string
  count: number
  pct: number
}

export interface AdminDashboardData {
  // Volume de vendas (novas barbearias cadastradas)
  totalTenants: number
  newTenants30d: number
  newTenants7d: number
  // Segmentação por plano
  planSegmentation: PlanSegmentationItem[]
  // Rankings (7 dias)
  rankingByAppointments: { name: string; count: number }[]
  rankingBySales: { name: string; total: number }[]
  // Churn (15 dias)
  churnCount: number
  activeTenantsWithAppt: number
}

function formatCurrencyBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function getAdminDashboardData(): Promise<{
  data: AdminDashboardData | null
  error: any
}> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [tenantsRes, appt7dRes, sales7dRes, appt15dRes] = await Promise.all([
    db
      .from('tenants')
      .select('id, name, plan_type, created_at')
      .order('created_at', { ascending: false }),
    // Agendamentos criados nos últimos 7 dias (para ranking por volume)
    db.from('appointments').select('id, tenant_id').gte('created_at', sevenDaysAgo.toISOString()),
    // Faturamento (transactions income) dos últimos 7 dias (para ranking de vendas)
    db
      .from('transactions')
      .select('id, tenant_id, amount, type, created_at')
      .eq('type', 'income')
      .gte('created_at', sevenDaysAgo.toISOString()),
    // Agendamentos criados nos últimos 15 dias (para cálculo de churn)
    db.from('appointments').select('id, tenant_id').gte('created_at', fifteenDaysAgo.toISOString()),
  ])

  if (tenantsRes.error) return { data: null, error: tenantsRes.error }
  if (appt7dRes.error) return { data: null, error: appt7dRes.error }
  if (sales7dRes.error) return { data: null, error: sales7dRes.error }
  if (appt15dRes.error) return { data: null, error: appt15dRes.error }

  const tenants: any[] = tenantsRes.data || []
  const appt7d: any[] = appt7dRes.data || []
  const sales7d: any[] = sales7dRes.data || []
  const appt15d: any[] = appt15dRes.data || []

  const tenantNameMap: Record<string, string> = {}
  tenants.forEach((t) => {
    tenantNameMap[t.id] = t.name
  })

  // ---- Volume de vendas: barbearias cadastradas ----
  const totalTenants = tenants.length
  const newTenants30d = tenants.filter((t) => new Date(t.created_at) >= thirtyDaysAgo).length
  const newTenants7d = tenants.filter((t) => new Date(t.created_at) >= sevenDaysAgo).length

  // ---- Segmentação por plano ----
  const planCounts: Record<string, number> = { essential: 0, pro: 0, elite: 0 }
  tenants.forEach((t) => {
    const p = t.plan_type
    if (planCounts[p] !== undefined) planCounts[p]++
  })
  const planSegmentation: PlanSegmentationItem[] = (['essential', 'pro', 'elite'] as const).map(
    (plan) => ({
      plan,
      label: PLAN_LABELS[plan],
      count: planCounts[plan] || 0,
      pct: totalTenants > 0 ? Math.round(((planCounts[plan] || 0) / totalTenants) * 100) : 0,
    }),
  )

  // ---- Ranking por volume de agendamentos (janela de 7 dias) ----
  const apptCountByTenant: Record<string, number> = {}
  appt7d.forEach((a) => {
    const tid = a.tenant_id
    if (!tid) return
    apptCountByTenant[tid] = (apptCountByTenant[tid] || 0) + 1
  })
  const rankingByAppointments = Object.entries(apptCountByTenant)
    .map(([tenantId, count]) => ({ name: tenantNameMap[tenantId] || '—', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ---- Ranking por volume de vendas (soma de transactions.amount, 7 dias) ----
  const salesByTenant: Record<string, number> = {}
  sales7d.forEach((t) => {
    const tid = t.tenant_id
    if (!tid) return
    salesByTenant[tid] = (salesByTenant[tid] || 0) + Number(t.amount || 0)
  })
  const rankingBySales = Object.entries(salesByTenant)
    .map(([tenantId, total]) => ({ name: tenantNameMap[tenantId] || '—', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // ---- Churn: barbearias sem NENHUM agendamento nos últimos 15 dias ----
  const activeTenantIds15d = new Set(appt15d.map((a) => a.tenant_id).filter(Boolean))
  const activeTenantsWithAppt = activeTenantIds15d.size
  const churnCount = Math.max(0, totalTenants - activeTenantsWithAppt)

  return {
    data: {
      totalTenants,
      newTenants30d,
      newTenants7d,
      planSegmentation,
      rankingByAppointments,
      rankingBySales,
      churnCount,
      activeTenantsWithAppt,
    },
    error: null,
  }
}

export { formatCurrencyBRL }
