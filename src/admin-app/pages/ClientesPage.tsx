import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Table } from '../components/Table'
import { Button } from '../components/Button'
import { RefreshCw } from 'lucide-react'

interface ClientRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  cpf: string | null
  created_at: string
  tenant_id: string | null
}

interface TenantLookup {
  id: string
  name: string
}

function formatDate(v: string) {
  return new Date(v).toLocaleDateString('pt-BR')
}

export function ClientesPage() {
  const [rows, setRows] = useState<ClientRow[]>([])
  const [tenants, setTenants] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [clientsRes, tenantsRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, email, phone, cpf, created_at, tenant_id')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('tenants').select('id, name'),
    ])
    if (clientsRes.error) setError(clientsRes.error.message)
    else setRows((clientsRes.data as ClientRow[]) ?? [])
    const tMap: Record<string, string> = {}
    for (const t of (tenantsRes.data as TenantLookup[]) ?? []) tMap[t.id] = t.name
    setTenants(tMap)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Clientes cadastrados nas barbearias (últimos 500).
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

      <Table<ClientRow>
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Nome',
            render: (r) => <span className="font-medium">{r.name || '—'}</span>,
          },
          { key: 'cpf', header: 'CPF', render: (r) => r.cpf || '—' },
          { key: 'email', header: 'E-mail', render: (r) => r.email || '—' },
          { key: 'phone', header: 'Telefone', render: (r) => r.phone || '—' },
          {
            key: 'tenant',
            header: 'Barbearia',
            render: (r) => (r.tenant_id ? tenants[r.tenant_id] || '—' : '—'),
          },
          { key: 'created_at', header: 'Cadastro', render: (r) => formatDate(r.created_at) },
        ]}
        data={rows}
        empty="Nenhum cliente encontrado."
      />
    </div>
  )
}
