import { useEffect, useState } from 'react'
import {
  Store,
  TrendingUp,
  Users,
  BarChart2,
  PieChart,
  AlertTriangle,
  UserCheck,
  Loader2,
} from 'lucide-react'
import {
  getAdminDashboardData,
  formatCurrencyBRL,
  type AdminDashboardData,
} from '@/services/admin-dashboard'

type Data = AdminDashboardData

const SEG_COLORS: Record<string, string> = {
  essential: 'bg-sky-500',
  pro: 'bg-violet-500',
  elite: 'bg-amber-500',
}

/* ----------------------------- UI atoms (pure Tailwind) ----------------------------- */

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  iconClass = 'text-slate-500 dark:text-slate-300',
  children,
  className = '',
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconClass?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-slate-400">{text}</div>
}

/* ----------------------------- Charts (pure Tailwind) ----------------------------- */

function SegmentationBars({ data }: { data: Data['planSegmentation'] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyHint text="Sem dados suficientes" />
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.plan}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{d.label}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {d.count} ({d.pct}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
            <div
              className={SEG_COLORS[d.plan] || 'bg-slate-400'}
              style={{ width: `${(d.count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function RankingList({
  items,
  valueLabel,
  formatValue,
}: {
  items: { name: string; count?: number; total?: number }[]
  valueLabel: string
  formatValue: (v: number) => string
}) {
  if (items.length === 0) return <EmptyHint text="Sem dados suficientes" />
  const max = Math.max(...items.map((i) => i.count ?? i.total ?? 0), 1)
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const val = item.count ?? item.total ?? 0
        const pct = (val / max) * 100
        return (
          <div key={idx} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                idx === 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : idx === 1
                    ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    : idx === 2
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatValue(val)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">
        {valueLabel}
      </p>
    </div>
  )
}

/* ----------------------------- Page ----------------------------- */

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getAdminDashboardData()
      .then(({ data: d, error: e }) => {
        if (!active) return
        if (e || !d) {
          setError(e?.message || 'Não foi possível carregar os dados')
        } else {
          setData(d)
        }
      })
      .catch(() => {
        if (active) setError('Erro inesperado ao carregar dashboard')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Carregando dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
          <span className="text-sm">{error || 'Erro desconhecido'}</span>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Visão geral da plataforma · {today}
        </p>
      </div>

      {/* 1. Volume de vendas (novas barbearias cadastradas) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Volume de Vendas
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            icon={Store}
            label="Total de Barbearias"
            value={data.totalTenants}
            sub="Cadastradas na plataforma"
            accent="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
          />
          <MetricCard
            icon={TrendingUp}
            label="Novas (30 dias)"
            value={data.newTenants30d}
            sub="Volume de vendas mensal"
            accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
          />
          <MetricCard
            icon={Users}
            label="Novas (7 dias)"
            value={data.newTenants7d}
            sub="Vendas da semana"
            accent="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
          />
        </div>
      </div>

      {/* 2. Segmentação por plano + 5. Churn */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Segmentação por Plano"
          icon={PieChart}
          iconClass="text-amber-500"
          className="lg:col-span-2"
        >
          <SegmentationBars data={data.planSegmentation} />
        </Panel>

        <Panel title="Churn (15 dias)" icon={AlertTriangle} iconClass="text-rose-500">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <UserCheck className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Ativas</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {data.activeTenantsWithAppt}
              </p>
            </div>
            <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-950/20">
              <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-rose-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Inativas</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.churnCount}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Barbearias sem agendamento nos últimos 15 dias
          </p>
        </Panel>
      </div>

      {/* 3 + 4. Rankings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Ranking por Agendamentos" icon={BarChart2} iconClass="text-indigo-500">
          <RankingList
            items={data.rankingByAppointments}
            valueLabel="Volume de agendamentos (7 dias)"
            formatValue={(v) => `${v}`}
          />
        </Panel>
        <Panel title="Ranking de Vendas" icon={TrendingUp} iconClass="text-emerald-500">
          <RankingList
            items={data.rankingBySales}
            valueLabel="Volume de vendas (7 dias)"
            formatValue={(v) => formatCurrencyBRL(v)}
          />
        </Panel>
      </div>
    </div>
  )
}
