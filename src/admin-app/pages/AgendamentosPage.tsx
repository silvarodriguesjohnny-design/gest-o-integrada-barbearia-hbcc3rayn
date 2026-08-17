import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Table } from '../components/Table'
import { Button } from '../components/Button'
import { RefreshCw } from 'lucide-react'

interface ApptRow {
  id: string
  start_time: string
  status: string
  barber_name: string | null
  customer_name: string | null
  service_name: string | null
  tenant_name: string | null
}

function formatDateTime(v: string) {
  return new Date(v).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-gray-200 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  )
}

export function AgendamentosPage() {
  const [rows, setRows] = useState<ApptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('appointments')
      .select('id, start_time, status, barber_name, customer_id, service_id, tenant_id')
      .order('start_time', { ascending: false })
      .limit(300)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const appts = (data as any[]) ?? []
    const customerIds = [...new Set(appts.map((a) => a.customer_id).filter(Boolean))]
    const serviceIds = [...new Set(appts.map((a) => a.service_id).filter(Boolean))]
    const tenantIds = [...new Set(appts.map((a) => a.tenant_id).filter(Boolean))]

    const [customersRes, servicesRes, tenantsRes] = await Promise.all([
      customerIds.length
        ? supabase.from('customers').select('id, name').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      serviceIds.length
        ? supabase.from('services').select('id, name').in('id', serviceIds)
        : Promise.resolve({ data: [], error: null }),
      tenantIds.length
        ? supabase.from('tenants').select('id, name').in('id', tenantIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const cMap: Record<string, string> = {}
    for (const c of (customersRes.data as any[]) ?? []) cMap[c.id] = c.name
    const sMap: Record<string, string> = {}
    for (const s of (servicesRes.data as any[]) ?? []) sMap[s.id] = s.name
    const tMap: Record<string, string> = {}
    for (const t of (tenantsRes.data as any[]) ?? []) tMap[t.id] = t.name

    const mapped: ApptRow[] = appts.map((a) => ({
      id: a.id,
      start_time: a.start_time,
      status: a.status,
      barber_name: a.barber_name,
      customer_name: a.customer_id ? cMap[a.customer_id] || null : null,
      service_name: a.service_id ? sMap[a.service_id] || null : null,
      tenant_name: a.tenant_id ? tMap[a.tenant_id] || null : null,
    }))

    setRows(mapped)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Agendamentos</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Últimos 300 agendamentos da plataforma.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table<ApptRow>
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'start_time',
            header: 'Data/Hora',
            render: (r) => formatDateTime(r.start_time),
          },
          {
            key: 'customer_name',
            header: 'Cliente',
            render: (r) => r.customer_name || '—',
          },
          {
            key: 'service_name',
            header: 'Serviço',
            render: (r) => r.service_name || '—',
          },
          {
            key: 'barber_name',
            header: 'Barbeiro',
            render: (r) => r.barber_name || '—',
          },
          {
            key: 'tenant_name',
            header: 'Barbearia',
            render: (r) => r.tenant_name || '—',
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusBadge status={r.status} />,
          },
        ]}
        data={rows}
        empty="Nenhum agendamento encontrado."
      />
    </div>
  )
}
