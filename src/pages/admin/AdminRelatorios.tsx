import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Receipt,
  Scissors,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Filter,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'
import {
  fetchReportAppointments,
  fetchReportTenants,
  fetchReportServices,
  computeSummary,
  computeBilling,
} from '@/services/reports'
import type {
  ReportAppointment,
  ReportTenant,
  ReportService,
  ReportSummary,
  BillingRow,
} from '@/services/reports'
import {
  exportAppointmentsCsv,
  exportAppointmentsPdf,
  exportBillingCsv,
  exportBillingPdf,
} from '@/lib/reports-export'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function defaultStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return formatLocalDateYYYYMMDD(d)
}

function defaultEnd(): string {
  return formatLocalDateYYYYMMDD(new Date())
}

export default function AdminRelatorios() {
  const { toast } = useToast()

  const [tenants, setTenants] = useState<ReportTenant[]>([])
  const [services, setServices] = useState<ReportService[]>([])

  const [startDate, setStartDate] = useState(defaultStart())
  const [endDate, setEndDate] = useState(defaultEnd())
  const [tenantId, setTenantId] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [serviceId, setServiceId] = useState<string>('all')

  const [appointments, setAppointments] = useState<ReportAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  // Load filter options once
  useEffect(() => {
    Promise.all([fetchReportTenants(), fetchReportServices('all')]).then(([tRes, sRes]) => {
      if (tRes.error) {
        toast({ title: 'Erro', description: tRes.error.message, variant: 'destructive' })
      } else {
        setTenants(tRes.data || [])
      }
      if (sRes.error) {
        toast({ title: 'Erro', description: sRes.error.message, variant: 'destructive' })
      } else {
        setServices(sRes.data || [])
      }
    })
  }, [toast])

  // Reload services when tenant filter changes (scoped list)
  useEffect(() => {
    if (tenantId === 'all') {
      fetchReportServices('all').then(({ data }) => setServices(data || []))
    } else {
      fetchReportServices(tenantId).then(({ data }) => {
        setServices(data || [])
        setServiceId('all')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchReportAppointments({
      startDate,
      endDate,
      tenantId,
      status: status as any,
      serviceId,
    })
    if (error) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' })
      setAppointments([])
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }, [startDate, endDate, tenantId, status, serviceId, toast])

  useEffect(() => {
    load()
  }, [load])

  const summary: ReportSummary = useMemo(() => computeSummary(appointments), [appointments])
  const billing: BillingRow[] = useMemo(() => computeBilling(appointments), [appointments])

  const tenantName =
    tenantId === 'all'
      ? 'Todas as Barbearias'
      : tenants.find((t) => t.id === tenantId)?.name || 'Barbearia'

  const safeExport = async (key: string, fn: () => void, successMsg: string) => {
    if (appointments.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'Não há agendamentos no período selecionado.',
        variant: 'destructive',
      })
      return
    }
    setExporting(key)
    try {
      // allow spinner to render
      await new Promise((r) => setTimeout(r, 50))
      fn()
      toast({ title: 'Exportação concluída', description: successMsg })
    } catch (e: any) {
      toast({
        title: 'Erro na exportação',
        description: e?.message || 'Falha ao gerar arquivo.',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">
          Exporte relatórios de agendamentos e faturamento em CSV e PDF.
        </p>
      </div>

      {/* Filtros */}
      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Filter className="h-5 w-5 text-accent" /> Filtros
          </CardTitle>
          <CardDescription>Selecione o período e os critérios para o relatório.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Data inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">Data final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Barbearia</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as barbearias</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Total de Agendamentos"
          value={String(summary.totalAppointments)}
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <SummaryCard
          title="Total Concluídos"
          value={String(summary.totalCompleted)}
          icon={<CheckCircle2 className="h-4 w-4 text-accent" />}
          loading={loading}
        />
        <SummaryCard
          title="Taxa de Comparecimento"
          value={`${summary.attendanceRate}%`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <SummaryCard
          title="Faturamento Total"
          value={fmtBRL(summary.totalRevenue)}
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          loading={loading}
        />
        <SummaryCard
          title="Ticket Médio"
          value={fmtBRL(summary.averageTicket)}
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <SummaryCard
          title="Serviço Mais Realizado"
          value={summary.topServiceName}
          icon={<Scissors className="h-4 w-4 text-accent" />}
          loading={loading}
          small
        />
      </div>

      {/* Exportação Agendamentos */}
      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Agendamentos</CardTitle>
          <CardDescription>
            Exporte os agendamentos do período com todos os filtros aplicados.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={loading || exporting === 'appt-csv'}
            onClick={() =>
              safeExport(
                'appt-csv',
                () => exportAppointmentsCsv(appointments, startDate, endDate),
                'CSV de agendamentos gerado.',
              )
            }
          >
            {exporting === 'appt-csv' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            disabled={loading || exporting === 'appt-pdf'}
            onClick={() =>
              safeExport(
                'appt-pdf',
                () => exportAppointmentsPdf(appointments, tenantName, startDate, endDate),
                'PDF de agendamentos gerado.',
              )
            }
          >
            {exporting === 'appt-pdf' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </CardContent>
      </Card>

      {/* Exportação Faturamento */}
      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Faturamento</CardTitle>
          <CardDescription>
            Agrupado por barbearia e mês, considerando apenas agendamentos concluídos.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={loading || exporting === 'bill-csv'}
            onClick={() =>
              safeExport(
                'bill-csv',
                () => exportBillingCsv(billing, startDate, endDate),
                'CSV de faturamento gerado.',
              )
            }
          >
            {exporting === 'bill-csv' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            disabled={loading || exporting === 'bill-pdf'}
            onClick={() =>
              safeExport(
                'bill-pdf',
                () => exportBillingPdf(billing, summary, tenantName, startDate, endDate),
                'PDF de faturamento gerado.',
              )
            }
          >
            {exporting === 'bill-pdf' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Exportar PDF
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto self-center">
            <Download className="h-3.5 w-3.5" />
            {billing.length} grupo(s) por barbearia/mês
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
  small,
}: {
  title: string
  value: string
  icon: React.ReactNode
  loading?: boolean
  small?: boolean
}) {
  return (
    <Card className="hover:shadow-elevation transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium leading-tight">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div
            className={small ? 'text-base font-bold truncate' : 'text-2xl font-bold'}
            title={value}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
