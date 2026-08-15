import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Scissors,
  Clock,
  Loader2,
  CheckCircle2,
  CalendarClock,
  User,
  AlertCircle,
  Gift,
  Sparkles,
  Store,
  Wrench,
} from 'lucide-react'
import {
  getAppointmentByToken,
  confirmAppointmentByToken,
  type AppointmentConfirmationData,
} from '@/services/public-booking'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type ViewState = 'loading' | 'not_found' | 'confirmable' | 'confirmed' | 'already_used' | 'error'

export default function ConfirmAppointment() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()
  const [data, setData] = useState<AppointmentConfirmationData | null>(null)
  const [view, setView] = useState<ViewState>('loading')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setView('not_found')
      return
    }
    getAppointmentByToken(token)
      .then(({ data, error }) => {
        if (error || !data || !data.appointment) {
          setView('not_found')
          return
        }
        setData(data)
        const status = data.appointment.status
        if (status === 'confirmed') {
          setView('confirmed')
        } else if (status === 'scheduled') {
          setView('confirmable')
        } else {
          setView('already_used')
        }
      })
      .catch(() => setView('error'))
  }, [token])

  const handleConfirm = async () => {
    if (!token) return
    setSubmitting(true)
    const { data, error } = await confirmAppointmentByToken(token)
    setSubmitting(false)
    if (error) {
      const msg = error?.message || 'Não foi possível confirmar sua presença.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
      setView('error')
      return
    }
    if (data?.already_confirmed) {
      setView('confirmed')
      return
    }
    if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      setView('already_used')
      return
    }
    toast({ title: 'Presença confirmada!' })
    setView('confirmed')
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return ''
    try {
      const date = new Date(iso)
      if (isNaN(date.getTime())) return iso
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const parts = formatter.formatToParts(date)
      const day = parts.find((p) => p.type === 'day')?.value || '00'
      const month = parts.find((p) => p.type === 'month')?.value || '00'
      const year = parts.find((p) => p.type === 'year')?.value || '0000'
      const hour = parts.find((p) => p.type === 'hour')?.value || '00'
      const minute = parts.find((p) => p.type === 'minute')?.value || '00'
      return `${day}/${month}/${year}, ${hour}:${minute}`
    } catch {
      return iso
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />
      <main className="mx-auto max-w-xl px-4 md:px-6 py-6 md:py-10">
        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="mt-4 text-muted-foreground">Carregando agendamento…</p>
          </div>
        )}

        {view === 'not_found' && (
          <Card className="mt-6 border-destructive/30 animate-fade-in-up">
            <CardContent className="flex flex-col items-center text-center p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">Agendamento não encontrado</h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                O link de confirmação é inválido ou expirou. Verifique se você copiou o link
                completo recebido no WhatsApp.
              </p>
              <Badge variant="danger" className="mt-4">
                Link inválido
              </Badge>
            </CardContent>
          </Card>
        )}

        {view === 'error' && (
          <Card className="mt-6 border-destructive/30 animate-fade-in-up">
            <CardContent className="flex flex-col items-center text-center p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">Algo deu errado</h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Não foi possível carregar seu agendamento agora. Tente novamente em instantes.
              </p>
            </CardContent>
          </Card>
        )}

        {view === 'already_used' && data?.appointment && (
          <Card className="mt-6 border-warning/30 animate-fade-in-up">
            <CardContent className="flex flex-col items-center text-center p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 mb-4">
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
              <h1 className="text-xl font-bold">Este link não está mais disponível</h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Este agendamento não pode mais ser confirmado por este link
                {data.appointment.status === 'cancelled' && ' (foi cancelado)'}
                {data.appointment.status === 'completed' && ' (já foi concluído)'}.
              </p>
              <Badge variant="warning" className="mt-4">
                Indisponível
              </Badge>
            </CardContent>
          </Card>
        )}

        {(view === 'confirmable' || view === 'confirmed') && data?.appointment && (
          <div className="space-y-6 mt-2 animate-fade-in-up">
            {/* Header padronizado */}
            <header className="flex items-center gap-3 border-b pb-5">
              {data.appointment.tenant_logo_url ? (
                <img
                  src={data.appointment.tenant_logo_url}
                  alt={data.appointment.tenant_name || 'Barbearia'}
                  className="h-12 w-12 rounded-lg object-cover ring-2 ring-accent/20"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 ring-2 ring-accent/20">
                  <Scissors className="h-6 w-6 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {data.appointment.tenant_name}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                  <Store className="h-3 w-3" /> Confirmação de Presença
                </p>
              </div>
              {view === 'confirmed' && (
                <Badge variant="success" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado
                </Badge>
              )}
            </header>

            {view === 'confirmed' ? (
              <Card className="border-success/40 bg-success/5">
                <CardContent className="flex flex-col items-center text-center p-8">
                  <CheckCircle2 className="h-16 w-16 text-success mb-4 animate-bounce" />
                  <h2 className="text-2xl font-bold">Presença confirmada!</h2>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    Mostre esta tela ao chegar na barbearia.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {/* Detalhes do agendamento */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CalendarClock className="h-4 w-4 text-accent" /> Detalhes do agendamento
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <User className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold truncate">{data.appointment.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <Scissors className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Serviço</p>
                      <p className="font-semibold truncate">{data.appointment.service_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <CalendarClock className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Data e Hora</p>
                      <p className="font-semibold">{formatDate(data.appointment.start_time)}</p>
                    </div>
                  </div>
                  {data.appointment.barber_name && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                        <Wrench className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Profissional</p>
                        <p className="font-semibold truncate">{data.appointment.barber_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cartão fidelidade — 12 carimbos */}
            {data.loyalty && (
              <Card className="bg-muted/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold">Cartão Fidelidade</h3>
                    </div>
                    <Badge variant="amber">
                      {data.loyalty.stamps_count}/{data.loyalty.target}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    A cada visita concluída você ganha um carimbo. Com {data.loyalty.target}{' '}
                    carimbos, o próximo corte é por nossa conta!
                  </p>

                  {/* Carimbos — grid responsivo de 12 */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                    {Array.from({ length: data.loyalty.target }).map((_, i) => {
                      const filled = i < data.loyalty!.stamps_count
                      const isReward = i === data.loyalty!.target - 1
                      return (
                        <div
                          key={i}
                          className={cn(
                            'aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all',
                            filled
                              ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                              : isReward
                                ? 'border-accent/40 text-accent/60 bg-accent/5'
                                : 'border-border text-muted-foreground/40 bg-muted/40',
                          )}
                        >
                          {filled ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : isReward ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {data.loyalty.is_reward_ready ? (
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 p-3">
                      <Sparkles className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm font-semibold text-success">
                        Recompensa liberada! Resgate seu corte grátis no próximo agendamento.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm">
                      Você tem{' '}
                      <span className="font-bold text-accent">{data.loyalty.stamps_count}</span>{' '}
                      carimbo(s) — faltam{' '}
                      <span className="font-bold text-accent">{data.loyalty.remaining}</span> para a
                      recompensa.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botão confirmar */}
            {view === 'confirmable' && (
              <Button
                variant="amber"
                size="lg"
                loading={submitting}
                className="w-full shadow-lg"
                onClick={handleConfirm}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Presença
              </Button>
            )}

            {view === 'confirmed' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Agendamento confirmado em {formatDate(new Date().toISOString())}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
