import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Gift,
  Loader2,
  Clock,
  Eye,
  Check,
  Ban,
  ArrowRight,
  UserCheck,
} from 'lucide-react'
import { getAdminDashboardData } from '@/services/admin-dashboard'
import { updateAppointmentStatus, cancelAppointment } from '@/services/appointments'
import { useToast } from '@/hooks/use-toast'
import { formatTimeHHMM, formatDateBR } from '@/lib/date-utils'
import type { AdminDashboardData } from '@/services/admin-dashboard'
import type { AppointmentWithRelations, AppointmentStatus } from '@/types'

const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Agendado', className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Concluído', className: 'bg-accent/15 text-accent' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    getAdminDashboardData().then(({ data, error }) => {
      if (error) {
        toast({
          title: 'Erro ao carregar dados',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setData(data)
      }
      setLoading(false)
    })
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleQuickAction = async (
    appt: AppointmentWithRelations,
    action: 'confirm' | 'complete' | 'cancel',
  ) => {
    setActionLoading(appt.id + action)
    let res: { error: any }
    if (action === 'cancel') {
      res = await cancelAppointment(appt.id, true)
    } else {
      const status = action === 'confirm' ? 'confirmed' : 'completed'
      res = await updateAppointmentStatus(appt.id, status)
    }
    setActionLoading(null)
    if (res.error) {
      toast({ title: 'Erro', description: res.error.message, variant: 'destructive' })
    } else {
      toast({
        title:
          action === 'confirm'
            ? 'Agendamento confirmado'
            : action === 'complete'
              ? 'Agendamento concluído'
              : 'Agendamento cancelado',
      })
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const d = data!
  const maxChartValue = Math.max(
    1,
    ...d.chart7Days.map((c) => c.confirmed + c.completed + c.cancelled + c.scheduled),
  )

  const chartConfig = {
    confirmed: { label: 'Confirmados', color: 'hsl(142 71% 45%)' },
    completed: { label: 'Concluídos', color: 'hsl(var(--chart-1))' },
    cancelled: { label: 'Cancelados', color: 'hsl(0 62.8% 50.6%)' },
    scheduled: { label: 'Agendados', color: 'hsl(215 20.2% 65.1%)' },
  }

  const pieConfig: Record<string, { label: string; color: string }> = {}
  d.topServices.forEach((s) => {
    pieConfig[s.name] = { label: s.name, color: s.fill }
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da plataforma —{' '}
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/cadastros')}>
          <UserCheck className="h-4 w-4 mr-2" /> Ver cadastros pendentes
        </Button>
      </div>

      {/* Métricas do dia */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{d.todayTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos os status</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{d.todayConfirmed}</div>
            <p className="text-xs text-muted-foreground mt-1">Status confirmado</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{d.todayCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Atendimentos finalizados</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5 hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              No-shows Hoje
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{d.todayCancelled}</div>
            <p className="text-xs text-destructive/80 mt-1">Cancelados / faltas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Comparecimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{d.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Concluídos vs agendados hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4 hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle>Agendamentos por Dia (7 dias)</CardTitle>
            <CardDescription>Volume de agendamentos por status nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.chart7Days} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    domain={[0, maxChartValue]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="confirmed"
                    stackId="a"
                    fill="var(--color-confirmed)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="var(--color-completed)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="scheduled"
                    stackId="a"
                    fill="var(--color-scheduled)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="cancelled"
                    stackId="a"
                    fill="var(--color-cancelled)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle>Serviços Mais Agendados</CardTitle>
            <CardDescription>Top 5 serviços concluídos (7 dias)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
            {d.topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Nenhum serviço concluído no período.
              </p>
            ) : (
              <ChartContainer config={pieConfig} className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={d.topServices}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {d.topServices.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
            {d.topServices.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {d.topServices.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.fill }} />
                    <span className="text-muted-foreground">
                      {s.name} ({s.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo fidelidade */}
      <Card className="border-accent/30 bg-accent/5 hover:shadow-elevation transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Gift className="h-5 w-5 text-accent" /> Resumo de Fidelidade
            </CardTitle>
            <CardDescription>Cartões fidelidade e recompensas liberadas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-3xl font-bold text-accent">{d.loyaltyReadyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes com recompensa liberada (is_reward_ready)
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-3xl font-bold">{d.stampsThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Carimbos contabilizados no mês atual
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabelas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Próximos agendamentos */}
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-serif text-xl">Próximos Agendamentos</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hover:bg-accent/10 hover:text-accent"
            >
              <Link to="/admin/agendamentos">
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.upcomingAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento próximo.
                    </TableCell>
                  </TableRow>
                ) : (
                  d.upcomingAppointments.map((appt) => {
                    const meta = STATUS_META[appt.status]
                    const isLoading =
                      actionLoading === appt.id + 'confirm' ||
                      actionLoading === appt.id + 'complete' ||
                      actionLoading === appt.id + 'cancel'
                    return (
                      <TableRow key={appt.id} className="hover:bg-muted/30">
                        <TableCell className="pl-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDateBR(appt.start_time)}</span>
                            <span className="text-muted-foreground">
                              {formatTimeHHMM(appt.start_time)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {appt.customer?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{appt.service?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={meta.className}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {appt.status === 'scheduled' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:bg-emerald-100 hover:text-emerald-600"
                                title="Confirmar"
                                disabled={isLoading}
                                onClick={() => handleQuickAction(appt, 'confirm')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:bg-accent/15 hover:text-accent"
                                title="Concluir"
                                disabled={isLoading}
                                onClick={() => handleQuickAction(appt, 'complete')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:bg-red-100 hover:text-red-600"
                                title="Cancelar"
                                disabled={isLoading}
                                onClick={() => handleQuickAction(appt, 'cancel')}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cadastros pendentes */}
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-serif text-xl">Cadastros Pendentes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hover:bg-accent/10 hover:text-accent"
            >
              <Link to="/admin/cadastros">
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Negócio</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right pr-4">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.pendingTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum cadastro pendente. 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  d.pendingTenants.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="pl-4 text-sm font-medium">{t.nome_negocio}</TableCell>
                      <TableCell className="text-sm">
                        <div>{t.full_name}</div>
                        <div className="text-xs text-muted-foreground">{t.email}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.cidade ? `${t.cidade}/${t.estado || ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="hover:bg-accent/10 hover:text-accent"
                        >
                          <Link to="/admin/cadastros">
                            <Eye className="h-4 w-4 mr-1" /> Analisar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
