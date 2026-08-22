import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getStripeConfigStatus } from '@/services/stripe-config'
import {
  getStripeConnectStatus,
  startStripeConnectOnboarding,
  type StripeConnectStatus,
} from '@/services/stripe-connect'
import { db } from '@/services/db'
import type { SubscriptionPlan } from '@/types'
import { useNavigate } from 'react-router-dom'

export default function Pagamentos() {
  const { tenant, refreshAuth } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [stripeReady, setStripeReady] = useState<boolean | null>(null)
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const tenantId = tenant?.id || ''
  const prepaymentEnabled = !!tenant?.prepayment_enabled

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [stripeRes, connectRes] = await Promise.all([
        getStripeConfigStatus(),
        getStripeConnectStatus(),
      ])

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

      if (connectRes.error) {
        // silencioso: pode não ter conta ainda
        console.warn('[Pagamentos] connect status error:', connectRes.error)
      }
      setConnectStatus(connectRes.data ?? null)

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
    // Só habilitado se Connect ativo OU Stripe plataforma configurado.
    const connectEnabled = !!connectStatus?.account?.charges_enabled || stripeReady === true
    if (!connectEnabled) return
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

  const handleConnect = async () => {
    if (connecting) return
    setConnecting(true)
    try {
      const { data, error } = await startStripeConnectOnboarding()
      if (error || !data?.account_link_url) {
        toast({
          title: 'Erro ao conectar Stripe',
          description: error?.message || 'Não foi possível gerar o link de onboarding.',
          variant: 'destructive',
        })
        setConnecting(false)
        return
      }
      // Redireciona para o onboarding do Stripe
      window.location.href = data.account_link_url
    } catch (err: any) {
      toast({
        title: 'Erro ao conectar Stripe',
        description: err.message,
        variant: 'destructive',
      })
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const stripeConfigured = stripeReady === true
  const hasConnect = !!connectStatus?.has_account
  const connectActive = !!connectStatus?.account?.charges_enabled
  const connectNeedsCompletion = hasConnect && !connectStatus?.account?.details_submitted
  const canReceivePayments = connectActive || stripeConfigured
  // Últimos 4 dígitos da conta Stripe (o ID começa com "acct_")
  const stripeAccountId = connectStatus?.account?.stripe_account_id || null
  const lastDigits = stripeAccountId ? stripeAccountId.slice(-4) : null

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
      {/* SEÇÃO 1 — Stripe Connect (Onboarding)                        */}
      {/* ============================================================ */}
      {!hasConnect ? (
        <Card className="border-accent/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-accent/10 p-3">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">Receba pagamentos direto na sua conta</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte sua conta Stripe para receber pagamentos de agendamentos e assinaturas
                  diretamente no seu banco, com repasse automático. A plataforma retém apenas{' '}
                  <strong>2%</strong> por transação.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              {connecting ? 'Conectando…' : 'Conectar Stripe'}
            </Button>
          </CardContent>
        </Card>
      ) : connectNeedsCompletion ? (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-amber-800 dark:text-amber-300">
                  Complete seu cadastro no Stripe
                </h2>
                <p className="text-sm text-amber-700/90 dark:text-amber-300/80 mt-1">
                  Você já iniciou a conexão, mas ainda precisa concluir o cadastro na Stripe para
                  receber pagamentos. O processo leva poucos minutos.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              {connecting ? 'Abrindo…' : 'Concluir cadastro'}
            </Button>
          </CardContent>
        </Card>
      ) : connectActive ? (
        <Card className="border-green-300 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-bold text-green-800 dark:text-green-300">
                Conta conectada ✅
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {lastDigits ? `…${lastDigits}` : 'Conectada'}
              </Badge>
            </div>
            <p className="text-sm text-green-700/80 dark:text-green-300/70">
              Você está recebendo pagamentos direto na sua conta Stripe. Repasses são automáticos. A
              plataforma retém <strong>2%</strong> por transação.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                <Building2 className="h-4 w-4 mr-2" /> Acessar conta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="opacity-70">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-lg font-bold">Conta em análise</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sua conta Stripe Connect está em processo de análise. Aguarde a liberação para receber
              pagamentos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* SEÇÃO 2 — Pagamento Antecipado (toggle)                      */}
      {/* ============================================================ */}
      <Card className={canReceivePayments ? 'border-accent/30' : 'opacity-70'}>
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
                disabled={!canReceivePayments || saving}
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
            processado pelo Stripe de forma segura
            {connectActive ? ' e cai direto na sua conta' : ''}.
          </p>

          {!canReceivePayments ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-sm flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Pagamento antecipado ainda não disponível.
                </p>
                <p className="text-amber-700/80 dark:text-amber-300/70 mt-1">
                  {hasConnect
                    ? 'Conclua o cadastro da sua conta Stripe acima para liberar.'
                    : 'Conecte sua conta Stripe acima para liberar.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {connectActive
                ? 'Recebendo direto na sua conta Stripe Connect.'
                : 'Plataforma de pagamentos ativada pelo administrador.'}
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
