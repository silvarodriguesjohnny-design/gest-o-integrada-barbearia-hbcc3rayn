import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { db } from '@/services/db'
import { useToast } from '@/hooks/use-toast'
import { formatTimeHHMM, formatDateBR } from '@/lib/date-utils'
import type { AppointmentWithRelations, AppointmentStatus } from '@/types'
import { EditAppointmentDialog } from '@/components/agenda/EditAppointmentDialog'
import { getUniqueBarbers } from '@/services/appointments'

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; variant: 'info' | 'success' | 'amber' | 'danger' }
> = {
  scheduled: { label: 'Agendado', variant: 'info' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  completed: { label: 'Concluído', variant: 'amber' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
}

export default function AdminAgendamentos() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [services, setServices] = useState<any[]>([])
  const [barbers, setBarbers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AppointmentWithRelations | null>(null)

  const load = () => {
    Promise.all([
      db
        .from('appointments')
        .select(
          '*, customer:customers(id, name, phone), service:services(id, name, price, duration_minutes)',
        )
        .order('start_time', { ascending: false })
        .limit(200),
      db.from('services').select('*'),
      getUniqueBarbers(),
    ]).then(([apptRes, svcRes, barbRes]) => {
      if (apptRes.error)
        toast({ title: 'Erro', description: apptRes.error.message, variant: 'destructive' })
      setAppointments(apptRes.data || [])
      setServices(svcRes.data || [])
      setBarbers(barbRes.data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments
    const q = search.toLowerCase()
    return appointments.filter(
      (a) =>
        a.customer?.name?.toLowerCase().includes(q) ||
        a.service?.name?.toLowerCase().includes(q) ||
        a.barber_name?.toLowerCase().includes(q),
    )
  }, [appointments, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Todos os agendamentos da plataforma (últimos 200).
        </p>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-serif text-xl">Lista de Agendamentos</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente, serviço..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Data/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((appt) => {
                  const meta = STATUS_META[appt.status]
                  return (
                    <TableRow key={appt.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6 text-sm">
                        {formatDateBR(appt.start_time)} {formatTimeHHMM(appt.start_time)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {appt.customer?.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{appt.service?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{appt.barber_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-accent/10 hover:text-accent"
                          onClick={() => setEditing(appt)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditAppointmentDialog
        appointment={editing}
        barbers={barbers}
        services={services}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onUpdated={load}
      />
    </div>
  )
}
