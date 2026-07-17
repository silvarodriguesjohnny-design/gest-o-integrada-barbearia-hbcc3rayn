import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PlayCircle, Loader2 } from 'lucide-react'
import { updateCampaign } from '@/services/campaigns'
import { useToast } from '@/hooks/use-toast'
import type { Campaign } from '@/types'

export function CampaignCard({
  campaign,
  onUpdated,
}: {
  campaign: Campaign
  onUpdated: () => void
}) {
  const { toast } = useToast()
  const [discount, setDiscount] = useState(String(campaign.discount_percentage || 0))
  const [message, setMessage] = useState(campaign.message_template || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updateCampaign(campaign.id, {
      discount_percentage: Number(discount) || 0,
      message_template: message,
      auto_trigger: !campaign.auto_trigger,
      is_active: true,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Campanha atualizada!', description: 'Configurações salvas com sucesso.' })
      onUpdated()
    }
  }

  const handleToggle = async (active: boolean) => {
    const { error } = await updateCampaign(campaign.id, { is_active: active })
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else onUpdated()
  }

  return (
    <div
      className={`border rounded-lg p-5 space-y-4 bg-card shadow-sm hover:border-accent/50 transition-colors ${!campaign.is_active ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-lg font-bold font-serif">{campaign.title}</Label>
          <p className="text-sm text-muted-foreground">
            {campaign.auto_trigger ? 'Disparo automático ativo' : 'Disparo manual'}
          </p>
        </div>
        <Switch checked={campaign.is_active} onCheckedChange={handleToggle} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold">Desconto (%)</Label>
          <Input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-semibold">Mensagem (WhatsApp)</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-24 resize-none"
        />
      </div>
      <Button
        className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <PlayCircle className="h-4 w-4 mr-2" />
        )}
        {campaign.auto_trigger ? 'Desativar Auto' : 'Salvar e Ativar'}
      </Button>
    </div>
  )
}
