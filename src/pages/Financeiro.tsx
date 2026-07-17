import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
} from 'lucide-react'
import { getTransactions, createTransaction } from '@/services/transactions'
import { getServices } from '@/services/catalog'
import { getCustomers } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Transaction, Service, CustomerWithDetails } from '@/types'

interface CartItem {
  service: Service
}

export default function Financeiro() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [selectedService, setSelectedService] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  const load = () => {
    setLoading(true)
    getTransactions().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setTransactions(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    getServices().then(({ data }) => data && setServices(data))
    getCustomers().then(({ data }) => data && setCustomers(data))
  }, [])

  const addToCart = () => {
    const svc = services.find((s) => s.id === selectedService)
    if (svc) {
      setCart([...cart, { service: svc }])
      setSelectedService('')
    }
  }

  const removeFromCart = (idx: number) => setCart(cart.filter((_, i) => i !== idx))

  const total = cart.reduce((s, item) => s + Number(item.service.price), 0)

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione serviços ao carrinho', variant: 'destructive' })
      return
    }
    setCheckingOut(true)
    for (const item of cart) {
      const { error } = await createTransaction({
        type: 'income',
        amount: Number(item.service.price),
        description: `Serviço: ${item.service.name}`,
        category: 'servico',
        payment_method: paymentMethod,
        customer_id: customerId || null,
      })
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
        setCheckingOut(false)
        return
      }
    }
    setCheckingOut(false)
    setCart([])
    setCustomerId('')
    toast({ title: 'Venda finalizada!', description: 'Transações registradas com sucesso.' })
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro & Controle de Caixa</h1>
        <p className="text-muted-foreground mt-1">Feche atendimentos e controle seu caixa.</p>
      </div>

      <Tabs defaultValue="pdv" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="pdv"
            className="data-[state=active]:bg-accent data-[state=active]:text-white"
          >
            Controle de Caixa
          </TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="pdv" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <ShoppingCart className="h-5 w-5 text-accent" /> Nova Venda
                </CardTitle>
                <CardDescription>Selecione o cliente e os serviços realizados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Buscar Cliente</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Adicionar Serviço</Label>
                  <div className="flex gap-2">
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} (R$ {s.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" onClick={addToCart} disabled={!selectedService}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border p-5 bg-muted/30 mt-6 space-y-4 shadow-inner">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carrinho vazio</p>
                  ) : (
                    cart.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-medium flex items-center gap-2">
                          {item.service.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {fmt(Number(item.service.price))}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFromCart(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </span>
                      </div>
                    ))
                  )}
                  {cart.length > 0 && (
                    <div className="border-t pt-4 flex justify-between items-center font-bold text-xl">
                      <span>Total</span>
                      <span className="text-emerald-600">{fmt(total)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="font-serif text-xl">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cc">Cartão de Crédito</SelectItem>
                      <SelectItem value="cd">Cartão de Débito</SelectItem>
                      <SelectItem value="money">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {customerId && (
                  <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg flex gap-3 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div className="text-sm text-accent-foreground/90">
                      <strong>Fidelidade Ativa:</strong> Esta venda adicionará selos ao cartão do
                      cliente.
                    </div>
                  </div>
                )}
                <Button
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 shadow-md"
                  onClick={handleCheckout}
                  disabled={checkingOut || cart.length === 0}
                >
                  {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Finalizar Venda
                  - {fmt(total)}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-6">
          <Card className="hover:shadow-elevation transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="font-serif text-xl">Histórico de Transações</CardTitle>
                <CardDescription>Entradas e saídas registradas.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({ title: 'Exportação', description: 'Gerando relatório PDF...' })
                }
              >
                <Download className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Data/Hora</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right pr-6">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="pl-6 font-medium">
                          {new Date(t.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.payment_method || '-'}</TableCell>
                        <TableCell className="text-right pr-6">
                          <span
                            className={cn(
                              'font-bold flex items-center justify-end gap-1.5',
                              t.type === 'income' ? 'text-emerald-600' : 'text-destructive',
                            )}
                          >
                            {t.type === 'income' ? (
                              <ArrowUpToLine className="h-4 w-4" />
                            ) : (
                              <ArrowDownToLine className="h-4 w-4" />
                            )}
                            {fmt(Number(t.amount))}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
