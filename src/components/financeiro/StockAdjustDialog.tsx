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
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { registerStockMovement } from '@/services/stock'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/types'

export function StockAdjustDialog({
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
  const [newQuantity, setNewQuantity] = useState('')
  const [reason, setReason] = useState('Ajuste manual')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!product) return
    const newQty = Number(newQuantity)
    if (Number.isNaN(newQty) || newQty < 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' })
      return
    }
    const current = product.stock_quantity ?? 0
    const diff = newQty - current
    if (diff === 0) {
      toast({ title: 'Sem alteração', description: 'A nova quantidade é igual à atual.' })
      onOpenChange(false)
      return
    }
    setLoading(true)
    const { error } = await registerStockMovement({
      product_id: product.id,
      movement_type: diff > 0 ? 'entrada' : 'saida',
      quantity: Math.abs(diff),
      reason: reason.trim() || 'Ajuste manual',
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: 'Estoque ajustado!',
      description: `${product.name}: ${current} → ${newQty} un.`,
    })
    setNewQuantity('')
    setReason('Ajuste manual')
    onOpenChange(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <SlidersHorizontal className="h-5 w-5 text-accent" /> Ajustar Estoque
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
            <Label className="font-semibold">Nova quantidade exata *</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 25"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Será registrada uma movimentação automática de entrada ou saída.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Motivo</Label>
            <Input
              placeholder="Ex: Ajuste manual, contagem física..."
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ajustar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
