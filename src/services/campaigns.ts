import { db } from './db'
import type { Campaign } from '@/types'

export async function getCampaigns(): Promise<{ data: Campaign[] | null; error: any }> {
  const { data, error } = await db
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data as Campaign[] | null, error }
}

export async function createCampaign(data: Partial<Campaign>) {
  const { data: result, error } = await db.from('campaigns').insert(data).select('*').single()
  return { data: result as Campaign | null, error }
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  const { data: result, error } = await db
    .from('campaigns')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  return { data: result as Campaign | null, error }
}

export async function toggleCampaign(id: string, isActive: boolean) {
  return updateCampaign(id, { is_active: isActive })
}
