import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Scissors,
  Clock,
  Loader2,
  CheckCircle2,
  CalendarDays,
  User,
  CalendarX,
  Sparkles,
  ArrowLeft,
  Store,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { ClientIdentification } from '@/components/public/ClientIdentification'
import {
  getTenantData,
  getSlots,
  createBooking,
  calculateSlotsWithSchedules,
  groupSlotsByPeriod,
  fetchMonthRawData,
  type PublicService,
  type PublicCustomer,
  type PublicBarberSchedule,
  type SlotAppointment,
  type MonthSlotData,
} from '@/services/public-booking'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

const fmtPrice = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PublicBooking() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { toast } = useToast()
  const [tenant, setTenant] = useState<any>(null)
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [customer, setCustomer] = useState<PublicCustomer | null>(null)
  const [selectedService, setSelectedService] = useState<PublicService | null>(null)
  const [barbers, setBarbers] = useState<string[]>([])
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [date, setDate] = useState(formatLocalDateYYYYMMDD(new Date()))
  const [appointments, setAppointments] = useState<SlotAppointment[]>([])
  const [barberSchedules, setBarberSchedules] = useState<PublicBarberSchedule[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [rawMonthData, setRawMonthData] = useState<Map<string, MonthSlotData>>(new Map())
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())

  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tenantId) return
    getTenantData(tenantId)
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(true)
        } else {
          setTenant(data.tenant)
          setServices(data.services)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId || loading) return
    setLoadingMonth(true)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    fetchMonthRawData(tenantId, year, month)
      .then((data) => {
        setRawMonthData(data)
        setLoadingMonth(false)
      })
      .catch(() => setLoadingMonth(false))
  }, [tenantId, currentMonth, loading])

  useEffect(() => {
    if (!selectedService || rawMonthData.size === 0) {
      setAvailableDates(new Set())
      return
    }
    const available = new Set<string>()
    for (const [dateStr, data] of rawMonthData) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const targetDate = new Date(y, m - 1, d)
      const slots = calculateSlotsWithSchedules(
        data.appointments,
        data.barber_schedules,
        selectedBarber,
        selectedService.duration_minutes,
        targetDate,
      )
      if (slots.some((s) => s.available)) {
        available.add(dateStr)
      }
    }
    setAvailableDates(available)
  }, [rawMonthData, selectedService, selectedBarber])

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
    }, 10000)
    return () => clearInterval(interval)
  }, [tenantId, date])

  const selectedDateObj = useMemo(() => {
    if (!date) return undefined
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [date])

  // Rola suavemente até o card-resumo quando um horário é selecionado (tablet/totem)
  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedSlot])

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
        title: 'Erro no agendamento',
        description: error.message || 'Este horário não está mais disponível.',
        variant: 'destructive',
      })
    } else {
      setDone(true)
      toast({ title: 'Agendamento confirmado!' })
    }
  }

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-sm text-muted-foreground">Carregando agendamento…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <CalendarX className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold">Barbearia não encontrada</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Não foi possível carregar os dados desta barbearia. Verifique o link ou tente novamente
          mais tarde.
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <Card className="max-w-md w-full border-success/40 bg-success/5">
          <CardContent className="flex flex-col items-center text-center p-8 animate-fade-in-up">
            <CheckCircle2 className="h-16 w-16 text-success mb-4 animate-bounce" />
            <h1 className="text-2xl font-bold">Agendamento Confirmado!</h1>
            <p className="text-muted-foreground mt-2">
              {customer?.name}, seu horário foi reservado com sucesso.
            </p>
            <Badge variant="success" className="mt-4">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado
            </Badge>
            <Button
              variant="amber"
              size="lg"
              className="mt-6 w-full min-h-[56px] touch-manipulation"
              onClick={() => {
                setDone(false)
                setSelectedService(null)
                setSelectedSlot('')
              }}
            >
              Fazer Novo Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [y, m, d] = date ? date.split('-').map(Number) : [2026, 1, 1]
  const targetDate = new Date(y, m - 1, d)

  const slots = selectedService
    ? calculateSlotsWithSchedules(
        appointments,
        barberSchedules,
        selectedBarber,
        selectedService.duration_minutes,
        targetDate,
      )
    : []

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />
      {/* Header sticky padronizado — 64px de altura em tablet+ */}
      <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-2xl flex h-full items-center gap-3 px-4 md:px-6">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover ring-2 ring-accent/20"
            />
          ) : (
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-accent/10 ring-2 ring-accent/20">
              <Scissors className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">{tenant?.name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" /> Agendamento Online
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {!customer ? (
          <div className="animate-fade-in-up">
            <ClientIdentification tenantId={tenantId!} onIdentified={setCustomer} />
          </div>
        ) : !selectedService ? (
          <div className="space-y-6 md:space-y-8 animate-fade-in-up">
            {/* Cliente identificado */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Bem-vindo</p>
                <p className="font-semibold truncate">{customer.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                onClick={() => {
                  setCustomer(null)
                  setSelectedService(null)
                  setSelectedSlot('')
                }}
              >
                Trocar
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold">Escolha um serviço</h2>
              <Badge variant="amber">{services.length} disponíveis</Badge>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center text-center py-10">
                  <CalendarX className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {services.map((s) => (
                  <Card
                    key={s.id}
                    className="touch-card cursor-pointer hover:border-accent hover:shadow-md active:scale-[0.98]"
                    onClick={() => setSelectedService(s)}
                  >
                    <CardContent className="flex items-center justify-between gap-4 p-4 md:p-5 min-h-[56px]">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          <Scissors className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base md:text-lg truncate">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="font-normal">
                              <Clock className="h-3 w-3 mr-1" /> {s.duration_minutes} min
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg md:text-xl font-bold text-accent">
                          {fmtPrice(s.price)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Selecionar
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8 animate-fade-in-up">
            {/* Resumo do serviço selecionado */}
            <Card className="bg-muted/30 border-accent/30">
              <CardContent className="flex items-center justify-between gap-3 p-4 min-h-[56px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                    <Scissors className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{selectedService.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmtPrice(selectedService.price)} · {selectedService.duration_minutes} min
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                  onClick={() => setSelectedService(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Trocar
                </Button>
              </CardContent>
            </Card>

            {/* Seleção de profissional */}
            {barbers.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm md:text-base font-semibold">
                  Selecione o Profissional
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedBarber === null ? 'amber' : 'outline'}
                    size="sm"
                    className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                    onClick={() => setSelectedBarber(null)}
                  >
                    Qualquer Profissional
                  </Button>
                  {barbers.map((b) => (
                    <Button
                      key={b}
                      variant={selectedBarber === b ? 'amber' : 'outline'}
                      size="sm"
                      className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                      onClick={() => setSelectedBarber(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Calendário — células e navegação otimizadas para toque */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <CalendarDays className="h-4 w-4 text-accent" /> Data do Atendimento
              </Label>
              <div className="relative">
                {loadingMonth && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                )}
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={(selectedDate) => {
                    if (selectedDate) setDate(formatLocalDateYYYYMMDD(selectedDate))
                  }}
                  disabled={(checkDate: Date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (checkDate < today) return true
                    if (loadingMonth) return true
                    const dateStr = formatLocalDateYYYYMMDD(checkDate)
                    return !availableDates.has(dateStr)
                  }}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  fromDate={new Date()}
                  locale={ptBR}
                  className="rounded-lg border border-border bg-card p-2 md:p-3 w-full [--cell-size:44px] md:[--cell-size:56px]"
                  classNames={{
                    day_selected:
                      'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground rounded-md font-bold',
                    day_today: 'ring-2 ring-accent text-accent rounded-md',
                    day_disabled: 'text-muted-foreground/30 line-through cursor-not-allowed',
                    weekday:
                      'text-muted-foreground font-normal text-xs md:text-sm flex-1 text-center',
                    caption_label: 'text-sm md:text-base font-semibold',
                    month: 'flex w-full flex-col gap-4',
                    table: 'w-full border-collapse',
                    button_previous:
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                    button_next:
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                    day: cn(
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                      'group/day relative flex w-full items-center justify-center select-none p-0 text-center',
                    ),
                  }}
                />
              </div>
              {availableDates.size === 0 && !loadingMonth && selectedService && (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma data disponível neste mês. Tente o próximo mês.
                </p>
              )}
            </div>

            {/* Horários — chips de 56px com scroll horizontal suave por período */}
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground mt-2">Carregando horários…</p>
              </div>
            ) : slots.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CalendarX className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum horário disponível para a data selecionada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                {groupSlotsByPeriod(slots).map((group) => {
                  const availableCount = group.slots.filter((s) => s.available).length
                  return (
                    <div key={group.period} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-base md:text-lg font-semibold">
                          <Clock className="h-4 w-4 md:h-5 md:w-5 text-accent" /> {group.period}
                        </span>
                        <Badge variant={availableCount > 0 ? 'success' : 'outline'}>
                          {availableCount} livres
                        </Badge>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
                        {group.slots.map((slot) => (
                          <Button
                            key={slot.time}
                            type="button"
                            variant={selectedSlot === slot.time ? 'amber' : 'outline'}
                            size="sm"
                            disabled={!slot.available}
                            className={cn(
                              'flex flex-col items-center justify-center gap-0.5 py-2 px-3',
                              'min-h-[56px] min-w-[80px] shrink-0 snap-start',
                              'touch-manipulation active:scale-95 transition-transform',
                              '[&:disabled]:active:scale-100',
                              !slot.available &&
                                'opacity-50 bg-muted/60 cursor-not-allowed border-dashed line-through',
                            )}
                            onClick={() => slot.available && setSelectedSlot(slot.time)}
                          >
                            <span className="font-semibold text-base">{slot.time}</span>
                            <span
                              className={cn(
                                'text-[10px] font-normal',
                                slot.available
                                  ? 'text-success font-medium'
                                  : 'text-destructive font-medium',
                              )}
                            >
                              {slot.available ? 'Disponível' : 'Indisponível'}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Resumo final + confirmação — grid 2 colunas, fonte grande, botão 56px */}
            {selectedSlot && (
              <Card ref={summaryRef} className="border-accent/40 shadow-md scroll-mt-20">
                <CardContent className="p-4 md:p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm md:text-base">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                    <span className="font-semibold">Resumo do agendamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Serviço</p>
                      <p className="text-base md:text-lg font-medium truncate">
                        {selectedService.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Profissional</p>
                      <p className="text-base md:text-lg font-medium truncate">
                        {selectedBarber || 'Qualquer um'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Data</p>
                      <p className="text-base md:text-lg font-medium">
                        {selectedDateObj?.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Horário</p>
                      <p className="text-base md:text-lg font-medium">{selectedSlot}</p>
                    </div>
                    <div className="col-span-2 border-t pt-2 flex justify-between items-center">
                      <span className="text-sm md:text-base text-muted-foreground">Valor</span>
                      <span className="text-lg md:text-xl font-bold text-accent">
                        {fmtPrice(selectedService.price)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="amber"
                    size="lg"
                    loading={booking}
                    className="w-full min-h-[56px] text-base md:text-lg touch-manipulation shadow-lg"
                    onClick={handleBook}
                  >
                    {booking ? 'Confirmando…' : `Confirmar Agendamento para ${selectedSlot}`}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
