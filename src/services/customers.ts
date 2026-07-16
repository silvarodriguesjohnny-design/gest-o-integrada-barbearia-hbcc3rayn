import { db } from './db'
import type { Customer, CustomerWithDetails, LoyaltyCard } from '@/types'

export async function getCustomers(): Promise<{ data: CustomerWithDetails[] | null; error: any }> {
  const [custRes, loyaltyRes, apptRes] = await Promise.all([
    db.from('customers').select('*').order('name'),
    db.from('loyalty_cards').select('*'),
    db.from('appointments').select('customer_id, status'),
  ])
  if (custRes.error) return { data: null, error: custRes.error }

  const loyaltyMap = new Map<string, LoyaltyCard>()
  for (const lc of loyaltyRes.data || []) {
    loyaltyMap.set(lc.customer_id, lc)
  }

  const visitMap = new Map<string, number>()
  for (const a of apptRes.data || []) {
    if (a.status === 'completed') {
      visitMap.set(a.customer_id, (visitMap.get(a.customer_id) || 0) + 1)
    }
  }

  const customers: CustomerWithDetails[] = (custRes.data || []).map((c: Customer) => ({
    ...c,
    loyalty_card: loyaltyMap.get(c.id) || null,
    visit_count: visitMap.get(c.id) || 0,
  }))

  return { data: customers, error: null }
}

export async function createCustomer(data: Partial<Customer>) {
  const { data: result, error } = await db.from('customers').insert(data).select('*').single()
  return { data: result as Customer | null, error }
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  const { data: result, error } = await db
    .from('customers')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  return { data: result as Customer | null, error }
}

export async function deleteCustomer(id: string) {
  const { error } = await db.from('customers').delete().eq('id', id)
  return { error }
}

export async function getInactiveCustomers() {
  const { data, error } = await db.from('inactive_customers').select('*')
  return { data, error }
}
