import { useState } from 'react'
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
import { Handshake, Loader2, Plus } from 'lucide-react'
import { createCustomer } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'

export function PartnerDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name) {
      toast({ title: 'Informe o nome do parceiro', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await createCustomer({ name, phone, email })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Parceiro cadastrado!', description: `${name} foi adicionado.` })
      setName('')
      setPhone('')
      setEmail('')
      setOpen(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-primary border-dashed border-2 hover:bg-accent/5 hover:text-accent hover:border-accent transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Adicionar Parceiro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Handshake className="h-5 w-5 text-accent" /> Novo Parceiro
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
            <Label className="font-semibold">Telefone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">E-mail</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parceiro@email.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar Parceiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
