import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scissors, Clock, User, Loader2, CalendarX, AlertCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  getPublicBarberAgenda,
  type PublicBarberAppointment,
} from '@/services/barber-public-agenda'
import type { AppointmentStatus } from '@/types'

const STATUS_STYLES: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: {
    label: 'Agendado',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-gray-200 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
  },
}

function formatTimeHHMM(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '--:--'
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return '--:--'
  }
}

function formatDayLabel(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const today = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(today)
    const apptDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
    if (todayStr === apptDayStr) return 'Hoje'
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

type ViewState = 'loading' | 'not_found' | 'ready'

export default function BarberPublicAgenda() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<ViewState>('loading')
  const [barberName, setBarberName] = useState<string>('')
  const [appointments, setAppointments] = useState<PublicBarberAppointment[]>([])

  useEffect(() => {
    if (!token) {
      setView('not_found')
      return
    }
    getPublicBarberAgenda(token)
      .then(({ data, error }) => {
        if (error || !data) {
          setView('not_found')
          return
        }
        setBarberName(data.barber.name)
        setAppointments(data.appointments)
        setView('ready')
      })
      .catch(() => setView('not_found'))
  }, [token])

  // Group appointments by day label
  const grouped = (() => {
    const map = new Map<string, PublicBarberAppointment[]>()
    for (const a of appointments) {
      const key = formatDayLabel(a.start_time) || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries())
  })()

  return (
    <div className="relative min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.08),_transparent_50%)]">
      <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />

      {/* Theme toggle (top-right) */}
      <div className="absolute top-3 right-3 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="mt-4 text-muted-foreground">Carregando agenda…</p>
          </div>
        )}

        {view === 'not_found' && (
          <Card className="mt-12 border-destructive/30">
            <CardContent className="flex flex-col items-center text-center p-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h1 className="text-xl font-bold">Link inválido ou barbeiro não encontrado</h1>
              <p className="text-muted-foreground mt-2">
                Verifique o link com o barbeiro ou a barbearia.
              </p>
            </CardContent>
          </Card>
        )}

        {view === 'ready' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <header className="flex flex-col items-center text-center pt-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 ring-2 ring-accent/30 mb-3">
                <Scissors className="h-8 w-8 text-accent" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif">{barberName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Agenda do barbeiro</p>
            </header>

            {/* Appointments */}
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center text-center p-10">
                  <CalendarX className="h-10 w-10 text-muted-foreground mb-3" />
                  <h2 className="text-lg font-semibold">Nenhum agendamento para hoje</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Quando houver novos horários, eles aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {grouped.map(([dayLabel, appts]) => (
                  <div key={dayLabel} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {dayLabel}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-2">
                      {appts.map((a) => {
                        const status = STATUS_STYLES[a.status] || {
                          label: a.status,
                          className: '',
                        }
                        return (
                          <Card key={a.id} className="overflow-hidden">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center w-16 px-2 py-1.5 rounded-md bg-accent/10 text-accent shrink-0">
                                <Clock className="h-4 w-4 mb-1" />
                                <span className="font-bold text-sm">
                                  {formatTimeHHMM(a.start_time)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold flex items-center gap-1.5 truncate">
                                  <User className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{a.customer_name || 'Cliente'}</span>
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {a.service_name || 'Serviço'}
                                </p>
                              </div>
                              <Badge variant="outline" className={status.className}>
                                {status.label}
                              </Badge>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <footer className="text-center text-xs text-muted-foreground/60 pt-4">
              <p className="flex items-center justify-center gap-1.5">
                <Scissors className="h-3.5 w-3.5" />
                <span className="font-serif">na régua</span>
              </p>
            </footer>
          </div>
        )}
      </div>
    </div>
  )
}
