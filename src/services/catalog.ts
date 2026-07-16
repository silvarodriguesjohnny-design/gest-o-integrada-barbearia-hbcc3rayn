import { db } from './db'
import type { Service } from '@/types'

export async function getServices(): Promise<{ data: Service[] | null; error: any }> {
  const { data, error } = await db.from('services').select('*').order('name')
  return { data: data as Service[] | null, error }
}

export async function createService(data: Partial<Service>) {
  const { data: result, error } = await db.from('services').insert(data).select('*').single()
  return { data: result as Service | null, error }
}

export async function updateService(id: string, data: Partial<Service>) {
  const { data: result, error } = await db
    .from('services')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  return { data: result as Service | null, error }
}
