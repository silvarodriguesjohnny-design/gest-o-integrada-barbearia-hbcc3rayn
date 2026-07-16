import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Plus, Share2, User, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { getAppointmentsByDate, createAppointment } from '@/services/appointments'
import { getCustomers } from '@/services/customers'
import { getServices } from '@/services/catalog'
import type { AppointmentWithRelations, CustomerWithDetails, Service } from '@/types'

export default function Agenda() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = (d: Date) => {
    setLoading(true)
    getAppointmentsByDate(d).then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setAppointments(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    if (date) load(date)
  }, [date])

  const copyLink = () => {
    navigator.clipboard.writeText('https://barberflow.app/book/minhabarbearia')
    toast({ title: 'Link copiado!', description: 'Envie para seus clientes agendarem online.' })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus horários e agendamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copyLink}
            className="transition-transform active:scale-95"
          >
            <Share2 className="h-4 w-4 mr-2" /> Link Público
          </Button>
          <NewBookingModal onCreated={() => date && load(date)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 h-fit hover:shadow-elevation transition-shadow">
          <CardContent className="p-3">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md mx-auto"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 hover:shadow-elevation transition-shadow">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Horários - {date?.toLocaleDateString('pt-BR')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum agendamento para esta data.
                </p>
              ) : (
                appointments.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-20 px-2 py-1.5 rounded-md bg-accent/10 text-accent shrink-0">
                      <Clock className="h-4 w-4 mb-1" />
                      <span className="font-bold">
                        {new Date(app.start_time).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center w-full">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                          Cliente
                        </p>
                        <p className="font-semibold flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> {app.customer?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                          Serviço
                        </p>
                        <p className="font-medium">{app.service?.name || 'N/A'}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                          Profissional
                        </p>
                        <p className="font-medium">{app.barber_name || '-'}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={app.status === 'completed' ? 'secondary' : 'default'}
                          className={
                            app.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : ''
                          }
                        >
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NewBookingModal({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [customerId, setCustomerId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [barber, setBarber] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([getCustomers(), getServices()]).then(([c, s]) => {
      if (c.data) setCustomers(c.data)
      if (s.data) setServices(s.data)
    })
  }, [])

  const handleSave = async () => {
    const service = services.find((s) => s.id === serviceId)
    if (!service || !customerId || !date || !time) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' })
      return
    }
    setLoading(true)
    const startTime = new Date(`${date}T${time}`)
    const { error } = await createAppointment({
      customer_id: customerId,
      service_id: serviceId,
      barber_name: barber,
      start_time: startTime.toISOString(),
      duration_minutes: service.duration_minutes,
    })
    setLoading(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Agendamento criado', description: 'O cliente receberá uma notificação.' })
      onCreated()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-white transition-transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                      {s.name} (R$ {s.price})
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
                  <SelectItem value="Thiago">Thiago</SelectItem>
                  <SelectItem value="Felipe">Felipe</SelectItem>
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
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading} className="bg-primary text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
