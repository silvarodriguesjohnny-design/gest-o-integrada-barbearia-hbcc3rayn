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
import { Loader2 } from 'lucide-react'
import { createProduct } from '@/services/products'
import { useToast } from '@/hooks/use-toast'

export function AddProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ title: 'Preencha nome e preço', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await createProduct({
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Produto criado!', description: `${name} foi adicionado.` })
    setName('')
    setPrice('')
    setDescription('')
    onOpenChange(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Novo Produto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Nome *</Label>
            <Input
              placeholder="Ex: Pomada Modeladora"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Preço (R$) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Descrição</Label>
            <Input
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
