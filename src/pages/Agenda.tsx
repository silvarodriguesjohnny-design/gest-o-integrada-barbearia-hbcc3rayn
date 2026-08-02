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
import { Clock, Plus, Share2, User, Loader2, MessageCircle, Pencil, CalendarX } from 'lucide-react'
import { EditAppointmentDialog } from '@/components/agenda/EditAppointmentDialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import {
  getAppointmentsByDate,
  createAppointment,
  getUniqueBarbers,
  getBarberSchedules,
} from '@/services/appointments'
import { getCustomers } from '@/services/customers'
import { getServices } from '@/services/catalog'
import {
  calculateSlotsWithSchedules,
  groupSlotsByPeriod,
  type PublicBarberSchedule,
  type SlotAppointment,
} from '@/services/public-booking'
import {
  formatTimeHHMM,
  formatDateBR,
  formatLocalDateYYYYMMDD,
  buildIsoString,
} from '@/lib/date-utils'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { AppointmentWithRelations, CustomerWithDetails, Service } from '@/types'

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Agendado', class: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  confirmed: { label: 'Confirmado', class: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
  completed: { label: 'Concluído', class: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
  cancelled: { label: 'Cancelado', class: 'bg-red-100 text-red-800 hover:bg-red-200' },
}

export default function Agenda() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [barbers, setBarbers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [editingAppt, setEditingAppt] = useState<AppointmentWithRelations | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [allServices, setAllServices] = useState<Service[]>([])
  const { toast } = useToast()
  const { tenant } = useAuth()

  const load = (d: Date) => {
    setLoading(true)
    getAppointmentsByDate(d).then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setAppointments(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    getUniqueBarbers().then(({ data }) => {
      if (data) setBarbers(data)
    })
    getServices().then(({ data }) => {
      if (data) setAllServices(data)
    })
  }, [])

  useEffect(() => {
    if (date) load(date)
  }, [date])

  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        if (date) load(date)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [date])

  const bookingLink = `${window.location.origin}/book/${tenant?.id || ''}`

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink)
    toast({ title: 'Link copiado!', description: 'Envie para seus clientes agendarem online.' })
  }

  const filteredAppointments =
    selectedBarber === 'all'
      ? appointments
      : appointments.filter((a) => a.barber_name === selectedBarber)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus horários e agendamentos.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={copyLink}
            className="transition-transform active:scale-95"
          >
            <Share2 className="h-4 w-4 mr-2" /> Link Público
          </Button>
          {tenant?.whatsapp_phone && (
            <a
              href={`https://wa.me/${tenant.whatsapp_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de agendar um horário.')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-transform active:scale-95"
              >
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </a>
          )}
          <NewBookingModal onCreated={() => date && load(date)} barbers={barbers} />
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
            <div className="flex items-center justify-between">
              <CardTitle>Horários - {formatDateBR(date)}</CardTitle>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : filteredAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum agendamento para esta data.
                </p>
              ) : (
                filteredAppointments.map((app) => {
                  const statusInfo = STATUS_LABELS[app.status] || {
                    label: app.status,
                    class: '',
                  }
                  return (
                    <div
                      key={app.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center w-20 px-2 py-1.5 rounded-md bg-accent/10 text-accent shrink-0">
                        <Clock className="h-4 w-4 mb-1" />
                        <span className="font-bold text-sm">{formatTimeHHMM(app.start_time)}</span>
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
                        <div className="text-right flex items-center justify-end gap-1">
                          <Badge variant="outline" className={statusInfo.class}>
                            {statusInfo.label}
                          </Badge>
                          {app.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingAppt(app)
                                setEditOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <EditAppointmentDialog
        appointment={editingAppt}
        barbers={barbers}
        services={allServices}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={() => date && load(date)}
      />
    </div>
  )
}

function NewBookingModal({ onCreated, barbers }: { onCreated: () => void; barbers: string[] }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [schedules, setSchedules] = useState<PublicBarberSchedule[]>([])
  const [existingAppts, setExistingAppts] = useState<SlotAppointment[]>([])

  const [customerId, setCustomerId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [barber, setBarber] = useState('')
  const [date, setDate] = useState(formatLocalDateYYYYMMDD(new Date()))
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([getCustomers(), getServices(), getBarberSchedules()]).then(([c, s, sch]) => {
        if (c.data) setCustomers(c.data)
        if (s.data) setServices(s.data)
        if (sch.data) setSchedules(sch.data)
      })
    }
  }, [open])

  useEffect(() => {
    if (open && date) {
      const [year, month, day] = date.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      getAppointmentsByDate(selectedDate).then(({ data }) => {
        if (data) {
          setExistingAppts(
            data.map((a) => ({
              start_time: a.start_time,
              end_time: a.end_time,
              barber_name: a.barber_name,
              status: a.status,
            })),
          )
        }
      })
    }
  }, [open, date])

  const selectedServiceObj = services.find((s) => s.id === serviceId)
  const duration = selectedServiceObj?.duration_minutes || 30

  const [y, m, d] = date ? date.split('-').map(Number) : [2026, 1, 1]
  const targetDate = new Date(y, m - 1, d)

  const slots = serviceId
    ? calculateSlotsWithSchedules(existingAppts, schedules, barber || null, duration, targetDate)
    : []

  const handleSave = async () => {
    if (!serviceId || !customerId || !date || !selectedSlot) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    setLoading(true)
    const startTimeIso = buildIsoString(date, selectedSlot)

    const { error } = await createAppointment({
      customer_id: customerId,
      service_id: serviceId,
      barber_name: barber || undefined,
      start_time: startTimeIso,
      duration_minutes: duration,
    })
    setLoading(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Agendamento criado', description: 'Horário reservado com sucesso.' })
      setOpen(false)
      setSelectedSlot('')
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-white transition-transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
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
              <Select
                value={serviceId}
                onValueChange={(val) => {
                  setServiceId(val)
                  setSelectedSlot('')
                }}
              >
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
              <Select
                value={barber}
                onValueChange={(val) => {
                  setBarber(val)
                  setSelectedSlot('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer" />
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

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setSelectedSlot('')
              }}
            />
          </div>

          {serviceId && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-semibold">Horários Disponíveis</Label>
              {slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <CalendarX className="h-8 w-8 mb-2" />
                  <p className="text-sm">Nenhum horário cadastrado para esta data.</p>
                </div>
              ) : (
                groupSlotsByPeriod(slots).map((group) => (
                  <div key={group.period} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {group.period}{' '}
                      <span className="font-normal text-[11px]">
                        ({group.slots.filter((s) => s.available).length} livres)
                      </span>
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {group.slots.map((slot) => (
                        <Button
                          key={slot.time}
                          type="button"
                          variant={selectedSlot === slot.time ? 'default' : 'outline'}
                          size="sm"
                          disabled={!slot.available}
                          className={cn(
                            'flex flex-col items-center py-1.5 h-auto text-xs',
                            selectedSlot === slot.time &&
                              'bg-accent text-white font-bold ring-2 ring-accent',
                            !slot.available &&
                              'opacity-50 bg-muted/60 cursor-not-allowed border-dashed line-through',
                          )}
                          onClick={() => slot.available && setSelectedSlot(slot.time)}
                        >
                          <span className="font-semibold text-sm">{slot.time}</span>
                          <span
                            className={cn(
                              'text-[10px] font-normal',
                              slot.available
                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-destructive font-medium',
                            )}
                          >
                            {slot.available ? 'Disponível' : 'Indisponível'}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading || !selectedSlot}
            className="bg-accent hover:bg-accent/90 text-white w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
