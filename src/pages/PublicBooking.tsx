import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scissors, Clock, Loader2, CheckCircle2, Calendar, User, CalendarX } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ClientIdentification } from '@/components/public/ClientIdentification'
import {
  getTenantData,
  getSlots,
  createBooking,
  calculateSlotsWithSchedules,
  groupSlotsByPeriod,
  type PublicService,
  type PublicCustomer,
  type PublicBarberSchedule,
  type SlotAppointment,
} from '@/services/public-booking'
import { cn } from '@/lib/utils'

export default function PublicBooking() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { toast } = useToast()
  const [tenant, setTenant] = useState<any>(null)
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<PublicCustomer | null>(null)
  const [selectedService, setSelectedService] = useState<PublicService | null>(null)
  const [barbers, setBarbers] = useState<string[]>([])
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [appointments, setAppointments] = useState<SlotAppointment[]>([])
  const [barberSchedules, setBarberSchedules] = useState<PublicBarberSchedule[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    getTenantData(tenantId).then(({ data }) => {
      if (data) {
        setTenant(data.tenant)
        setServices(data.services)
      }
      setLoading(false)
    })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId || !date) return
    setLoadingSlots(true)
    setSelectedSlot('')
    getSlots(tenantId, date).then(({ data }) => {
      if (data) {
        setAppointments(data.appointments || [])
        setBarbers(data.barbers || [])
        setBarberSchedules(data.barber_schedules || [])
      }
      setLoadingSlots(false)
    })
  }, [tenantId, date])

  useEffect(() => {
    if (!tenantId || !date) return
    const interval = setInterval(() => {
      getSlots(tenantId, date).then(({ data }) => {
        if (data) {
          setAppointments(data.appointments || [])
          setBarbers(data.barbers || [])
          setBarberSchedules(data.barber_schedules || [])
        }
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [tenantId, date])

  const handleBook = async () => {
    if (!tenantId || !selectedService || !selectedSlot || !customer) return
    setBooking(true)
    const { error } = await createBooking({
      tenant_id: tenantId,
      service_id: selectedService.id,
      customer_id: customer.id,
      barber_name: selectedBarber,
      date,
      time: selectedSlot,
    })
    setBooking(false)
    if (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao agendar.',
        variant: 'destructive',
      })
    } else {
      setDone(true)
      toast({ title: 'Agendamento confirmado!' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold">Agendamento Confirmado!</h1>
        <p className="text-muted-foreground mt-2">{customer?.name}, seu horário foi reservado.</p>
        <Button
          className="mt-6"
          onClick={() => {
            setDone(false)
            setSelectedService(null)
            setSelectedSlot('')
          }}
        >
          Novo Agendamento
        </Button>
      </div>
    )
  }

  const slots = selectedService
    ? calculateSlotsWithSchedules(
        appointments,
        barberSchedules,
        selectedBarber,
        selectedService.duration_minutes,
        new Date(date),
      )
    : []

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Scissors className="h-6 w-6 text-accent" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{tenant?.name}</h1>
            <p className="text-sm text-muted-foreground">Agende seu horário</p>
          </div>
        </div>

        {!customer ? (
          <ClientIdentification tenantId={tenantId!} onIdentified={setCustomer} />
        ) : !selectedService ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              <span className="font-semibold">Olá, {customer.name}!</span>
            </div>
            <h2 className="text-lg font-semibold">Escolha um serviço</h2>
            {services.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:shadow-elevation transition-shadow"
                onClick={() => setSelectedService(s)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-lg font-bold text-accent">R$ {s.price}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedService.name}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {selectedService.price} · {selectedService.duration_minutes} min
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedService(null)}>
                Trocar
              </Button>
            </div>

            {barbers.length > 0 && (
              <div className="space-y-2">
                <Label>Profissional</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedBarber === null ? 'default' : 'outline'}
                    size="sm"
                    className={cn(selectedBarber === null && 'bg-accent text-white')}
                    onClick={() => setSelectedBarber(null)}
                  >
                    Qualquer
                  </Button>
                  {barbers.map((b) => (
                    <Button
                      key={b}
                      variant={selectedBarber === b ? 'default' : 'outline'}
                      size="sm"
                      className={cn(selectedBarber === b && 'bg-accent text-white')}
                      onClick={() => setSelectedBarber(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {barbers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Nenhum profissional disponível para agendamento online no momento.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Data
              </Label>
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {loadingSlots ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum horário disponível para esta data.
              </p>
            ) : (
              groupSlotsByPeriod(slots).map((group) => (
                <div key={group.period} className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {group.period}{' '}
                    <span className="text-xs">
                      ({group.slots.filter((s) => s.available).length} disponíveis)
                    </span>
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {group.slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot === slot.time ? 'default' : 'outline'}
                        size="sm"
                        disabled={!slot.available}
                        className={cn(
                          selectedSlot === slot.time && 'bg-accent text-white',
                          !slot.available && 'opacity-40 cursor-not-allowed line-through bg-muted',
                        )}
                        onClick={() => slot.available && setSelectedSlot(slot.time)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}

            {selectedSlot && (
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-white"
                disabled={booking}
                onClick={handleBook}
              >
                {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Agendamento
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
