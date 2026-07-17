import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Handshake, Loader2, Plus, Pencil } from 'lucide-react'
import { createPartner, updatePartner } from '@/services/partners'
import { useToast } from '@/hooks/use-toast'
import type { Partner } from '@/types'

interface PartnerDialogProps {
  onCreated: () => void
  partner?: Partner | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PartnerDialog({ onCreated, partner, open, onOpenChange }: PartnerDialogProps) {
  const { toast } = useToast()
  const isEdit = !!partner
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const [name, setName] = useState('')
  const [discount, setDiscount] = useState('0')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(partner?.name || '')
      setDiscount(String(partner?.discount_percentage || 0))
    }
  }, [isOpen, partner])

  const handleSave = async () => {
    if (!name) {
      toast({ title: 'Informe o nome do parceiro', variant: 'destructive' })
      return
    }
    setLoading(true)
    const payload = { name, discount_percentage: Number(discount) || 0 }
    const { error } = isEdit
      ? await updatePartner(partner!.id, payload)
      : await createPartner(payload)
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: isEdit ? 'Parceiro atualizado!' : 'Parceiro cadastrado!',
        description: `${name} foi ${isEdit ? 'atualizado' : 'adicionado'}.`,
      })
      setName('')
      setDiscount('0')
      setOpen(false)
      onCreated()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full text-primary border-dashed border-2 hover:bg-accent/5 hover:text-accent hover:border-accent transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Parceiro
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Handshake className="h-5 w-5 text-accent" />
            {isEdit ? 'Editar Parceiro' : 'Novo Parceiro'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do parceiro"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Porcentagem de Desconto (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Desconto aplicado aos clientes indicados por este parceiro.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? (
              <>
                <Pencil className="mr-2 h-4 w-4" /> Salvar Alterações
              </>
            ) : (
              'Cadastrar Parceiro'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
