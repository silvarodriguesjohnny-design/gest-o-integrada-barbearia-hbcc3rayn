import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  Webhook,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getStripeConfigStatus,
  saveStripeConfig,
  type StripeConfigStatus,
} from '@/services/stripe-config'

export default function AdminStripeConfig() {
  const { toast } = useToast()
  const [status, setStatus] = useState<StripeConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishableKey, setPublishableKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)

  const load = () => {
    setLoading(true)
    getStripeConfigStatus().then(({ data, error }) => {
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else if (data) {
        setStatus(data)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!secretKey.trim()) {
      toast({
        title: 'Chave secreta obrigatória',
        description: 'Preencha a Chave Secreta do Stripe.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    const { data, error } = await saveStripeConfig({
      publishable_key: publishableKey.trim() || undefined,
      secret_key: secretKey.trim(),
      webhook_secret: webhookSecret.trim() || undefined,
    })
    setSaving(false)
    if (error || !data?.success) {
      toast({
        title: 'Erro ao salvar',
        description:
          error?.message || (data as any)?.error || 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Configuração salva! ✅',
      description: data.account
        ? `Conta Stripe validada (${data.account.id}${data.account.country ? ` · ${data.account.country}` : ''}).`
        : 'Chaves validadas com sucesso.',
    })
    setSecretKey('')
    setPublishableKey('')
    setWebhookSecret('')
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const isConfigured = status?.configured
  const webhookActive = status?.webhook_active

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração do Stripe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as chaves da API do Stripe usadas em pagamentos e assinaturas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Status global */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={
            isConfigured ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'
          }
        >
          <CardContent className="flex items-center gap-3 p-5">
            {isConfigured ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status do Stripe</p>
              <p className="text-lg font-semibold">
                {isConfigured ? 'Configurado ✅' : 'Não configurado ⚠️'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            webhookActive
              ? 'border-emerald-200 bg-emerald-50/40'
              : 'border-amber-200 bg-amber-50/40'
          }
        >
          <CardContent className="flex items-center gap-3 p-5">
            <Webhook
              className={
                webhookActive
                  ? 'h-8 w-8 text-emerald-600 shrink-0'
                  : 'h-8 w-8 text-amber-600 shrink-0'
              }
            />
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
          </CardContent>
        </Card>
      </div>

      {/* Chaves atuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <CreditCard className="h-5 w-5 text-accent" /> Chaves Configuradas
          </CardTitle>
          <CardDescription>
            Visão geral das chaves atualmente em uso (parcialmente ocultas por segurança).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status ? (
            <>
              <KeyRow label="Chave Publicável" data={status.publishable_key} />
              <KeyRow label="Chave Secreta" data={status.secret_key} />
              <KeyRow label="Chave do Webhook" data={status.webhook_secret} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma chave configurada.</p>
          )}
        </CardContent>
      </Card>

      {/* Formulário de configuração */}
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Save className="h-5 w-5 text-accent" /> Atualizar Configuração
          </CardTitle>
          <CardDescription>
            Preencha as chaves abaixo e clique em salvar. A chave secreta é validada junto ao Stripe
            antes de ser armazenada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publishable-key" className="text-sm font-semibold">
              Chave Publicável (Publishable Key)
            </Label>
            <Input
              id="publishable-key"
              type="text"
              placeholder="pk_live_... ou pk_test_..."
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Começa com <code>pk_</code>. Usada no frontend para inicializar o Stripe.js.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key" className="text-sm font-semibold">
              Chave Secreta (Secret Key) *
            </Label>
            <div className="relative">
              <Input
                id="secret-key"
                type={showSecret ? 'text' : 'password'}
                placeholder="sk_live_... ou sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="off"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret((v) => !v)}
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Começa com <code>sk_</code>. Mantida no servidor — nunca exposta no frontend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret" className="text-sm font-semibold">
              Chave do Webhook (Webhook Secret)
            </Label>
            <div className="relative">
              <Input
                id="webhook-secret"
                type={showWebhook ? 'text' : 'password'}
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowWebhook((v) => !v)}
                tabIndex={-1}
              >
                {showWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Começa com <code>whsec_</code>. Obtida no dashboard do Stripe ao criar o endpoint do
              webhook.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Endpoint do webhook:</strong>{' '}
              <code className="break-all">
                https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/stripe-webhook
              </code>
            </p>
            <p>
              Configure este URL no dashboard do Stripe em <em>Developers → Webhooks</em> e copie a
              Signing Secret (<code>whsec_...</code>) para o campo acima.
            </p>
          </div>

          <Button
            variant="amber"
            size="lg"
            className="w-full min-h-[48px]"
            disabled={saving || !secretKey.trim()}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {saving ? 'Validando e salvando…' : 'Salvar configuração'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function KeyRow({ label, data }: { label: string; data: StripeConfigStatus['publishable_key'] }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {data.masked || '— não configurada —'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {data.configured ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
          </Badge>
        ) : (
          <Badge variant="amber">
            <AlertTriangle className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        )}
        {data.source === 'env' && (
          <Badge variant="outline" className="text-xs">
            env
          </Badge>
        )}
      </div>
    </div>
  )
}
