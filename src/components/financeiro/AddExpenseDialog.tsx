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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowDownToLine } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createTransaction } from '@/services/transactions'

const PREDEFINED_CATEGORIES = [
  'Salários',
  'Aluguel',
  'Contas e Utilidades',
  'Insumos e Produtos',
  'Equipamentos',
  'Marketing e Publicidade',
  'Impostos e Taxas',
  'Manutenção',
  'Outros',
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}

export function AddExpenseDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('money')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const isCustom = category === 'Outros'

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!parsedAmount || parsedAmount <= 0 || !category || !date) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    if (isCustom && !customCategory.trim()) {
      toast({ title: 'Descreva o motivo da despesa', variant: 'destructive' })
      return
    }
    setLoading(true)
    const finalCategory = isCustom ? customCategory.trim() : category
    const finalDescription = description.trim() || `Despesa: ${finalCategory}`
    const createdAt = new Date(`${date}T12:00:00`).toISOString()
    const { error } = await createTransaction({
      type: 'expense',
      amount: parsedAmount,
      description: finalDescription,
      category: finalCategory,
      payment_method: paymentMethod,
      created_at: createdAt,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Despesa registrada!', description: finalCategory })
      setAmount('')
      setCategory('')
      setCustomCategory('')
      setDescription('')
      onOpenChange(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-destructive" />
            Nova Despesa
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Valor (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCustom && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Motivo personalizado *</Label>
              <Input
                placeholder="Descreva o motivo da despesa"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Método de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Descrição (opcional)</Label>
            <Input
              placeholder="Detalhes adicionais"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar Despesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
