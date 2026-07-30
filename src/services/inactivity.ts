import { db } from './db'

export async function getInactivityAlert(tenantId: string) {
  const { data, error } = await db
    .from('inactivity_alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return { data, error }
}

export async function upsertInactivityAlert(
  tenantId: string,
  config: {
    days: number
    message: string
    channels: string[]
    active: boolean
  },
) {
  const existing = await db
    .from('inactivity_alerts')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (existing.data) {
    const { data, error } = await db
      .from('inactivity_alerts')
      .update(config)
      .eq('id', existing.data.id)
      .select()
      .single()
    return { data, error }
  }
  const { data, error } = await db
    .from('inactivity_alerts')
    .insert({ tenant_id: tenantId, ...config })
    .select()
    .single()
  return { data, error }
}
