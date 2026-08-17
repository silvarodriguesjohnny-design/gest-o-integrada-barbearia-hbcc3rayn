import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Table } from '../components/Table'
import { Button } from '../components/Button'
import { RefreshCw } from 'lucide-react'

interface TenantRow {
  id: string
  name: string
  slug: string | null
  status: string | null
  plan_type: string
  subscription_type: string
  created_at: string
}

function formatDate(v: string) {
  return new Date(v).toLocaleDateString('pt-BR')
}

function StatusBadge({ status }: { status: string | null }) {
  const active = status === 'active'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {status || '—'}
    </span>
  )
}

export function BarbeariasPage() {
  const [rows, setRows] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, status, plan_type, subscription_type, created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data as TenantRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const toggleStatus = async (t: TenantRow) => {
    setActioning(t.id)
    const newStatus = t.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', t.id)
    setActioning(null)
    if (error) {
      setError(error.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, status: newStatus } : r)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Barbearias</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Todas as barbearias cadastradas na plataforma.
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

      <Table<TenantRow>
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Nome',
            render: (r) => (
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">/{r.slug || '—'}</p>
              </div>
            ),
          },
          {
            key: 'plan_type',
            header: 'Plano',
            render: (r) => <span className="capitalize">{r.plan_type}</span>,
          },
          {
            key: 'subscription_type',
            header: 'Assinatura',
            render: (r) => <span className="capitalize">{r.subscription_type}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: 'created_at',
            header: 'Criado em',
            render: (r) => formatDate(r.created_at),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (r) => (
              <Button
                variant={r.status === 'active' ? 'danger' : 'primary'}
                size="sm"
                loading={actioning === r.id}
                onClick={() => toggleStatus(r)}
              >
                {r.status === 'active' ? 'Desativar' : 'Ativar'}
              </Button>
            ),
          },
        ]}
        data={rows}
        empty="Nenhuma barbearia encontrada."
      />
    </div>
  )
}
