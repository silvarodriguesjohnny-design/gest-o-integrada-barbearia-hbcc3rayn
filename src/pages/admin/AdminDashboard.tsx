import { useEffect, useState } from 'react'
import {
  Activity,
  TrendingUp,
  Users,
  Store,
  Clock,
  UserCheck,
  BarChart2,
  PieChart,
  AlertTriangle,
  LifeBuoy,
  Loader2,
  X,
  Send,
} from 'lucide-react'
import {
  getAdminDashboardData,
  formatCurrencyBRL,
  PLAN_LABELS,
  type AdminDashboardData,
} from '@/services/admin-dashboard'
import type { AppointmentWithRelations } from '@/types'
import { formatTimeHHMM, formatDateBR } from '@/lib/date-utils'

type Data = AdminDashboardData

const SUPPORT_EMAIL = 'silvarodriguesjohnny@gmail.com'
const SUPPORT_SUBJECT = 'Suporte Na Régua'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

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
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}>
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

/* ----------------------------- Charts (pure Tailwind/SVG) ----------------------------- */

function SegmentationBars({ data }: { data: Data['planSegmentation'] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
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
      <p className="pt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">{valueLabel}</p>
    </div>
  )
}

function BarChart({ data }: { data: Data['chart7Days'] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.confirmed, d.completed]))
  return (
    <div className="flex h-56 items-end justify-between gap-2">
      {data.map((d) => {
        const total = d.confirmed + d.completed + d.cancelled
        const confH = (d.confirmed / max) * 100
        const compH = (d.completed / max) * 100
        const cancH = (d.cancelled / max) * 100
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {total > 0 ? total : ''}
            </div>
            <div className="flex h-40 w-full max-w-[36px] flex-col-reverse overflow-hidden rounded-t-md bg-slate-100 dark:bg-slate-700/40">
              <div style={{ height: `${confH}%` }} className="w-full bg-blue-500" title={`Confirmados: ${d.confirmed}`} />
              <div style={{ height: `${compH}%` }} className="w-full bg-emerald-500" title={`Concluídos: ${d.completed}`} />
              <div style={{ height: `${cancH}%` }} className="w-full bg-rose-400" title={`Cancelados: ${d.cancelled}`} />
            </div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function UpcomingRow({ a }: { a: AppointmentWithRelations }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2 last:border-0 dark:border-slate-700/50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {a.customer?.name || 'Cliente'}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {a.service?.name || 'Serviço'} · {a.barber_name || 'Profissional'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {formatTimeHHMM(a.start_time)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status] || ''}`}>
          {STATUS_LABELS[a.status] || a.status}
        </span>
      </div>
    </div>
  )
}

/* ----------------------------- Support dialog (state-based, Tailwind only) ----------------------------- */

function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('')

  if (!open) return null

  const handleSend = () => {
    const body = message.trim() || 'Preciso de suporte na plataforma Na Régua.'
    const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}&body=${encodeURIComponent(body)}`
    window.location.href = href
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Suporte Na Régua</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">mensagem para {SUPPORT_EMAIL}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          Descreva sua solicitação
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Ex: O botão de agendamento não está funcionando..."
          className="w-full resize-none rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            <Send className="h-4 w-4" />
            Enviar e-mail
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Page ----------------------------- */

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)

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
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <LifeBuoy className="h-4 w-4" /> Falar com Suporte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visão geral da plataforma · {formatDateBR(new Date())}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
        >
          <LifeBuoy className="h-4 w-4" /> Suporte
        </button>
      </div>

      {/* Volume de vendas (novos tenants) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Volume de Vendas
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Store}
            label="Total de Barbearias"
            value={data.totalTenants}
            sub={`${data.activeTenantsWithAppt} ativas com agendamento`}
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
          <MetricCard
            icon={PieChart}
            label="MRR Estimado"
            value={formatCurrencyBRL(data.mrr)}
            sub="Receita recorrente mensal"
            accent="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
          />
        </div>
      </div>

      {/* Segmentação por plano + Churn */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Segmentação por Plano" icon={PieChart} iconClass="text-amber-500" className="lg:col-span-2">
          <SegmentationBars data={data.planSegmentation} />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            {data.planSegmentation.map((p) => (
              <div key={p.plan} className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrencyBRL(
                    p.count * (p.plan === 'essential' ? 97.9 : p.plan === 'pro' ? 117.9 : 297.9),
                  )}
                </p>
                <p className="text-[10px] text-slate-400">/mês</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Churn (15 dias)" icon={AlertTriangle} iconClass="text-rose-500">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <UserCheck className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Ativas</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.activeTenantsWithAppt}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-950/20">
              <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-rose-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Inativas</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.churnCount}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Barbearias sem agendamento criado há mais de 15 dias
          </p>
        </Panel>
      </div>

      {/* Rankings: agendamentos + vendas */}
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

      {/* Operação hoje */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Operação Hoje
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Clock}
            label="Agendamentos hoje"
            value={data.todayTotal}
            accent="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
          />
          <MetricCard
            icon={UserCheck}
            label="Confirmados hoje"
            value={data.todayConfirmed}
            accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
          />
          <MetricCard
            icon={Activity}
            label="Concluídos hoje"
            value={data.todayCompleted}
            sub={`${data.attendanceRate}% de comparecimento`}
            accent="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Cancelados hoje"
            value={data.todayCancelled}
            accent="bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
          />
        </div>
      </div>

      {/* Gráfico 7 dias + top serviços */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Agendamentos (7 dias)" icon={BarChart2} iconClass="text-blue-500" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-end gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Confirmados
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Concluídos
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Cancelados
            </span>
          </div>
          <BarChart data={data.chart7Days} />
        </Panel>

        <Panel title="Top Serviços" icon={PieChart} iconClass="text-amber-500">
          {data.topServices.length === 0 ? (
            <EmptyHint text="Sem dados suficientes" />
          ) : (
            <div className="space-y-3">
              {data.topServices.map((s, i) => {
                const max = Math.max(...data.topServices.map((x) => x.value), 1)
                const pct = (s.value / max) * 100
                return (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {i + 1}. {s.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{s.value}x</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.fill }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Próximos agendamentos + fidelidade + pendentes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Próximos Agendamentos" icon={Clock} iconClass="text-blue-500" className="lg:col-span-2">
          {data.upcomingAppointments.length === 0 ? (
            <EmptyHint text="Nenhum agendamento próximo" />
          ) : (
            <div>
              {data.upcomingAppointments.map((a) => (
                <UpcomingRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Fidelidade" icon={PieChart} iconClass="text-amber-500">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">{data.loyaltyReadyCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recompensas prontas</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/30">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.stampsThisMonth}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Selos no mês</p>
              </div>
            </div>
          </Panel>

          {data.pendingTenants.length > 0 && (
            <Panel title="Cadastros Pendentes" icon={Users} iconClass="text-blue-500">
              <div className="space-y-2">
                {data.pendingTenants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-700/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.nome_negocio}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateBR(p.created_at)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <p className="pt-2 text-center text-xs text-slate-400">
        Dashboard administrativo · Dados dos últimos 7 dias operacionais
      </p>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
