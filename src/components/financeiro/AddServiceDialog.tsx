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
import { createService } from '@/services/catalog'
import { useToast } from '@/hooks/use-toast'

export function AddServiceDialog({
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
  const [duration, setDuration] = useState('30')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ title: 'Preencha nome e preço', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await createService({
      name: name.trim(),
      price: Number(price),
      duration_minutes: Number(duration) || 30,
      description: description.trim() || undefined,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Serviço criado!', description: `${name} foi adicionado.` })
    setName('')
    setPrice('')
    setDuration('30')
    setDescription('')
    onOpenChange(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Novo Serviço</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Nome *</Label>
            <Input
              placeholder="Ex: Corte Masculino"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label className="font-semibold">Duração (min)</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
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
