import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  Save,
  Loader2,
  Store,
  ImageIcon,
  MessageCircle,
  Copy,
  Check,
  Link2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { updateTenant, uploadLogo } from '@/services/tenants'

export default function Settings() {
  const { tenant, refreshAuth } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(tenant?.name || '')
  const [whatsappPhone, setWhatsappPhone] = useState(tenant?.whatsapp_phone || '')
  const [saving, setSaving] = useState(false)
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSave = async () => {
    if (!tenant) return
    setSaving(true)
    const { error } = await updateTenant(tenant.id, { name })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Configurações salvas!' })
      refreshAuth()
    }
  }

  const handleSaveWhatsapp = async () => {
    if (!tenant) return
    setSavingWhatsapp(true)
    const { error } = await updateTenant(tenant.id, { whatsapp_phone: whatsappPhone })
    setSavingWhatsapp(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'WhatsApp configurado!' })
      refreshAuth()
    }
  }

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return
    setUploading(true)
    const { url, error } = await uploadLogo(tenant.id, file)
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
    } else if (url) {
      await updateTenant(tenant.id, { logo_url: url })
      toast({ title: 'Logo atualizado!' })
      refreshAuth()
    }
    setUploading(false)
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Você não tem uma barbearia configurada.</p>
      </div>
    )
  }

  const planLabels: Record<string, string> = { essential: 'Essential', pro: 'Pro', elite: 'Elite' }
  const cleanPhone = whatsappPhone.replace(/\D/g, '')

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize a identidade da sua barbearia.</p>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Store className="h-5 w-5 text-accent" /> Identidade da Barbearia
          </CardTitle>
          <CardDescription>Altere o nome e logo exibidos no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 overflow-hidden">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogo}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Enviando...' : 'Enviar Logo'}
              </Button>
              <p className="text-xs text-muted-foreground">PNG ou JPG, até 2MB.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold">
              Nome da Barbearia
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da sua barbearia"
            />
          </div>
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plano Atual</span>
              <span className="font-semibold text-accent">
                {planLabels[tenant.plan_type] || tenant.plan_type}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-semibold text-emerald-600 capitalize">
                {tenant.subscription_type || 'trial'}
              </span>
            </div>
            {tenant.trial_ends_at && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">Teste expira em</span>
                <span className="font-semibold">
                  {new Date(tenant.trial_ends_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <MessageCircle className="h-5 w-5 text-emerald-600" /> Integração WhatsApp
          </CardTitle>
          <CardDescription>Configure o WhatsApp para agendamentos e notificações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="font-semibold">
              Número de WhatsApp
            </Label>
            <Input
              id="whatsapp"
              placeholder="+55 11 98765-4321"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Inclua o código do país e DDD. Ex: +5511987654321
            </p>
          </div>
          {cleanPhone && (
            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="w-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4 mr-2" /> Testar Link do WhatsApp
              </Button>
            </a>
          )}
          <Button
            onClick={handleSaveWhatsapp}
            disabled={savingWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {savingWhatsapp && <Loader2 className="h-4 w-4 mr-2" />}
            Salvar WhatsApp
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Link2 className="h-5 w-5 text-accent" /> Link de Agendamento
          </CardTitle>
          <CardDescription>
            Compartilhe este link para seus clientes agendarem online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/booking/${tenant.id}`}
              className="bg-muted/50 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/booking/${tenant.id}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Os clientes podem acessar este link para agendar horários diretamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
