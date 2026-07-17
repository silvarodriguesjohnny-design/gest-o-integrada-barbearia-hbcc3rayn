import { db } from './db'

const PLAN_PRICES: Record<string, number> = {
  essential: 97.9,
  pro: 117.9,
  elite: 297.9,
}

export async function getAllTenants(): Promise<{ data: any[] | null; error: any }> {
  const { data: tenants, error } = await db
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: null, error }

  const { data: profiles } = await db
    .from('profiles')
    .select('id, tenant_id, role, email, full_name')

  const tenantsWithStats = (tenants || []).map((t: any) => {
    const tenantProfiles = (profiles || []).filter((p: any) => p.tenant_id === t.id)
    const ownerProfile = (profiles || []).find((p: any) => p.id === t.owner_id)
    return {
      ...t,
      owner_email: ownerProfile?.email || 'N/A',
      owner_name: ownerProfile?.full_name || 'N/A',
      barber_count: tenantProfiles.filter((p: any) => p.role === 'operator' || p.role === 'admin')
        .length,
      user_count: tenantProfiles.length,
      mrr: PLAN_PRICES[t.plan_type] || 0,
    }
  })

  return { data: tenantsWithStats, error: null }
}

export function calculateMRR(tenants: any[]): number {
  return tenants
    .filter((t) => t.subscription_type === 'active' || t.subscription_type === 'past_due')
    .reduce((sum, t) => sum + (PLAN_PRICES[t.plan_type] || 0), 0)
}
