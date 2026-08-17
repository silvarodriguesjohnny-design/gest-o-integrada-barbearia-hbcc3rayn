import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { StatsCard } from '../components/StatsCard'
import { Store, CalendarDays, Users, DollarSign } from 'lucide-react'

const PLAN_PRICES: Record<string, number> = {
  essential: 97.9,
  pro: 117.9,
  elite: 297.9,
}

interface DashboardData {
  tenantCount: number
  appointmentsToday: number
  clientCount: number
  mrr: number
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setHours(23, 59, 59, 999)

        const [tenantsRes, apptsRes, clientsRes] = await Promise.all([
          supabase.from('tenants').select('id, plan_type, subscription_type'),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString()),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
        ])

        if (cancelled) return

        const tenants = (tenantsRes.data as any[]) ?? []
        const mrr = tenants
          .filter((t) => t.subscription_type === 'active' || t.subscription_type === 'past_due')
          .reduce((sum, t) => sum + (PLAN_PRICES[t.plan_type] || 0), 0)

        setData({
          tenantCount: tenants.length,
          appointmentsToday: apptsRes.count ?? 0,
          clientCount: clientsRes.count ?? 0,
          mrr,
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar dados.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D4A44A] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Visão geral da plataforma Na Régua.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Barbearias"
          value={data?.tenantCount ?? 0}
          icon={<Store className="h-5 w-5" />}
          accent="amber"
        />
        <StatsCard
          title="Agendamentos hoje"
          value={data?.appointmentsToday ?? 0}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="blue"
        />
        <StatsCard
          title="Clientes"
          value={data?.clientCount ?? 0}
          icon={<Users className="h-5 w-5" />}
          accent="green"
        />
        <StatsCard
          title="MRR estimado"
          value={formatCurrency(data?.mrr ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="green"
          hint="Assinaturas ativas"
        />
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="font-serif text-lg font-semibold">Bem-vindo</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Use o menu lateral para gerenciar barbearias, clientes, agendamentos e configurações de
          Stripe e Totem PWA.
        </p>
      </div>
    </div>
  )
}
