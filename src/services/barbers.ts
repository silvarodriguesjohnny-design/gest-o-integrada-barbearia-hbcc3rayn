import { db } from './db'
import type { Barber } from '@/types'

export async function getBarbers(): Promise<{ data: Barber[] | null; error: any }> {
  const { data, error } = await db.from('barbers').select('*').order('name')
  return { data: data as Barber[] | null, error }
}

export async function createBarber(name: string): Promise<{ data: Barber | null; error: any }> {
  const { data, error } = await db.from('barbers').insert({ name }).select('*').single()
  return { data: data as Barber | null, error }
}

export async function updateBarber(
  id: string,
  name: string,
): Promise<{ data: Barber | null; error: any }> {
  const { data, error } = await db
    .from('barbers')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single()
  return { data: data as Barber | null, error }
}

export async function deleteBarber(id: string): Promise<{ error: any }> {
  const { error } = await db.from('barbers').delete().eq('id', id)
  return { error }
}
