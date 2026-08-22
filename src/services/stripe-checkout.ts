import { supabase } from '@/lib/supabase/client'

/**
 * Serviço para os 3 cenários de checkout Stripe.
 *
 * Cenário 1 — SaaS: barbearia assinando a plataforma (trial 30 dias).
 * Cenário 2 — Agendamento: cliente final pagando por um agendamento.
 * Cenário 3 — Assinatura: cliente final assinando plano recorrente.
 *
 * As edge functions sempre derivam o tenant_id do JWT autenticado (SaaS) ou do
 * appointment/plano (fluxos públicos) — nunca do body.
 */

export interface SaaSCheckoutInput {
  price_id: string
  plan_type?: 'essential' | 'pro' | 'elite'
  tenant_slug?: string
  success_url?: string
  cancel_url?: string
}

export interface AppointmentCheckoutInput {
  appointment_id: string
  amount: number // em centavos
  customer_name?: string
  customer_email?: string
  success_url?: string
  cancel_url?: string
}

export interface SubscriptionCheckoutInput {
  plan_id: string
  client_cpf: string
  client_name?: string
  client_email?: string
  success_url?: string
  cancel_url?: string
}

/**
 * Cenário 1 — SaaS: barbearia assinando a plataforma (trial de 30 dias).
 * Cartão é coletado no trial (payment_method_collection: 'always').
 */
export async function startSaaSCheckout(
  input: SaaSCheckoutInput,
): Promise<{ data: { url: string; session_id: string } | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      scenario: 'saas',
      price_id: input.price_id,
      plan_type: input.plan_type,
      tenant_slug: input.tenant_slug,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    },
  })
  return { data, error }
}

/**
 * Cenário 2 — Agendamento: cliente final pagando por um agendamento.
 * O agendamento deve ter sido salvo ANTES com status 'pending_payment'.
 *
 * Se o tenant tiver Stripe Connect ativo: application_fee de 2% e
 * transfer_data.destination = stripe_account_id do tenant.
 * Caso contrário: pagamento cai na plataforma (fallback, cliente nunca vê erro).
 */
export async function startAppointmentCheckout(
  input: AppointmentCheckoutInput,
): Promise<{ data: { url: string; session_id: string } | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      scenario: 'appointment',
      appointment_id: input.appointment_id,
      amount: input.amount,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    },
  })
  return { data, error }
}

/**
 * Cenário 2b — Agendamento + Produtos (fluxo pós-agendamento do link público).
 * O agendamento deve ter sido salvo ANTES com status 'pending_payment'.
 * Cria um Checkout Session com line_items = serviço + produtos do carrinho.
 */
export interface PublicBookingCheckoutInput {
  appointment_id: string
  service_amount: number // serviço em centavos
  customer_name?: string
  customer_email?: string
  cart_items: { name: string; price_cents: number; quantity: number }[]
  product_ids: string[]
  success_url?: string
  cancel_url?: string
}

export async function startPublicBookingCheckout(
  input: PublicBookingCheckoutInput,
): Promise<{ data: { url: string; session_id: string } | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      scenario: 'public_booking',
      source: 'public_booking',
      appointment_id: input.appointment_id,
      service_amount: input.service_amount,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      // Inclui o product_id em cada item do carrinho para que o webhook possa
      // reconstruir as quantidades sem precisar chamar a API do Stripe.
      cart_items: input.cart_items.map((c, i) => ({
        ...c,
        product_id: input.product_ids[i],
      })),
      product_ids: input.product_ids,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    },
  })
  return { data, error }
}

/**
 * Cenário 3 — Assinatura: cliente final assinando plano recorrente da barbearia.
 * Busca cliente por CPF no tenant (cria se não existir).
 * application_fee_percent = 2.0 (comissão da plataforma em todas as renovações).
 * payment_method_collection: 'always' (cartão coletado sempre).
 */
export async function startClientSubscriptionCheckout(
  input: SubscriptionCheckoutInput,
): Promise<{ data: { url: string; session_id: string } | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      scenario: 'subscription',
      plan_id: input.plan_id,
      client_cpf: input.client_cpf,
      client_name: input.client_name,
      client_email: input.client_email,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    },
  })
  return { data, error }
}
