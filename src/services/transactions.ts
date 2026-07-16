import { db } from './db'
import type { Transaction } from '@/types'

export async function getTransactions(): Promise<{ data: Transaction[] | null; error: any }> {
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data as Transaction[] | null, error }
}

export async function createTransaction(data: {
  type: 'income' | 'expense'
  amount: number
  description: string
  category?: string
  payment_method?: string
  customer_id?: string | null
}): Promise<{ data: Transaction | null; error: any }> {
  const { data: result, error } = await db.from('transactions').insert(data).select('*').single()
  return { data: result as Transaction | null, error }
}
