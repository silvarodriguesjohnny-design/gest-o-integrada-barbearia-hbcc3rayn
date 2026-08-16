import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Plus,
  PackagePlus,
  SlidersHorizontal,
  History,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { getProducts } from '@/services/products'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { AddProductDialog } from '@/components/financeiro/AddProductDialog'
import { StockEntryDialog } from '@/components/financeiro/StockEntryDialog'
import { StockAdjustDialog } from '@/components/financeiro/StockAdjustDialog'
import { StockHistoryDialog } from '@/components/financeiro/StockHistoryDialog'
import type { Product } from '@/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type StatusVariant = 'danger' | 'warning' | 'success'

function stockStatusMeta(p: Product): { label: string; variant: StatusVariant } {
  const q = p.stock_quantity ?? 0
  const min = p.min_stock ?? 5
  if (q <= min) return { label: 'Estoque Baixo', variant: 'danger' }
  if (q > min && q <= min * 2) return { label: 'Estoque Médio', variant: 'warning' }
  return { label: 'OK', variant: 'success' }
}

export default function Estoque() {
  const { toast } = useToast()
  const { profile } = useAuth()
  const isStockManager = profile?.role === 'admin' || !!profile?.is_super_admin

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [showStockEntry, setShowStockEntry] = useState(false)
  const [showStockAdjust, setShowStockAdjust] = useState(false)
  const [showStockHistory, setShowStockHistory] = useState(false)

  const loadProducts = () => {
    setLoading(true)
    getProducts().then(({ data, error }) => {
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const totalProducts = products.length
  const lowStockCount = products.filter((p) => (p.stock_quantity ?? 0) <= (p.min_stock ?? 5)).length
  const okStockCount = products.filter((p) => stockStatusMeta(p).variant === 'success').length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
          <p className="text-muted-foreground mt-1">
            Monitore quantidades, receba alertas e registre entradas e ajustes.
          </p>
        </div>
        {isStockManager && (
          <Button variant="amber" onClick={() => setShowAddProduct(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Produto
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                Produtos Cadastrados
              </p>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/40 hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Estoque Baixo</p>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive mt-2">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-success/40 hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">OK</p>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success mt-2">{okStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4 space-y-0">
          <div>
            <CardTitle className="font-serif text-xl">Produtos & Estoque</CardTitle>
            <CardDescription>{totalProducts} produto(s) cadastrado(s)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Produto</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum produto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const q = p.stock_quantity ?? 0
                  const meta = stockStatusMeta(p)
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6 font-medium">
                        {p.name}
                        {p.description && (
                          <span className="block text-xs text-muted-foreground">
                            {p.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{fmt(Number(p.price))}</TableCell>
                      <TableCell className="font-semibold">{q}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-success"
                            title="Entrada de estoque"
                            onClick={() => {
                              setStockProduct(p)
                              setShowStockEntry(true)
                            }}
                          >
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-accent"
                            title="Ajustar estoque"
                            onClick={() => {
                              setStockProduct(p)
                              setShowStockAdjust(true)
                            }}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Histórico de movimentações"
                            onClick={() => {
                              setStockProduct(p)
                              setShowStockHistory(true)
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onCreated={loadProducts}
      />
      <StockEntryDialog
        product={stockProduct}
        open={showStockEntry}
        onOpenChange={setShowStockEntry}
        onDone={loadProducts}
      />
      <StockAdjustDialog
        product={stockProduct}
        open={showStockAdjust}
        onOpenChange={setShowStockAdjust}
        onDone={loadProducts}
      />
      <StockHistoryDialog
        product={stockProduct}
        open={showStockHistory}
        onOpenChange={setShowStockHistory}
      />
    </div>
  )
}
