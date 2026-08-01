import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  FileSpreadsheet,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  Filter,
  X,
} from 'lucide-react'
import { getTransactions, createTransaction } from '@/services/transactions'
import { getServices } from '@/services/catalog'
import { getProducts } from '@/services/products'
import { getCustomers } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { generateFinanceiroPDF } from '@/lib/pdf-report'
import { generateFinanceiroExcel } from '@/lib/excel-export'
import { AddServiceDialog } from '@/components/financeiro/AddServiceDialog'
import { AddProductDialog } from '@/components/financeiro/AddProductDialog'
import type { Transaction, Service, CustomerWithDetails, Product } from '@/types'

interface CartItem {
  name: string
  price: number
  type: 'service' | 'product'
}

export default function Financeiro() {
  const { toast } = useToast()
  const { tenant } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [selectedService, setSelectedService] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)

  const [fType, setFType] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fPayment, setFPayment] = useState('all')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')

  const loadAll = () => {
    setLoading(true)
    getTransactions().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setTransactions(data || [])
      setLoading(false)
    })
  }

  const loadServices = () => getServices().then(({ data }) => data && setServices(data))
  const loadProducts = () => getProducts().then(({ data }) => data && setProducts(data))

  useEffect(() => {
    loadAll()
    loadServices()
    loadProducts()
    getCustomers().then(({ data }) => data && setCustomers(data))
  }, [])

  const addToCart = (type: 'service' | 'product') => {
    if (type === 'service') {
      const svc = services.find((s) => s.id === selectedService)
      if (svc) {
        setCart([...cart, { name: svc.name, price: Number(svc.price), type: 'service' }])
        setSelectedService('')
      }
    } else {
      const prod = products.find((p) => p.id === selectedProduct)
      if (prod) {
        setCart([...cart, { name: prod.name, price: Number(prod.price), type: 'product' }])
        setSelectedProduct('')
      }
    }
  }

  const total = cart.reduce((s, i) => s + i.price, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione serviços ao carrinho', variant: 'destructive' })
      return
    }
    setCheckingOut(true)
    for (const item of cart) {
      const { error } = await createTransaction({
        type: 'income',
        amount: item.price,
        description: item.type === 'service' ? `Serviço: ${item.name}` : `Produto: ${item.name}`,
        category: item.type === 'service' ? 'servico' : 'produto',
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
    loadAll()
  }

  const clearFilters = () => {
    setFType('all')
    setFCategory('all')
    setFPayment('all')
    setFDateFrom('')
    setFDateTo('')
  }

  const hasFilters =
    fType !== 'all' || fCategory !== 'all' || fPayment !== 'all' || fDateFrom || fDateTo

  const filteredTx = transactions.filter((t) => {
    if (fType !== 'all' && t.type !== fType) return false
    if (fCategory !== 'all') {
      if (fCategory === 'service' && t.category !== 'servico') return false
      if (fCategory === 'product' && t.category !== 'produto') return false
    }
    if (fPayment !== 'all' && t.payment_method !== fPayment) return false
    if (fDateFrom && new Date(t.created_at) < new Date(fDateFrom)) return false
    if (fDateTo) {
      const eod = new Date(fDateTo)
      eod.setHours(23, 59, 59, 999)
      if (new Date(t.created_at) > eod) return false
    }
    return true
  })

  const tIncome = filteredTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)
  const tExpense = filteredTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)
  const tBalance = tIncome - tExpense

  const handlePDF = () => {
    generateFinanceiroPDF(
      filteredTx,
      { income: tIncome, expense: tExpense, balance: tBalance },
      tenant?.name || 'Barbearia',
    )
  }

  const handleExcelExport = () => {
    setExportingExcel(true)
    try {
      const customerMap = new Map(customers.map((c) => [c.id, c.name]))
      generateFinanceiroExcel(
        filteredTx,
        { income: tIncome, expense: tExpense, balance: tBalance },
        tenant?.name || 'Barbearia',
        customerMap,
      )
    } catch {
      toast({ title: 'Erro', description: 'Falha ao gerar Excel.', variant: 'destructive' })
    }
    setTimeout(() => setExportingExcel(false), 600)
  }

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
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setShowAddService(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo Serviço
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddProduct(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>
          </div>
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
                    <Button
                      variant="secondary"
                      onClick={() => addToCart('service')}
                      disabled={!selectedService}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Adicionar Produto</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (R$ {p.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      onClick={() => addToCart('product')}
                      disabled={!selectedProduct}
                    >
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
                          <Badge
                            variant={item.type === 'service' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.type === 'service' ? 'Serviço' : 'Produto'}
                          </Badge>
                          {item.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{fmt(item.price)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
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
          <Card className="hover:shadow-elevation transition-shadow mb-4">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Filter className="h-5 w-5 text-accent" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={fType} onValueChange={setFType}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                      <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select value={fCategory} onValueChange={setFCategory}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="service">Serviços</SelectItem>
                      <SelectItem value="product">Produtos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pagamento</Label>
                  <Select value={fPayment} onValueChange={setFPayment}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cc">Crédito</SelectItem>
                      <SelectItem value="cd">Débito</SelectItem>
                      <SelectItem value="money">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={fDateFrom}
                    onChange={(e) => setFDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    value={fDateTo}
                    onChange={(e) => setFDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" /> Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="hover:shadow-elevation transition-shadow">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Receitas</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(tIncome)}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-elevation transition-shadow">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Despesas</p>
                <p className="text-2xl font-bold text-destructive">{fmt(tExpense)}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-elevation transition-shadow">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Saldo</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    tBalance >= 0 ? 'text-emerald-600' : 'text-destructive',
                  )}
                >
                  {fmt(tBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="hover:shadow-elevation transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="font-serif text-xl">Histórico de Transações</CardTitle>
                <CardDescription>
                  {filteredTx.length} de {transactions.length} registro(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePDF}>
                  <Download className="h-4 w-4 mr-2" /> Gerar Relatório em PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExcelExport}
                  disabled={exportingExcel}
                >
                  {exportingExcel ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Gerar Relatório em Excel
                </Button>
              </div>
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
                  ) : filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((t) => (
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

      <AddServiceDialog
        open={showAddService}
        onOpenChange={setShowAddService}
        onCreated={loadServices}
      />
      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onCreated={loadProducts}
      />
    </div>
  )
}
