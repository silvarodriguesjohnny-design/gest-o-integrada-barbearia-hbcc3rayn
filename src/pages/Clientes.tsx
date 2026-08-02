import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
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
import { Search, Star, Loader2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { getCustomers } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { CustomerWithDetails } from '@/types'
import { PendingTenants } from '@/components/PendingTenants'
import { NewPendingTenantDialog } from '@/components/NewPendingTenantDialog'
import { CustomerProfileModal } from '@/components/clientes/CustomerProfileModal'
import { AddCustomerDialog } from '@/components/clientes/AddCustomerDialog'
import { useAuth } from '@/hooks/use-auth'

type SortColumn =
  | 'name'
  | 'phone'
  | 'email'
  | 'cpf'
  | 'birthday'
  | 'last_visit_at'
  | 'days_since_visit'
  | 'discount_percentage'
  | 'communication_preferences'
type SortDirection = 'asc' | 'desc'

function getSortValue(c: CustomerWithDetails, col: SortColumn): string | number | null {
  switch (col) {
    case 'name':
      return c.name?.toLowerCase() ?? null
    case 'phone':
      return c.phone?.toLowerCase() ?? null
    case 'email':
      return c.email?.toLowerCase() ?? null
    case 'cpf':
      return c.cpf?.toLowerCase() ?? null
    case 'birthday':
      return c.birthday ?? null
    case 'last_visit_at':
      return c.last_visit_at ?? null
    case 'days_since_visit':
      return c.last_visit_at
        ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / 86400000)
        : null
    case 'discount_percentage':
      return c.discount_percentage ?? null
    case 'communication_preferences':
      return Array.isArray(c.communication_preferences)
        ? c.communication_preferences.join(', ').toLowerCase()
        : null
  }
}

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showPendingDialog, setShowPendingDialog] = useState(false)
  const [pendingRefresh, setPendingRefresh] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'all' | 'vip' | 'active' | 'inactive'>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()

  const load = () => {
    setLoading(true)
    getCustomers().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setCustomers(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  const renderSortHeader = (col: SortColumn, label: string, className?: string) => (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === col &&
          (sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </div>
    </TableHead>
  )

  const filtered = useMemo(() => {
    const result = customers.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false
      if (activeFilter === 'all') return true
      const stamps = c.loyalty_card?.stamps_count ?? 0
      const days = c.last_visit_at
        ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / 86400000)
        : 999
      if (activeFilter === 'vip') return stamps >= 10
      if (activeFilter === 'active') return days <= 30
      if (activeFilter === 'inactive') return days > 60
      return true
    })
    return result.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [customers, searchTerm, activeFilter, sortColumn, sortDirection])

  const getRetentionColor = (lastVisit: string | null) => {
    if (!lastVisit) return 'bg-red-500'
    const days = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
    if (days <= 30) return 'bg-emerald-500'
    if (days <= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
          <p className="text-muted-foreground mt-1">Acompanhe histórico, retenção e fidelidade.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                ['all', 'Todos'],
                ['vip', 'VIP'],
                ['active', 'Ativos'],
                ['inactive', 'Inativos'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={activeFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(key)}
                className={activeFilter === key ? 'bg-accent text-white' : ''}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            className="bg-accent hover:bg-accent/90 text-white"
            onClick={() => (isSuperAdmin ? setShowPendingDialog(true) : setShowAddDialog(true))}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      {isSuperAdmin && <PendingTenants refreshTrigger={pendingRefresh} />}

      <Card className="hover:shadow-elevation transition-shadow">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {renderSortHeader('name', 'Nome')}
                {renderSortHeader('phone', 'Telefone')}
                {renderSortHeader('email', 'E-mail')}
                {renderSortHeader('cpf', 'CPF')}
                {renderSortHeader('birthday', 'Nascimento')}
                {renderSortHeader('last_visit_at', 'Última Visita')}
                {renderSortHeader('days_since_visit', 'Dias')}
                {renderSortHeader('discount_percentage', 'Desc. %')}
                {renderSortHeader('communication_preferences', 'Comunicação')}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => {
                  const stamps = customer.loyalty_card?.stamps_count ?? 0
                  const days = customer.last_visit_at
                    ? Math.floor(
                        (Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000,
                      )
                    : 999
                  const prefs = Array.isArray(customer.communication_preferences)
                    ? customer.communication_preferences
                    : []
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {customer.name}
                          {stamps >= 10 && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.cpf || '-'}</TableCell>
                      <TableCell>
                        {customer.birthday
                          ? new Date(customer.birthday).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {customer.last_visit_at
                          ? new Date(customer.last_visit_at).toLocaleDateString('pt-BR')
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>{days > 365 ? 'Nunca' : days}</TableCell>
                      <TableCell>
                        {customer.discount_percentage ? `${customer.discount_percentage}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {prefs.length > 0
                            ? prefs.map((p) => (
                                <Badge key={p} variant="outline" className="text-xs capitalize">
                                  {p}
                                </Badge>
                              ))
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              getRetentionColor(customer.last_visit_at),
                            )}
                          />
                          <span className="text-sm text-muted-foreground">
                            {days > 365 ? 'Nunca' : `${days} dias`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <CustomerProfileModal customer={customer} onRedeem={load} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {isSuperAdmin ? (
        <NewPendingTenantDialog
          open={showPendingDialog}
          onOpenChange={setShowPendingDialog}
          onCreated={() => {
            load()
            setPendingRefresh((p) => p + 1)
          }}
        />
      ) : (
        <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreated={load} />
      )}
    </div>
  )
}
