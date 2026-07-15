import { useState } from 'react'
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
import { Search, Filter, Scissors, Star, Calendar as CalendarIcon, Gift } from 'lucide-react'
import { MOCK_CUSTOMERS } from '@/lib/mock'
import { cn } from '@/lib/utils'

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')

  const getRetentionColor = (lastVisit: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 3600 * 24),
    )
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
            {MOCK_CUSTOMERS.filter((c) =>
              c.name.toLowerCase().includes(searchTerm.toLowerCase()),
            ).map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {customer.name}
                    {customer.vip && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                </TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.lastVisit}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        getRetentionColor(customer.lastVisit),
                      )}
                    />
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(
                        (new Date().getTime() - new Date(customer.lastVisit).getTime()) /
                          (1000 * 3600 * 24),
                      )}{' '}
                      dias
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <CustomerProfileModal customer={customer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function CustomerProfileModal({ customer }: { customer: any }) {
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
            {customer.vip && (
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
                Total Gasto
              </div>
              <div className="text-2xl font-bold text-emerald-600">R$ {customer.spend}</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Visitas
              </div>
              <div className="text-2xl font-bold">{customer.visits}</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Última Visita
              </div>
              <div className="text-lg font-bold">{customer.lastVisit}</div>
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
                    i < customer.stamps
                      ? 'border-accent bg-accent text-white scale-105 shadow-sm'
                      : 'border-muted bg-transparent text-muted-foreground/30',
                  )}
                >
                  <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              ))}
              <div className="aspect-square rounded-full flex items-center justify-center border-2 border-dashed border-emerald-500 text-emerald-500 bg-emerald-50 relative group">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 font-medium">
              Faltam {12 - customer.stamps} cortes para ganhar um serviço grátis!
            </p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Histórico Recente</h3>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border rounded-lg p-3 text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-full">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">
                        {i === 1 ? '15/10/2023' : '02/09/2023'}
                      </p>
                      <p className="text-muted-foreground">Profissional: Thiago</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-medium">
                    Corte + Barba
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
