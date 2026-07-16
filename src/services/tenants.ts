import { db } from './db'
import { supabase } from '@/lib/supabase/client'
import type { Tenant, PlanType } from '@/types'

export async function createTenant(data: {
  name: string
  owner_id: string
  plan_type: PlanType
}): Promise<{ data: Tenant | null; error: any }> {
  const { data: result, error } = await db.from('tenants').insert(data).select().single()
  return { data: result, error }
}

export async function updateTenant(
  id: string,
  data: { name?: string; logo_url?: string },
): Promise<{ error: any }> {
  const { error } = await db.from('tenants').update(data).eq('id', id)
  return { error }
}

export async function uploadLogo(
  tenantId: string,
  file: File,
): Promise<{ url: string | null; error: any }> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${tenantId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
