import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Store, CreditCard, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const db = supabase as any

interface MeuCaixaMetrics {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  totalRevenue: number
  monthlyRecurring: number
  pendingCadastros: number
}

export default function AdminMeuCaixa() {
  const [metrics, setMetrics] = useState<MeuCaixaMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: tenants } = await db
          .from('tenants')
          .select('id, status, plan_type, subscription_type')
        const { count: pendingCount } = await db
          .from('pending_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        const all = tenants || []
        const active = all.filter((t: any) => t.subscription_type === 'active')
        const trial = all.filter((t: any) => t.subscription_type === 'trial')

        // MRR simulado baseado em planos (Essential R$99, Pro R$199, Elite R$399)
        const planPrice: Record<string, number> = { essential: 99, pro: 199, elite: 399 }
        const mrr = active.reduce((sum: number, t: any) => sum + (planPrice[t.plan_type] || 0), 0)

        setMetrics({
          totalTenants: all.length,
          activeTenants: active.length,
          trialTenants: trial.length,
          totalRevenue: mrr,
          monthlyRecurring: mrr,
          pendingCadastros: pendingCount || 0,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Meu Caixa</h1>
        <p className="text-muted-foreground text-sm">
          Faturamento da plataforma, comissões e resumo financeiro
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MRR Total</span>
                  <Wallet className="h-4 w-4 text-accent" />
                </div>
                <div className="text-2xl font-bold">{fmt(metrics?.monthlyRecurring || 0)}</div>
                <p className="text-xs text-muted-foreground">Receita recorrente mensal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Barbearias Ativas</span>
                  <Store className="h-4 w-4 text-success" />
                </div>
                <div className="text-2xl font-bold">{metrics?.activeTenants ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  de {metrics?.totalTenants ?? 0} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Em Trial</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{metrics?.trialTenants ?? 0}</div>
                <p className="text-xs text-muted-foreground">convertendo para pagantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cadastros Pendentes</span>
                  <CreditCard className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold">{metrics?.pendingCadastros ?? 0}</div>
                <p className="text-xs text-muted-foreground">aguardando aprovação</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-accent" />
            Resumo Financeiro da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">Receita Recorrente (MRR)</p>
                  <p className="text-xl font-bold text-accent">
                    {fmt(metrics?.monthlyRecurring || 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">Receita Anual Projetada</p>
                  <p className="text-xl font-bold">{fmt((metrics?.monthlyRecurring || 0) * 12)}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">ARPU</p>
                  <p className="text-xl font-bold">
                    {metrics && metrics.activeTenants > 0
                      ? fmt(metrics.monthlyRecurring / metrics.activeTenants)
                      : fmt(0)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="outline">Plano Essential: R$ 99/mês</Badge>
                <Badge variant="outline">Plano Pro: R$ 199/mês</Badge>
                <Badge variant="outline">Plano Elite: R$ 399/mês</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Os valores de MRR são calculados a partir dos planos ativos das barbearias.
                Comissões de transações e taxas adicionais são exibidas conforme configuradas.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
