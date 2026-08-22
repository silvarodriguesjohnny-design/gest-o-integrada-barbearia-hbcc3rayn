import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2, RefreshCw, ShieldCheck, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getStripeConfigStatus } from '@/services/stripe-config'
import { db } from '@/services/db'

export default function Pagamentos() {
  const { tenant, refreshAuth } = useAuth()
  const { toast } = useToast()
  const [stripeReady, setStripeReady] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const tenantId = tenant?.id || ''
  const prepaymentEnabled = !!tenant?.prepayment_enabled

  const load = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const handleToggle = async (checked: boolean) => {
    if (!tenantId || saving || !stripeReady) return
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
    // Atualiza o estado de auth para refletir a nova preferência em toda a app.
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
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-accent" /> Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Decida se seus clientes podem pagar antecipadamente ao agendar.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Toggle de pagamento antecipado */}
      <Card className={stripeConfigured ? 'border-accent/30' : 'opacity-70'}>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" /> Recebimento antecipado
            </span>
            <h2 className="text-xl md:text-2xl font-bold leading-tight">
              Quero receber pagamento antecipado na minha agenda?
            </h2>
          </div>

          {/* Switch grande e claro */}
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
                disabled={!stripeConfigured || saving}
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
            Ao ativar, seus clientes poderão pagar antecipadamente com desconto ao agendar. O
            pagamento é processado pelo Stripe de forma segura.
          </p>

          {!stripeConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-sm flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Pagamento antecipado ainda não disponível.
                </p>
                <p className="text-amber-700/80 dark:text-amber-300/70 mt-1">
                  Aguarde a ativação pelo administrador.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Plataforma de pagamentos ativada pelo administrador. Você só precisa ligar o
              interruptor acima.
            </div>
          )}

          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
