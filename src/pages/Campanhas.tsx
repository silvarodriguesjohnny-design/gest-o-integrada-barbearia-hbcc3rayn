import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MessageSquare, Handshake, Loader2, Bell, Trash2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCampaigns } from '@/services/campaigns'
import { triggerNotifications } from '@/services/notifications'
import { getPartners, deletePartner } from '@/services/partners'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { NewCampaignDialog } from '@/components/campaigns/NewCampaignDialog'
import { PartnerDialog } from '@/components/campaigns/PartnerDialog'
import type { Campaign, Partner } from '@/types'

export default function Campanhas() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [editPartnerOpen, setEditPartnerOpen] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getCampaigns(), getPartners()]).then(([campRes, partRes]) => {
      if (campRes.error)
        toast({ title: 'Erro', description: campRes.error.message, variant: 'destructive' })
      else setCampaigns(campRes.data || [])
      if (partRes.error)
        toast({ title: 'Erro', description: partRes.error.message, variant: 'destructive' })
      else setPartners(partRes.data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

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

  const handleDeletePartner = async (id: string) => {
    const { error } = await deletePartner(id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Parceiro removido!' })
      load()
    }
  }

  const handleEditPartner = (partner: Partner) => {
    setEditPartner(partner)
    setEditPartnerOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fidelidade & Campanhas</h1>
          <p className="text-muted-foreground mt-1">Automatize mensagens e gerencie parceiros.</p>
        </div>
        <div className="flex gap-2">
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
          <NewCampaignDialog onCreated={load} />
        </div>
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
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma campanha cadastrada. Clique em "Nova Campanha" para começar.
                  </p>
                ) : (
                  campaigns.map((c) => <CampaignCard key={c.id} campaign={c} onUpdated={load} />)
                )}
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
                  {partners.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhum parceiro cadastrado ainda.
                    </p>
                  ) : (
                    partners.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Desconto de {p.discount_percentage}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                            Ativo
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditPartner(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => handleDeletePartner(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <PartnerDialog onCreated={load} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <PartnerDialog
        partner={editPartner}
        open={editPartnerOpen}
        onOpenChange={setEditPartnerOpen}
        onCreated={load}
      />
    </div>
  )
}
