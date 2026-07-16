import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, XAxis } from 'recharts'
import {
  ArrowUpRight,
  TrendingUp,
  Users,
  AlertCircle,
  Clock,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { getDashboardMetrics } from '@/services/dashboard'
import { useToast } from '@/hooks/use-toast'
import type { DashboardMetrics } from '@/types'

export default function Index() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    getDashboardMetrics().then(({ data, error }) => {
      if (error) {
        toast({
          title: 'Erro ao carregar dados',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setMetrics(data)
      }
      setLoading(false)
    })
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Insights</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do desempenho da sua barbearia hoje.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(metrics?.totalRevenue || 0)}</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium">
              <ArrowUpRight className="mr-1 h-3 w-3" /> Receita líquida do período
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(metrics?.ticketMedio || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Baseado em atendimentos concluídos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.vipCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">10+ selos no cartão fidelidade</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5 hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Perda por Inatividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {fmt(metrics?.inactivityLoss || 0)}
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              {metrics?.inactiveCount ?? 0} clientes ausentes {'>'} 60 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4 hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ income: { label: 'Receita', color: 'hsl(var(--chart-1))' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={metrics?.revenueData || []}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="var(--color-income)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle>Distribuição de Serviços</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
            <ChartContainer config={{}} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.serviceData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(metrics?.serviceData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(metrics?.recentAppointments || []).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-4 rounded-lg border p-4 bg-muted/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {appt.service?.name || 'Serviço'} - {appt.status}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {appt.customer?.name || 'N/A'} • Profissional:{' '}
                    {appt.barber_name || 'N/A'}
                  </p>
                </div>
                <div className="font-bold text-emerald-600">
                  {appt.service ? fmt(Number(appt.service.price)) : ''}
                </div>
              </div>
            ))}
            {(!metrics?.recentAppointments || metrics.recentAppointments.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade recente.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
