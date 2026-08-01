import { db } from './db'
import type { Product } from '@/types'

export async function getProducts(): Promise<{ data: Product[] | null; error: any }> {
  const { data, error } = await db.from('products').select('*').order('name')
  return { data: data as Product[] | null, error }
}

export async function createProduct(data: {
  name: string
  description?: string
  price: number
}): Promise<{ data: Product | null; error: any }> {
  const { data: result, error } = await db.from('products').insert(data).select('*').single()
  return { data: result as Product | null, error }
}
