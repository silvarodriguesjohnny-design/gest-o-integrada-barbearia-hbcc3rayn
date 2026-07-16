import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Search,
  Filter,
  Scissors,
  Star,
  Calendar as CalendarIcon,
  Gift,
  Loader2,
  Plus,
} from 'lucide-react'
import { getCustomers, createCustomer } from '@/services/customers'
import { getServices } from '@/services/catalog'
import { redeemReward } from '@/services/loyalty'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { CustomerWithDetails, Service } from '@/types'

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { toast } = useToast()

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

  const getRetentionColor = (lastVisit: string | null) => {
    if (!lastVisit) return 'bg-red-500'
    const days = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
    if (days <= 30) return 'bg-emerald-500'
    if (days <= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
          <p className="text-muted-foreground mt-1">Acompanhe histórico, retenção e fidelidade.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90 text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Última Visita</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => {
                const stamps = customer.loyalty_card?.stamps_count ?? 0
                const days = customer.last_visit_at
                  ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000)
                  : 999
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
                    <TableCell>
                      {customer.last_visit_at
                        ? new Date(customer.last_visit_at).toLocaleDateString('pt-BR')
                        : 'Nunca'}
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
      </Card>

      <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreated={load} />
    </div>
  )
}

function CustomerProfileModal({
  customer,
  onRedeem,
}: {
  customer: CustomerWithDetails
  onRedeem: () => void
}) {
  const { toast } = useToast()
  const stamps = customer.loyalty_card?.stamps_count ?? 0

  const handleRedeem = async () => {
    const { error } = await redeemReward(customer.id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Recompensa resgatada!', description: 'Cartão fidelidade resetado.' })
      onRedeem()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-accent/10 hover:text-accent">
          Ver Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-serif">
            {customer.name}
            {stamps >= 10 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                VIP
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Visitas
              </div>
              <div className="text-2xl font-bold">{customer.visit_count ?? 0}</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Selos
              </div>
              <div className="text-2xl font-bold">{stamps}/12</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Última Visita
              </div>
              <div className="text-lg font-bold">
                {customer.last_visit_at
                  ? new Date(customer.last_visit_at).toLocaleDateString('pt-BR')
                  : 'Nunca'}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Cartão Fidelidade (12+1)</h3>
            <div className="grid grid-cols-6 gap-3 sm:gap-4 p-4 rounded-lg border bg-card shadow-sm">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    i < stamps
                      ? 'border-accent bg-accent text-white scale-105 shadow-sm'
                      : 'border-muted bg-transparent text-muted-foreground/30',
                  )}
                >
                  <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              ))}
              <div
                className={cn(
                  'aspect-square rounded-full flex items-center justify-center border-2 border-dashed transition-all',
                  stamps >= 12
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-50'
                    : 'border-muted-foreground/30 text-muted-foreground/30',
                )}
              >
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 font-medium">
              {stamps >= 12
                ? 'Recompensa pronta! Resgate seu serviço grátis.'
                : `Faltam ${12 - stamps} cortes para ganhar um serviço grátis!`}
            </p>
            {stamps >= 12 && (
              <Button
                onClick={handleRedeem}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Resgatar Recompensa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthday, setBirthday] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setLoading(true)
    const { error } = await createCustomer({ name, phone, email, birthday: birthday || null })
    setLoading(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Cliente cadastrado!', description: `${name} foi adicionado.` })
      setName('')
      setPhone('')
      setEmail('')
      setBirthday('')
      onOpenChange(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <Button
            onClick={handleSave}
            disabled={loading || !name}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
