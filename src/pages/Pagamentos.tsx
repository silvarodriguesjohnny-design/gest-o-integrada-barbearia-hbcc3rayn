import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Loader2, RefreshCw, ShieldCheck, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getStripeConfigStatus } from '@/services/stripe-config'
import { db } from '@/services/db'
import type { SubscriptionPlan } from '@/types'
import { useNavigate } from 'react-router-dom'

export default function Pagamentos() {
  const { tenant, refreshAuth } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [stripeReady, setStripeReady] = useState<boolean | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const tenantId = tenant?.id || ''
  const prepaymentEnabled = !!tenant?.prepayment_enabled

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const stripeRes = await getStripeConfigStatus()

      if (stripeRes.error) {
        toast({
          title: 'Erro ao carregar status de pagamentos',
          description: stripeRes.error.message,
          variant: 'destructive',
        })
        setStripeReady(false)
      } else {
        setStripeReady(!!stripeRes.data?.configured)
      }

      // Planos do tenant
      const { data: plansData, error: plansErr } = await db
        .from('subscription_plans')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('price', { ascending: true })
      if (plansErr) {
        console.warn('[Pagamentos] plans error:', plansErr)
      }
      setPlans((plansData || []) as SubscriptionPlan[])
    } finally {
      setLoading(false)
    }
  }, [tenantId, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (checked: boolean) => {
    if (!tenantId || saving) return
    // O toggle salva a preferência do tenant SEMPRE, independente do Stripe
    // estar configurado pelo admin. Se ainda não estiver, a preferência fica
    // registrada e os pagamentos antecipados são ativados automaticamente
    // quando o admin configurar o Stripe.
    setSaving(true)
    const { error } = await db
      .from('tenants')
      .update({ prepayment_enabled: checked })
      .eq('id', tenantId)
    if (error) {
      toast({
        title: 'Erro ao salvar preferência',
        description: error.message,
        variant: 'destructive',
      })
      setSaving(false)
      return
    }
    await refreshAuth()
    setSaving(false)
    toast({
      title: checked ? 'Pagamento antecipado ativado' : 'Pagamento antecipado desativado',
      description: checked
        ? 'Seus clientes já podem pagar antecipadamente ao agendar.'
        : 'Os clientes vão agendar sem pagamento antecipado.',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const stripeConfigured = stripeReady === true

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-accent" /> Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Receba pagamentos direto na sua conta e gerencie seus planos de assinatura.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* ============================================================ */}
      {/* SEÇÃO 2 — Pagamento Antecipado (toggle)                      */}
      {/* ============================================================ */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" /> Recebimento antecipado
            </span>
            <h2 className="text-xl md:text-2xl font-bold leading-tight">
              Quero receber pagamento antecipado na minha agenda?
            </h2>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <span
              className={
                !prepaymentEnabled
                  ? 'text-lg font-bold text-accent'
                  : 'text-lg font-medium text-muted-foreground'
              }
            >
              Não
            </span>
            <div className="[&_.switch-lg]:h-10 [&_.switch-lg]:w-20 [&_.switch-lg_[data-thumb]]:h-8 [&_.switch-lg_[data-thumb]]:w-8 [&_.switch-lg_[data-thumb]]:data-[state=checked]:translate-x-10">
              <Switch
                className="switch-lg"
                checked={prepaymentEnabled}
                disabled={saving}
                onCheckedChange={handleToggle}
                aria-label="Receber pagamento antecipado na agenda"
              />
            </div>
            <span
              className={
                prepaymentEnabled
                  ? 'text-lg font-bold text-accent'
                  : 'text-lg font-medium text-muted-foreground'
              }
            >
              Sim
            </span>
          </div>

          <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
            Ao ativar, seus clientes poderão pagar antecipadamente ao agendar. O pagamento é
            processado pelo Stripe de forma segura.
          </p>

          {!stripeConfigured ? (
            <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
              O administrador ainda não configurou o Stripe. Quando estiver pronto, seus pagamentos
              antecipados serão ativados automaticamente.
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-success">
              <ShieldCheck className="h-4 w-4" />
              Plataforma de pagamentos ativada pelo administrador. ✅
            </div>
          )}

          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* SEÇÃO 3 — Planos de Assinatura para Clientes                */}
      {/* ============================================================ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" /> Assinaturas para clientes
              </span>
              <h2 className="text-xl font-bold mt-1">Planos de assinatura</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Crie planos mensais com créditos de agendamento para fidelizar seus clientes.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/dashboard/assinaturas')}>
              <Plus className="h-4 w-4 mr-2" /> Criar plano
            </Button>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não criou planos de assinatura.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/dashboard/assinaturas')}
              >
                Criar primeiro plano
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => {
                const monthly = Number(plan.price) || 0
                const prepaid = Number(plan.prepaid_price) || 0
                const sessionsLimit = (plan as any).sessions_limit
                return (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{plan.name}</span>
                        <Badge variant={plan.active ? 'default' : 'secondary'}>
                          {plan.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>R$ {monthly.toFixed(2).replace('.', ',')}/mês</span>
                        {prepaid > 0 && (
                          <span>
                            Pacote antecipado:{' '}
                            <strong>R$ {prepaid.toFixed(2).replace('.', ',')}</strong>
                          </span>
                        )}
                        {sessionsLimit ? <span>{sessionsLimit} agendamentos/mês</span> : null}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard/assinaturas')}
                    >
                      Editar
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
