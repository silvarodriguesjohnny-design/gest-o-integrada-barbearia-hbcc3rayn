import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Gift, Users } from 'lucide-react'
import { getCustomers } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'
import { formatDateBR } from '@/lib/date-utils'
import type { CustomerWithDetails } from '@/types'

export default function AdminClientes() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    getCustomers().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setCustomers(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    )
  }, [customers, search])

  const rewardReadyCount = customers.filter((c) => c.loyalty_card?.is_reward_ready).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground mt-1">Todos os clientes cadastrados na plataforma.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recompensas Prontas</CardTitle>
            <Gift className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{rewardReadyCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIPs (10+ selos)</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter((c) => (c.loyalty_card?.stamps_count || 0) >= 10).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-serif text-xl">Lista de Clientes</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, email, telefone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Visitas</TableHead>
                <TableHead>Fidelidade</TableHead>
                <TableHead>Última visita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{c.email || '—'}</div>
                      <div>{c.phone || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.visit_count || 0}</TableCell>
                    <TableCell>
                      {c.loyalty_card ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="amber">{c.loyalty_card.stamps_count}/12 selos</Badge>
                          {c.loyalty_card.is_reward_ready && (
                            <Badge variant="success">
                              <Gift className="h-3 w-3 mr-1" /> Recompensa
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_visit_at ? formatDateBR(c.last_visit_at) : 'Nunca'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
