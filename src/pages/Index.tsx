import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, XAxis } from 'recharts'
import { ArrowUpRight, TrendingUp, Users, AlertCircle, Clock, DollarSign } from 'lucide-react'

const REVENUE_DATA = [
  { day: '01', income: 400 },
  { day: '05', income: 800 },
  { day: '10', income: 1200 },
  { day: '15', income: 2400 },
  { day: '20', income: 1800 },
  { day: '25', income: 3200 },
  { day: '30', income: 4100 },
]

const PIE_DATA = [
  { name: 'Corte', value: 45, fill: 'hsl(var(--chart-1))' },
  { name: 'Barba', value: 25, fill: 'hsl(var(--chart-2))' },
  { name: 'Combo', value: 30, fill: 'hsl(var(--chart-3))' },
]

export default function Index() {
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
            <div className="text-2xl font-bold">R$ 15.430,00</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium">
              <ArrowUpRight className="mr-1 h-3 w-3" /> +12.5% vs. mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 65,00</div>
            <p className="text-xs text-muted-foreground mt-1">Baseado em 237 atendimentos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground mt-1">Top 10% de gastos</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5 hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Perda por Inatividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R$ 780,00</div>
            <p className="text-xs text-destructive/80 mt-1">12 clientes ausentes {'>'} 60 dias</p>
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
                <LineChart data={REVENUE_DATA} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
            <ChartContainer
              config={{
                corte: { label: 'Corte', color: 'hsl(var(--chart-1))' },
                barba: { label: 'Barba', color: 'hsl(var(--chart-2))' },
                combo: { label: 'Combo', color: 'hsl(var(--chart-3))' },
              }}
              className="h-[250px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {PIE_DATA.map((entry, index) => (
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4 bg-muted/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-none">Corte + Barba concluído</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: João Silva • Profissional: Thiago
                  </p>
                </div>
                <div className="font-bold text-emerald-600">+ R$ 85,00</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
