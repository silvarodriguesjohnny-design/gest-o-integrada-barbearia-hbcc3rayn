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
import { Building2, Crown, TrendingUp, Users, Loader2, Clock } from 'lucide-react'
import { getAllTenants, calculateMRR } from '@/services/super-admin'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

export default function SuperAdmin() {
  const { toast } = useToast()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTenants().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setTenants(data || [])
      setLoading(false)
    })
  }, [toast])

  const totalMRR = calculateMRR(tenants)
  const activeCount = tenants.filter((t) => t.subscription_type === 'active').length
  const trialCount = tenants.filter((t) => t.subscription_type === 'trial').length
  const totalBarbers = tenants.reduce((s, t) => s + (t.barber_count || 0), 0)
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="h-8 w-8 text-accent" /> Painel Financeiro
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral de todas as barbearias na plataforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{fmt(totalMRR)}</div>
            <p className="text-xs text-muted-foreground mt-1">Receita recorrente mensal</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Pagos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{tenants.length} total registrados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Teste</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{trialCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Período de trial ativo</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barbeiros Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBarbers}</div>
            <p className="text-xs text-muted-foreground mt-1">Em todas as barbearias</p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Tenants Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Barbearia</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiração</TableHead>
                <TableHead>Barbeiros</TableHead>
                <TableHead className="text-right pr-6">MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum tenant cadastrado ainda.
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
                    <TableCell className="text-sm text-muted-foreground">
                      {t.trial_ends_at
                        ? new Date(t.trial_ends_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>{t.barber_count || 0}</TableCell>
                    <TableCell className="text-right pr-6 font-bold text-emerald-600">
                      {fmt(t.mrr || 0)}
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
