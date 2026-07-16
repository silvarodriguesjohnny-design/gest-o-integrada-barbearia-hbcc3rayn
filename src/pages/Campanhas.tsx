import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MessageSquare, Handshake, PlayCircle, Loader2, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCampaigns, updateCampaign } from '@/services/campaigns'
import { triggerNotifications } from '@/services/notifications'
import type { Campaign } from '@/types'

export default function Campanhas() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)

  const load = () => {
    setLoading(true)
    getCampaigns().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setCampaigns(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await updateCampaign(id, { is_active: active })
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else load()
  }

  const handleActivate = async (c: Campaign) => {
    const { error } = await updateCampaign(c.id, { auto_trigger: !c.auto_trigger, is_active: true })
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Campanha atualizada!', description: 'Configurações salvas com sucesso.' })
      load()
    }
  }

  const handleNotify = async () => {
    setNotifying(true)
    const { data, error } = await triggerNotifications()
    setNotifying(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else
      toast({
        title: `${data?.count || 0} notificações processadas`,
        description: 'Mensagens disparadas com sucesso.',
      })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fidelidade & Campanhas</h1>
          <p className="text-muted-foreground mt-1">Automatize mensagens e gerencie parceiros.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleNotify}
          disabled={notifying}
          className="transition-transform active:scale-95"
        >
          {notifying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Disparar Notificações
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <CalendarDays className="h-5 w-5 text-accent" /> Campanhas Sazonais
                </CardTitle>
                <CardDescription>Configure gatilhos para datas comemorativas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className={`border rounded-lg p-5 space-y-4 bg-card shadow-sm hover:border-accent/50 transition-colors ${!c.is_active ? 'opacity-70 hover:opacity-100' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-lg font-bold font-serif">{c.title}</Label>
                        <p className="text-sm text-muted-foreground">
                          {c.auto_trigger ? 'Disparo automático ativo' : 'Disparo manual'}
                        </p>
                      </div>
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) => handleToggle(c.id, v)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Desconto (%)</Label>
                        <Input
                          type="number"
                          defaultValue={c.discount_percentage}
                          className="w-full"
                        />
                      </div>
                    </div>
                    {c.message_template && (
                      <div className="space-y-2">
                        <Label className="font-semibold">Mensagem (WhatsApp)</Label>
                        <Textarea defaultValue={c.message_template} className="h-24 resize-none" />
                      </div>
                    )}
                    <Button
                      className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white transition-transform active:scale-95"
                      onClick={() => handleActivate(c)}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />{' '}
                      {c.auto_trigger ? 'Desativar Auto' : 'Salvar e Ativar'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-destructive/50 bg-destructive/5 hover:shadow-elevation transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-destructive font-serif text-xl">
                  <MessageSquare className="h-5 w-5" /> Alerta de Inatividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-5 text-foreground/80 leading-relaxed">
                  Envia automaticamente uma mensagem de resgate para clientes que não visitam a
                  barbearia há mais de <strong className="text-destructive">60 dias</strong>.
                </p>
                <Button
                  variant="destructive"
                  className="w-full transition-transform active:scale-95"
                  onClick={handleNotify}
                >
                  Configurar e Disparar
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <Handshake className="h-5 w-5 text-accent" /> Módulo de Parceiros
                </CardTitle>
                <CardDescription>Empresas com convênio.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-semibold">Academia SmartFit</p>
                      <p className="text-sm text-muted-foreground">Desconto de 10%</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                      Ativo
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-semibold">Cervejaria Local</p>
                      <p className="text-sm text-muted-foreground">1 Chopp Grátis</p>
                    </div>
                    <Badge variant="secondary">Pausado</Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-primary mt-4 border-dashed border-2 hover:bg-accent/5 hover:text-accent hover:border-accent transition-colors"
                  >
                    + Adicionar Parceiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
