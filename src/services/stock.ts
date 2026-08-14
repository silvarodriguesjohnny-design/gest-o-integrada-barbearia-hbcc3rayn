import { db } from './db'
import type { StockMovement, StockMovementType } from '@/types'

/**
 * Registra uma movimentação de estoque via RPC register_stock_movement.
 * A função no banco atualiza products.stock_quantity e insere o histórico
 * de forma atômica, respeitando as regras de permissão.
 */
export async function registerStockMovement(params: {
  product_id: string
  movement_type: StockMovementType
  quantity: number
  reason?: string
}): Promise<{ data: StockMovement | null; error: any }> {
  const { data, error } = await db.rpc('register_stock_movement', {
    p_product_id: params.product_id,
    p_movement_type: params.movement_type,
    p_quantity: params.quantity,
    p_reason: params.reason ?? 'Ajuste manual',
  })
  return { data: data as StockMovement | null, error }
}

/**
 * Baixa automática de estoque no PDV (Venda PDV).
 * Reduz stock_quantity em 1 e registra uma saída.
 */
export async function decrementStockOnSale(product_id: string): Promise<{ error: any }> {
  const { error } = await registerStockMovement({
    product_id,
    movement_type: 'saida',
    quantity: 1,
    reason: 'Venda PDV',
  })
  return { error }
}

/**
 * Histórico de movimentações de um produto, com o nome de quem fez.
 */
export async function getStockMovements(
  product_id: string,
): Promise<{ data: StockMovement[] | null; error: any }> {
  const { data, error } = await db
    .from('stock_movements')
    .select('*, created_by_profile:profiles!stock_movements_created_by_fkey(full_name)')
    .eq('product_id', product_id)
    .order('created_at', { ascending: false })
  if (error) return { data: null, error }
  const mapped = (data || []).map((m: any) => ({
    id: m.id,
    product_id: m.product_id,
    movement_type: m.movement_type,
    quantity: m.quantity,
    reason: m.reason,
    created_by: m.created_by,
    tenant_id: m.tenant_id,
    created_at: m.created_at,
    created_by_name: m.created_by_profile?.full_name ?? null,
  }))
  return { data: mapped as StockMovement[], error: null }
}
