import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, PackagePlus } from 'lucide-react'
import { registerStockMovement } from '@/services/stock'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/types'

export function StockEntryDialog({
  product,
  open,
  onOpenChange,
  onDone,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Reposição')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!product) return
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await registerStockMovement({
      product_id: product.id,
      movement_type: 'entrada',
      quantity: qty,
      reason: reason.trim() || 'Reposição',
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: 'Entrada registrada!',
      description: `${qty} unidade(s) adicionadas a ${product.name}.`,
    })
    setQuantity('')
    setReason('Reposição')
    onOpenChange(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <PackagePlus className="h-5 w-5 text-accent" /> Entrada de Estoque
          </DialogTitle>
        </DialogHeader>
        {product && (
          <p className="text-sm text-muted-foreground -mt-2">
            Produto: <strong className="text-foreground">{product.name}</strong>
            <br />
            Estoque atual: {product.stock_quantity ?? 0} un.
          </p>
        )}
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label className="font-semibold">Quantidade *</Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Motivo</Label>
            <Input
              placeholder="Ex: Reposição, Compra de fornecedor..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
