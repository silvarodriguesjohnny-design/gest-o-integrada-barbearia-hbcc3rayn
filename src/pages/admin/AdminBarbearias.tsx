import { useEffect, useState } from 'react'
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
import { Building2, Loader2 } from 'lucide-react'
import { getAllTenants, calculateMRR } from '@/services/super-admin'
import { TenantEditDialog } from '@/components/admin/TenantEditDialog'
import { ManualTenantDialog } from '@/components/admin/ManualTenantDialog'
import { useToast } from '@/hooks/use-toast'

const PLAN_LABELS: Record<string, string> = { essential: 'Essential', pro: 'Pro', elite: 'Elite' }
const PLAN_COLORS: Record<string, string> = {
  essential: 'bg-blue-100 text-blue-700',
  pro: 'bg-accent text-white',
  elite: 'bg-purple-100 text-purple-700',
}
const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-red-100 text-red-700',
}

export default function AdminBarbearias() {
  const { toast } = useToast()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTenant, setEditingTenant] = useState<any | null>(null)

  const load = () => {
    getAllTenants().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setTenants(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const totalMRR = calculateMRR(tenants)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barbearias</h1>
          <p className="text-muted-foreground mt-1">
            Todas as barbearias cadastradas na plataforma.
          </p>
        </div>
        <ManualTenantDialog onCreated={load} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Barbearias</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {tenants.filter((t) => t.subscription_type === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{fmt(totalMRR)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Barbearias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Barbearia</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Barbeiros</TableHead>
                <TableHead className="text-right pr-6">MRR</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma barbearia cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        {t.logo_url ? (
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <Building2 className="h-4 w-4 text-accent" />
                          </div>
                        )}
                        <div>
                          <div>{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.owner_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={PLAN_COLORS[t.plan_type] || ''} variant="secondary">
                        {PLAN_LABELS[t.plan_type] || t.plan_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_COLORS[t.subscription_type] || ''}
                        variant="secondary"
                      >
                        {t.subscription_type || 'trial'}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.barber_count || 0}</TableCell>
                    <TableCell className="text-right pr-6 font-bold text-emerald-600">
                      {fmt(t.mrr || 0)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-accent/10 hover:text-accent"
                        onClick={() => setEditingTenant(t)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TenantEditDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(v) => !v && setEditingTenant(null)}
        onSaved={load}
      />
    </div>
  )
}
