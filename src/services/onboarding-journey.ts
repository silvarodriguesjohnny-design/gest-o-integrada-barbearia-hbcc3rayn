import { db } from './db'
import { getStripeConfigStatus } from './stripe-config'

export interface OnboardingStep {
  step: number
  title: string
  benefit: string
  completed: boolean
  action?: { label: string; type: 'navigate' | 'copy' | 'modal'; target: string }
}

/**
 * Conjunto fixo de 6 passos da Jornada de Onboarding da barbearia.
 * A ordem privilegia velocidade até o primeiro resultado real, não complexidade técnica.
 * O status de cada passo é sempre derivado do banco — nunca manual.
 */

// Sementes originais de serviços (migration 20260716210003_seed_data.sql)
// usadas para detectar se o dono ajustou nome/preço em relação ao padrão.
const SEED_SERVICES: Record<string, { name: string; price: number }> = {
  'a0000000-0000-0000-0000-000000000001': { name: 'Corte', price: 45.0 },
  'a0000000-0000-0000-0000-000000000002': { name: 'Barba', price: 35.0 },
  'a0000000-0000-0000-0000-000000000003': { name: 'Combo', price: 75.0 },
}

export async function getOnboardingProgress(tenantId: string): Promise<OnboardingStep[]> {
  if (!tenantId) {
    return buildSteps({ servicesAdjusted: false, hasAppointments: false, hasNonCancelled: false })
  }

  const [msgRes, svcRes, apptRes, plansRes, stripeRes, tenantRes] = await Promise.all([
    db
      .from('messaging_configs')
      .select('channel, is_active, config_json')
      .eq('tenant_id', tenantId),
    db.from('services').select('id, name, price').eq('tenant_id', tenantId),
    db.from('appointments').select('id, status').eq('tenant_id', tenantId),
    db.from('subscription_plans').select('id').eq('tenant_id', tenantId).limit(1),
    getStripeConfigStatus(),
    db.from('tenants').select('prepayment_enabled').eq('id', tenantId).maybeSingle(),
  ])

  // Passo 1 — WhatsApp conectado (channel 'whatsapp' ativo e com config real)
  const whatsappCfg = (msgRes.data || []).find((c: any) => c.channel === 'whatsapp')
  const whatsappConnected = !!(
    whatsappCfg?.is_active &&
    whatsappCfg?.config_json &&
    (whatsappCfg.config_json as Record<string, unknown>).api_key
  )

  // Passo 2 — Serviços ajustados em relação ao seed (nome ou preço alterado)
  // Considera concluído se houver pelo menos 1 serviço que diverja do seed,
  // ou se houver serviços não-seed (o dono criou os próprios).
  const services = (svcRes.data || []) as { id: string; name: string; price: number }[]
  const servicesAdjusted =
    services.length > 0 &&
    services.some((s) => {
      const seed = SEED_SERVICES[s.id]
      if (!seed) return true // serviço criado pelo dono (não é do seed)
      return s.name !== seed.name || Number(s.price) !== seed.price
    })

  // Passo 3 — Pelo menos 1 agendamento (alguém acessou o link público)
  const appts = (apptRes.data || []) as { id: string; status: string }[]
  const hasAppointments = appts.length > 0

  // Passo 4 — Primeiro agendamento não cancelado
  const hasNonCancelled = appts.some((a) => a.status !== 'cancelled')

  // Passo 5 — Pelo menos 1 combo (subscription_plan)
  const hasCombo = (plansRes.data || []).length > 0

  // Passo 6 — Pagamento antecipado.
  // Só fica concluído quando AMBAS as condições forem verdadeiras:
  //   a) Stripe configurado pelo admin (super admin) — via getStripeConfigStatus()
  //   b) O barbeiro ativou o toggle de pagamento antecipado (prepayment_enabled)
  const stripeConfigured = !!stripeRes.data?.configured
  const prepaymentEnabled = !!(tenantRes.data as { prepayment_enabled?: boolean } | null)
    ?.prepayment_enabled
  const paymentReady = stripeConfigured && prepaymentEnabled

  return buildSteps({
    whatsappConnected,
    servicesAdjusted,
    hasAppointments,
    hasNonCancelled,
    hasCombo,
    paymentReady,
  })
}

function buildSteps(state: {
  whatsappConnected?: boolean
  servicesAdjusted?: boolean
  hasAppointments?: boolean
  hasNonCancelled?: boolean
  hasCombo?: boolean
  paymentReady?: boolean
}): OnboardingStep[] {
  return [
    {
      step: 1,
      title: 'Conectar WhatsApp',
      benefit: 'Confirmações e lembretes saem do seu número, e o cliente responde direto pra você',
      completed: !!state.whatsappConnected,
      action: { label: 'Conectar', type: 'navigate', target: '/dashboard/configuracoes' },
    },
    {
      step: 2,
      title: 'Ajustar serviços',
      benefit:
        'Seus serviços com seus preços. O sistema já vem com exemplos, mas o cliente precisa ver os seus',
      completed: !!state.servicesAdjusted,
      action: { label: 'Ajustar Serviços', type: 'navigate', target: '/dashboard/servicos' },
    },
    {
      step: 3,
      title: 'Divulgar a agenda',
      benefit:
        'Seu link de agendamento está pronto. É por ele que os clientes marcam horário sozinhos, 24h por dia',
      completed: !!state.hasAppointments,
      action: { label: 'Copiar Link', type: 'copy', target: 'booking-link' },
    },
    {
      step: 4,
      title: 'Receber primeiro agendamento',
      benefit:
        'O momento "funcionou!". Quando chegar o primeiro agendamento, este card muda automaticamente',
      completed: !!state.hasNonCancelled,
      action: { label: 'Aguardando...', type: 'modal', target: 'auto' },
    },
    {
      step: 5,
      title: 'Criar um combo',
      benefit:
        'Clientes fiéis que voltam todo mês. Um combo gera receita recorrente que não depende de captação',
      completed: !!state.hasCombo,
      action: { label: 'Criar Combo', type: 'navigate', target: '/dashboard/assinaturas' },
    },
    {
      step: 6,
      title: 'Aceitar pagamento',
      benefit:
        'Reduz falta e antecipa caixa. O cliente paga no agendamento e já chega com o horário garantido',
      completed: !!state.paymentReady,
      action: { label: 'Configurar', type: 'navigate', target: '/dashboard/pagamentos' },
    },
  ]
}
