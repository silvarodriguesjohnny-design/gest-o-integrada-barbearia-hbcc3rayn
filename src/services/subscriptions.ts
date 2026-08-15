import { db } from './db'
import { supabase } from '@/lib/supabase/client'
import type { SubscriptionPlan, Subscription } from '@/types'
import type { Json } from '@/lib/supabase/types'

function normalizeServicesIncluded(raw: Json | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  return []
}

function mapPlan(row: any): SubscriptionPlan {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description,
    services_included: normalizeServicesIncluded(row.services_included),
    price: Number(row.price) || 0,
    prepaid_discount_pct: Number(row.prepaid_discount_pct) || 0,
    prepaid_months: Number(row.prepaid_months) || 0,
    prepaid_price: Number(row.prepaid_price) || 0,
    active: !!row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listSubscriptionPlans(tenantId: string): Promise<SubscriptionPlan[]> {
  const { data, error } = await db
    .from('subscription_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapPlan)
}

export async function listActiveSubscriptionPlans(tenantId: string): Promise<SubscriptionPlan[]> {
  const { data, error } = await db
    .from('subscription_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('price', { ascending: true })
  if (error) throw error
  return (data || []).map(mapPlan)
}

export async function createSubscriptionPlan(
  tenantId: string,
  input: {
    name: string
    description?: string | null
    services_included: string[]
    price: number
    prepaid_discount_pct: number
    prepaid_months: number
    prepaid_price: number
    active?: boolean
  },
): Promise<SubscriptionPlan> {
  const { data, error } = await db
    .from('subscription_plans')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description ?? null,
      services_included: input.services_included,
      price: input.price,
      prepaid_discount_pct: input.prepaid_discount_pct,
      prepaid_months: input.prepaid_months,
      prepaid_price: input.prepaid_price,
      active: input.active ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return mapPlan(data)
}

export async function updateSubscriptionPlan(
  id: string,
  input: Partial<{
    name: string
    description: string | null
    services_included: string[]
    price: number
    prepaid_discount_pct: number
    prepaid_months: number
    prepaid_price: number
    active: boolean
  }>,
): Promise<SubscriptionPlan> {
  const { data, error } = await db
    .from('subscription_plans')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapPlan(data)
}

export async function toggleSubscriptionPlanActive(id: string, active: boolean): Promise<void> {
  const { error } = await db.from('subscription_plans').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  const { error } = await db.from('subscription_plans').delete().eq('id', id)
  if (error) throw error
}

export function calcPrepaidPrice(price: number, months: number, discountPct: number): number {
  if (months <= 0) return 0
  const raw = price * months * (1 - (discountPct || 0) / 100)
  return Math.round(raw * 100) / 100
}

// --- Assinaturas (cliente) ---

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    client_id: row.client_id,
    tenant_id: row.tenant_id,
    plan_id: row.plan_id,
    stripe_subscription_id: row.stripe_subscription_id,
    stripe_customer_id: row.stripe_customer_id,
    status: row.status,
    payment_type: row.payment_type,
    start_date: row.start_date,
    end_date: row.end_date,
    amount_paid: Number(row.amount_paid) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listSubscriptionsByTenant(tenantId: string): Promise<Subscription[]> {
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapSubscription)
}

export async function listSubscriptionsByClient(clientId: string): Promise<Subscription[]> {
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapSubscription)
}

export async function getActiveClientSubscription(
  clientId: string,
  tenantId: string,
): Promise<Subscription | null> {
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'suspended'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapSubscription(data) : null
}

export async function hasActiveSubscription(clientId: string, tenantId: string): Promise<boolean> {
  const sub = await getActiveClientSubscription(clientId, tenantId)
  return sub?.status === 'active'
}

// --- Stripe checkout ---

export async function createStripeCheckoutSession(input: {
  plan_id: string
  client_id: string
  payment_type: 'monthly' | 'prepaid'
  success_url?: string
  cancel_url?: string
}): Promise<{ checkout_url: string; session_id: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: input,
  })
  if (error) throw error
  if (!data?.checkout_url) throw new Error('Falha ao criar sessão de pagamento.')
  return { checkout_url: data.checkout_url, session_id: data.session_id }
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('stripe-cancel-subscription', {
    body: { subscription_id: subscriptionId },
  })
  if (error) throw error
}
