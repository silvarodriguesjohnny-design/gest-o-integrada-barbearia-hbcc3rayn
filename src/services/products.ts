import { db } from './db'
import { publicSupabase } from '@/lib/supabase/public-client'
import type { Product } from '@/types'

export async function getProducts(): Promise<{ data: Product[] | null; error: any }> {
  const { data, error } = await db.from('products').select('*').order('name')
  return { data: data as Product[] | null, error }
}

export async function createProduct(data: {
  name: string
  description?: string
  price: number
  stock_quantity?: number
  min_stock?: number
  cost_price?: number | null
  image_url?: string | null
  category?: string
  active?: boolean
}): Promise<{ data: Product | null; error: any }> {
  const { data: result, error } = await db.from('products').insert(data).select('*').single()
  return { data: result as Product | null, error }
}

export async function updateProduct(
  id: string,
  data: Partial<
    Pick<
      Product,
      | 'name'
      | 'description'
      | 'price'
      | 'min_stock'
      | 'cost_price'
      | 'image_url'
      | 'category'
      | 'active'
    >
  >,
): Promise<{ data: Product | null; error: any }> {
  const { data: result, error } = await db
    .from('products')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  return { data: result as Product | null, error }
}

export async function deleteProduct(id: string): Promise<{ error: any }> {
  const { error } = await db.from('products').delete().eq('id', id)
  return { error }
}

/**
 * Lista os produtos ativos de uma barbearia para o fluxo público de carrinho
 * pós-agendamento. Usa o client público (anon) — a RLS permite leitura anônima.
 */
export async function getPublicProducts(
  tenantId: string,
): Promise<{ data: Product[] | null; error: any }> {
  const { data, error } = await publicSupabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('name')
  if (error) return { data: null, error }
  const products: Product[] = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price) || 0,
    tenant_id: row.tenant_id,
    created_at: row.created_at,
    image_url: row.image_url ?? null,
    category: row.category ?? 'Geral',
    active: !!row.active,
    updated_at: row.updated_at,
  }))
  return { data: products, error }
}
