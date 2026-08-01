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
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled'

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
