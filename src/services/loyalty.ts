import { db } from './db'
import type { LoyaltyCard } from '@/types'

export async function getLoyaltyCard(
  customerId: string,
): Promise<{ data: LoyaltyCard | null; error: any }> {
  const { data, error } = await db
    .from('loyalty_cards')
    .select('*')
    .eq('customer_id', customerId)
    .single()
  return { data: data as LoyaltyCard | null, error }
}

export async function redeemReward(customerId: string): Promise<{ error: any }> {
  const { error } = await db
    .from('loyalty_cards')
    .update({ stamps_count: 0, is_reward_ready: false })
    .eq('customer_id', customerId)
  return { error }
}
