import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Ban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateAppointment, cancelAppointment } from '@/services/appointments'
import type { AppointmentWithRelations, Service } from '@/types'

interface Props {
  appointment: AppointmentWithRelations | null
  barbers: string[]
  services: Service[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditAppointmentDialog({
  appointment,
  barbers,
  services,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const { toast } = useToast()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [barber, setBarber] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [notify, setNotify] = useState(true)

  useEffect(() => {
    if (appointment) {
      const dt = new Date(appointment.start_time)
      setDate(dt.toISOString().slice(0, 10))
      setTime(dt.toTimeString().slice(0, 5))
      setBarber(appointment.barber_name || '')
      setServiceId(appointment.service_id || '')
    }
  }, [appointment])

  const handleSave = async () => {
    if (!appointment || !date || !time || !serviceId) return
    const service = services.find((s) => s.id === serviceId)
    const start = new Date(`${date}T${time}`)
    const end = new Date(start.getTime() + (service?.duration_minutes || 30) * 60000)
    setSaving(true)
    const { error } = await updateAppointment(appointment.id, {
      barber_name: barber || null,
      service_id: serviceId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    setSaving(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Agendamento atualizado!' })
      onOpenChange(false)
      onUpdated()
    }
  }

  const handleCancel = async () => {
    if (!appointment) return
    setCanceling(true)
    const { error } = await cancelAppointment(appointment.id, notify)
    setCanceling(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Agendamento cancelado!' })
      onOpenChange(false)
      onUpdated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Editar Agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Profissional</Label>
              <Select value={barber} onValueChange={setBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            <Label className="text-sm cursor-pointer" onClick={() => setNotify(!notify)}>
              Notificar cliente sobre mudanças
            </Label>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleCancel} disabled={canceling}>
            {canceling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}{' '}
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
