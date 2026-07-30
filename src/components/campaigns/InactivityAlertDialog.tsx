import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Settings2, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getInactivityAlert, upsertInactivityAlert } from '@/services/inactivity'

const CHANNEL_OPTIONS = ['email', 'whatsapp', 'sms']

export function InactivityAlertDialog() {
  const { tenant } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [days, setDays] = useState(30)
  const [message, setMessage] = useState('')
  const [channels, setChannels] = useState<string[]>(['email'])
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (open && tenant) {
      setLoading(true)
      getInactivityAlert(tenant.id).then(({ data }) => {
        if (data) {
          setDays(data.days || 30)
          setMessage(data.message || '')
          setChannels(Array.isArray(data.channels) ? data.channels : ['email'])
          setActive(data.active ?? false)
        }
        setLoading(false)
      })
    }
  }, [open, tenant])

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]))
  }

  const handleSave = async () => {
    if (!tenant) return
    if (!message.trim()) {
      toast({ title: 'Informe a mensagem', variant: 'destructive' })
      return
    }
    if (channels.length === 0) {
      toast({ title: 'Selecione ao menos um canal', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await upsertInactivityAlert(tenant.id, {
      days,
      message,
      channels,
      active,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Alerta de inatividade salvo!' })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full transition-transform active:scale-95">
          <Settings2 className="h-4 w-4 mr-2" /> Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Configurar Alerta de Inatividade
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold">Dias de inatividade</Label>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Mensagem personalizada</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-24 resize-none"
                placeholder="Olá {nome}, sentimos sua falta! Agende seu horário e ganhe 10% de desconto."
              />
            </div>
            <div className="space-y-3">
              <Label className="font-semibold">Canais de envio</Label>
              <div className="flex flex-col gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <div key={ch} className="flex items-center gap-2">
                    <Checkbox
                      checked={channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    <Label className="capitalize cursor-pointer" onClick={() => toggleChannel(ch)}>
                      {ch}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label className="font-semibold">Ativo</Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
