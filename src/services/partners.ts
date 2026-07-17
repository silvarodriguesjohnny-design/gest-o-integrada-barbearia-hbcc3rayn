import { db } from './db'
import type { Partner } from '@/types'

export async function getPartners(): Promise<{ data: Partner[] | null; error: any }> {
  const { data, error } = await db
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data as Partner[] | null, error }
}

export async function createPartner(data: {
  name: string
  discount_percentage: number
}): Promise<{ data: Partner | null; error: any }> {
  const { data: result, error } = await db.from('partners').insert(data).select('*').single()
  return { data: result as Partner | null, error }
}

export async function updatePartner(
  id: string,
  data: Partial<Partner>,
): Promise<{ data: Partner | null; error: any }> {
  const { data: result, error } = await db
    .from('partners')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  return { data: result as Partner | null, error }
}

export async function deletePartner(id: string): Promise<{ error: any }> {
  const { error } = await db.from('partners').delete().eq('id', id)
  return { error }
}
