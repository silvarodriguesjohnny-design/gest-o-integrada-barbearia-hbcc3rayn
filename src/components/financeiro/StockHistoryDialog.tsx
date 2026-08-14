import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, History, ArrowDownToLine, ArrowUpToLine } from 'lucide-react'
import { getStockMovements } from '@/services/stock'
import type { Product, StockMovement } from '@/types'

export function StockHistoryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!product || !open) return
    setLoading(true)
    getStockMovements(product.id).then(({ data, error }) => {
      setMovements(data || [])
      setLoading(false)
      if (error) setMovements([])
    })
  }, [product, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <History className="h-5 w-5 text-accent" /> Histórico de Movimentações
          </DialogTitle>
          {product && (
            <p className="text-sm text-muted-foreground -mt-1">
              {product.name} · Estoque atual: {product.stock_quantity ?? 0} un.
            </p>
          )}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.movement_type === 'entrada' ? 'default' : 'destructive'}
                        className={
                          m.movement_type === 'entrada'
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                            : ''
                        }
                      >
                        {m.movement_type === 'entrada' ? (
                          <ArrowDownToLine className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowUpToLine className="h-3 w-3 mr-1" />
                        )}
                        {m.movement_type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{m.quantity}</TableCell>
                    <TableCell className="text-sm">{m.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.created_by_name || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
