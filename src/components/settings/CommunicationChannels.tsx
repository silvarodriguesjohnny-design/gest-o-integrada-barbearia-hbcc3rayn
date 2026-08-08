import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Send, Mail, MessageCircle, Smartphone } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getMessagingConfigs, upsertMessagingConfig, testMessaging } from '@/services/messaging'

const CHANNEL_FIELDS: Record<
  string,
  { key: string; label: string; type?: string; optional?: boolean }[]
> = {
  email: [
    { key: 'smtp_host', label: 'SMTP Host' },
    { key: 'smtp_port', label: 'Porta', type: 'number' },
    { key: 'smtp_username', label: 'Usuário' },
    { key: 'smtp_password', label: 'Senha', type: 'password' },
    { key: 'sender_name', label: 'Nome do Remetente' },
    { key: 'sender_email', label: 'Email do Remetente' },
  ],
  whatsapp: [
    { key: 'evolution_base_url', label: 'Evolution API URL' },
    { key: 'evolution_instance', label: 'Nome da Instância' },
    { key: 'api_key', label: 'API Key (Evolution)', type: 'password' },
    { key: 'phone_number', label: 'Número (WhatsApp Business)' },
    { key: 'webhook_url', label: 'Webhook URL (opcional)', optional: true },
  ],
  sms: [
    { key: 'api_key', label: 'Provider API Key', type: 'password' },
    { key: 'sender_id', label: 'Sender ID' },
  ],
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: Smartphone,
}

export function CommunicationChannels() {
  const { tenant, profile } = useAuth()
  const { toast } = useToast()
  const [configs, setConfigs] = useState<
    Record<string, { active: boolean; fields: Record<string, string> }>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    setLoading(true)
    getMessagingConfigs(tenant.id).then(({ data }) => {
      const map: Record<string, { active: boolean; fields: Record<string, string> }> = {}
      for (const ch of ['email', 'whatsapp', 'sms']) {
        const found = (data || []).find((c: any) => c.channel === ch)
        map[ch] = {
          active: found?.is_active ?? false,
          fields: (found?.config_json as Record<string, string>) || {},
        }
      }
      setConfigs(map)
      setLoading(false)
    })
  }, [tenant])

  const updateField = (channel: string, key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        fields: { ...prev[channel]?.fields, [key]: value },
      },
    }))
  }

  const toggleActive = (channel: string, active: boolean) => {
    setConfigs((prev) => ({ ...prev, [channel]: { ...prev[channel], active } }))
  }

  const handleSave = async (channel: string) => {
    if (!tenant) return
    const cfg = configs[channel]
    if (!cfg) return
    const requiredFields = CHANNEL_FIELDS[channel].filter((f) => !f.optional)
    for (const field of requiredFields) {
      if (!cfg.fields[field.key]?.trim()) {
        toast({ title: `Preencha o campo: ${field.label}`, variant: 'destructive' })
        return
      }
    }
    setSaving(channel)
    const { error } = await upsertMessagingConfig(tenant.id, channel, cfg.fields, cfg.active)
    setSaving(null)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else toast({ title: `Configuração de ${channel} salva!` })
  }

  const handleTest = async (channel: string) => {
    if (!tenant) return
    const cfg = configs[channel]
    if (!cfg) return
    setTesting(channel)
    const { data, error } = await testMessaging(
      channel,
      { ...cfg.fields, recipient: profile?.email || '' },
      tenant.id,
    )
    setTesting(null)
    if (error) toast({ title: 'Erro no teste', description: error.message, variant: 'destructive' })
    else
      toast({
        title: 'Teste enviado!',
        description: data?.message || 'Verifique seu email/telefone.',
      })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <Card className="hover:shadow-elevation transition-shadow">
      <CardHeader className="bg-muted/20 border-b pb-4">
        <CardTitle className="font-serif text-xl">Canais de Comunicação</CardTitle>
        <CardDescription>Configure e teste Email, WhatsApp e SMS.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {['email', 'whatsapp', 'sms'].map((channel) => {
          const Icon = CHANNEL_ICONS[channel]
          const cfg = configs[channel] || { active: false, fields: {} }
          return (
            <div key={channel} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="font-semibold capitalize">{channel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Ativo</Label>
                  <Switch checked={cfg.active} onCheckedChange={(v) => toggleActive(channel, v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CHANNEL_FIELDS[channel].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-sm">{field.label}</Label>
                    <Input
                      type={field.type || 'text'}
                      value={cfg.fields[field.key] || ''}
                      onChange={(e) => updateField(channel, field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(channel)}
                  disabled={testing === channel}
                >
                  {testing === channel ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Testar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(channel)}
                  disabled={saving === channel}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  {saving === channel ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
