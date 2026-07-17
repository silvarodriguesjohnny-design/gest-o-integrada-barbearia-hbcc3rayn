import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Loader2 } from 'lucide-react'
import { createCampaign } from '@/services/campaigns'
import { useToast } from '@/hooks/use-toast'

export function NewCampaignDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [discount, setDiscount] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState('')
  const [autoTrigger, setAutoTrigger] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title) {
      toast({ title: 'Informe o título da campanha', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await createCampaign({
      title,
      discount_percentage: Number(discount) || 0,
      start_date: startDate || null,
      end_date: endDate || null,
      message_template: message || null,
      auto_trigger: autoTrigger,
      is_active: true,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Campanha criada!', description: `${title} foi adicionada.` })
      setTitle('')
      setDiscount('0')
      setStartDate('')
      setEndDate('')
      setMessage('')
      setAutoTrigger(false)
      setOpen(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Nova Campanha</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Dia dos Pais"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Desconto (%)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-2 flex items-center gap-3 pt-6">
              <Switch checked={autoTrigger} onCheckedChange={setAutoTrigger} />
              <Label className="font-semibold">Disparo automático</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Mensagem (WhatsApp)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-24 resize-none"
              placeholder="Use {nome} e {link} como variáveis"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
