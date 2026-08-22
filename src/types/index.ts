export interface Profile {
  id: string
  role: 'admin' | 'operator' | 'viewer'
  full_name: string
  email: string
  avatar_url: string | null
  created_at: string
  tenant_id: string | null
  is_super_admin: boolean
}

export type PlanType = 'essential' | 'pro' | 'elite'
export type SubscriptionType = 'trial' | 'active' | 'past_due'

export interface Tenant {
  id: string
  name: string
  logo_url: string | null
  plan_type: PlanType
  subscription_status: string | null
  subscription_type: SubscriptionType
  trial_ends_at: string | null
  whatsapp_phone: string | null
  owner_id: string
  created_at: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  cpf_cnpj?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  horario_funcionamento?: string | null
  numero_cadeiras?: number | null
  quantidade_profissionais?: number | null
  prepayment_enabled?: boolean
  stripe_connect_id?: string | null
  stripe_connect_enabled?: boolean
  stripe_customer_id?: string | null
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthday: string | null
  created_at: string
  last_visit_at: string | null
  discount_percentage?: number | null
  cpf?: string | null
  communication_preferences?: string[] | null
}

export interface CustomerWithDetails extends Customer {
  loyalty_card?: LoyaltyCard | null
  visit_count?: number
  is_subscriber?: boolean
}

export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  tenant_id: string | null
  created_at: string
  stock_quantity?: number
  min_stock?: number
  cost_price?: number | null
}

export type StockMovementType = 'entrada' | 'saida'

export interface StockMovement {
  id: string
  product_id: string
  movement_type: StockMovementType
  quantity: number
  reason: string
  created_by: string | null
  tenant_id: string | null
  created_at: string
  created_by_name?: string | null
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'pending_payment'

export interface Appointment {
  id: string
  customer_id: string
  service_id: string
  barber_name: string | null
  status: AppointmentStatus
  start_time: string
  end_time: string
  created_at: string
}

export interface AppointmentWithRelations extends Appointment {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>
  service?: Pick<Service, 'id' | 'name' | 'price' | 'duration_minutes'>
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string | null
  category: string | null
  payment_method: string | null
  customer_id: string | null
  created_at: string
}

export interface LoyaltyCard {
  id: string
  customer_id: string
  stamps_count: number
  is_reward_ready: boolean
  created_at: string
}

export interface Campaign {
  id: string
  title: string
  discount_percentage: number
  start_date: string | null
  end_date: string | null
  auto_trigger: boolean
  message_template: string | null
  is_active: boolean
  created_at: string
}

export interface Partner {
  id: string
  name: string
  discount_percentage: number
  tenant_id: string | null
  created_at: string
}

export interface Barber {
  id: string
  name: string
  created_at: string
  tenant_id: string | null
  is_active?: boolean
  public_token?: string | null
}

export interface BarberSchedule {
  id: string
  barber_id: string
  day_of_week: number
  start_time: string
  end_time: string
  tenant_id: string | null
  created_at: string
}

export interface DashboardMetrics {
  totalRevenue: number
  serviceRevenue: number
  productRevenue: number
  ticketMedio: number
  vipCount: number
  inactiveCount: number
  inactivityLoss: number
  revenueData: { day: string; income: number }[]
  serviceData: { name: string; value: number; fill: string }[]
  recentAppointments: AppointmentWithRelations[]
}

export interface PendingTenant {
  id: string
  full_name: string
  email: string
  phone: string | null
  cpf_cnpj: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  nome_negocio: string
  numero_cadeiras: number
  quantidade_profissionais: number
  horario_funcionamento: string | null
  status: string
  created_at: string
}

export interface InactivityAlert {
  id: string
  tenant_id: string
  days: number
  message: string
  channels: string[]
  active: boolean
  created_at: string
}

export interface MessagingConfig {
  id: string
  tenant_id: string
  channel: string
  config_json: Record<string, unknown>
  is_active: boolean
  created_at: string
}

// --- Assinaturas (Fase 2) ---

export interface SubscriptionPlan {
  id: string
  tenant_id: string
  name: string
  description: string | null
  services_included: string[]
  price: number
  prepaid_discount_pct: number
  prepaid_months: number
  prepaid_price: number
  active: boolean
  created_at: string
  updated_at: string
  stripe_price_id?: string | null
  sessions_limit?: number
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'suspended'
export type SubscriptionPaymentType = 'monthly' | 'prepaid'

export interface Subscription {
  id: string
  client_id: string
  tenant_id: string
  plan_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status: SubscriptionStatus
  payment_type: SubscriptionPaymentType
  start_date: string
  end_date: string | null
  amount_paid: number
  created_at: string
  updated_at: string
}

export interface SubscriptionInvoice {
  id: string
  subscription_id: string | null
  stripe_invoice_id: string | null
  amount: number
  status: 'paid' | 'pending' | 'failed'
  paid_at: string | null
  created_at: string
}

// --- Arquitetura de pagamentos Stripe (Connect + customer_subscriptions) ---

export type CustomerSubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid'

export interface CustomerSubscription {
  id: string
  customer_id: string
  tenant_id: string
  plan_id: string | null
  stripe_subscription_id: string | null
  status: CustomerSubscriptionStatus
  sessions_used: number
  sessions_limit: number
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionUsage {
  id: string
  customer_subscription_id: string
  appointment_id: string | null
  session_date: string
  created_at: string
}

export type PlatformEarningSourceType = 'appointment' | 'subscription' | 'product'
export type PlatformEarningStatus = 'pending' | 'transferred' | 'failed'

export interface PlatformEarning {
  id: string
  tenant_id: string | null
  amount: number
  fee_percent: number
  source_type: PlatformEarningSourceType
  source_id: string | null
  stripe_charge_id: string | null
  stripe_transfer_id: string | null
  status: PlatformEarningStatus
  created_at: string
}

export interface StripeConnectAccount {
  id: string
  tenant_id: string
  stripe_account_id: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  created_at: string
  updated_at: string
}
