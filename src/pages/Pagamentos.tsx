import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Webhook,
  Repeat,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getStripeConfigStatus, type StripeConfigStatus } from '@/services/stripe-config'
import { listSubscriptionPlans } from '@/services/subscriptions'
import type { SubscriptionPlan } from '@/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Pagamentos() {
  const { tenant, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState<StripeConfigStatus | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  const tenantId = tenant?.id || ''

  const load = async () => {
    setLoading(true)
    try {
      const [stripeRes, plansData] = await Promise.all([
        getStripeConfigStatus(),
        tenantId ? listSubscriptionPlans(tenantId) : Promise.resolve([]),
      ])
      if (stripeRes.error) {
        toast({
          title: 'Erro ao carregar status de pagamentos',
          description: stripeRes.error.message,
          variant: 'destructive',
        })
      } else if (stripeRes.data) {
        setStatus(stripeRes.data)
      }
      setPlans(plansData || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const platformConfigured = !!status?.configured
  const webhookActive = !!status?.webhook_active

  // Planos com pagamento antecipado (pacote) ativos
  const prepaidPlans = plans.filter((p) => p.active && p.prepaid_months > 0 && p.prepaid_price > 0)
  const hasPrepaidPlans = prepaidPlans.length > 0

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-accent" /> Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Aceite pagamentos antecipados dos seus clientes via Stripe.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Status da plataforma */}
      <Card
        className={
          platformConfigured
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-amber-200 bg-amber-50/40'
        }
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <ShieldCheck className="h-5 w-5 text-accent" /> Status da Plataforma
          </CardTitle>
          <CardDescription>
            O Stripe é a conexão de pagamentos usada por todas as barbearias do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-4">
              {platformConfigured ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Stripe</p>
                <p className="text-lg font-semibold">
                  {platformConfigured ? 'Configurado ✅' : 'Não configurado ⚠️'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-4">
              {webhookActive ? (
                <Webhook className="h-8 w-8 text-emerald-600 shrink-0" />
              ) : (
                <Webhook className="h-8 w-8 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Webhook</p>
                <p className="text-lg font-semibold truncate">
                  {webhookActive ? 'Ativo ✅' : 'Sem eventos ⚠️'}
                </p>
                {status?.last_webhook_event && (
                  <p className="text-xs text-muted-foreground truncate">
                    Último: {status.last_webhook_event.event_type} ·{' '}
                    {new Date(status.last_webhook_event.received_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {platformConfigured ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Pagamentos Habilitados
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-300/70 mt-1">
                A plataforma está pronta para processar pagamentos. Agora basta ativar o pagamento
                antecipado nos seus planos de assinatura para que seus clientes paguem à vista com
                desconto.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Aguardando configuração da plataforma
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/70 mt-1">
                O administrador da plataforma ainda precisa configurar as chaves do Stripe para que
                você possa aceitar pagamentos. Entre em contato com o suporte se isso demorar.
              </p>
              {isSuperAdmin && (
                <Button
                  variant="amber"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/admin/stripe')}
                >
                  Configurar Stripe <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagamento antecipado — planos do dono */}
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Repeat className="h-5 w-5 text-accent" /> Pagamento Antecipado nos Planos
          </CardTitle>
          <CardDescription>
            Planos de assinatura com pacote antecipado (à vista com desconto). É assim que seus
            clientes pagam antes e garantem o horário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPrepaidPlans ? (
            <div className="space-y-2">
              {prepaidPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Pacote {plan.prepaid_months} meses · {plan.prepaid_discount_pct}% off
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success">Ativo</Badge>
                    <span className="font-bold text-accent">{fmt(plan.prepaid_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
              <p>
                Você ainda não tem planos com pagamento antecipado. Crie um plano de assinatura e
                defina um pacote antecipado (ex: 3 meses com 10% off) para começar a receber
                pagamentos à vista.
              </p>
            </div>
          )}

          <Button
            variant="amber"
            size="lg"
            className="w-full min-h-[48px]"
            onClick={() => navigate('/dashboard/assinaturas')}
          >
            <Repeat className="h-5 w-5 mr-2" />
            {hasPrepaidPlans ? 'Gerenciar planos' : 'Criar plano com pagamento antecipado'}
          </Button>
        </CardContent>
      </Card>

      {/* Como funciona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <CreditCard className="h-5 w-5 text-accent" /> Como funciona
          </CardTitle>
          <CardDescription>O fluxo de pagamento antecipado na sua barbearia.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              <strong className="text-foreground">Plataforma configurada:</strong> o administrador
              configura as chaves do Stripe (uma única vez, global).
            </li>
            <li>
              <strong className="text-foreground">Plano antecipado:</strong> você cria um plano de
              assinatura com pacote à vista (ex: 3 meses com desconto).
            </li>
            <li>
              <strong className="text-foreground">Cliente paga:</strong> ao assinar, o cliente
              escolhe pagar mensal ou o pacote antecipado — o checkout é feito no Stripe.
            </li>
            <li>
              <strong className="text-foreground">Horário garantido:</strong> o cliente já chega com
              o horário pago, reduzindo faltas e antecipando seu caixa.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
