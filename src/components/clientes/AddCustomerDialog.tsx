import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { createCustomer } from '@/services/customers'
import { useToast } from '@/hooks/use-toast'
import { formatCpf, isValidCpf } from '@/lib/masks'

export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [birthday, setBirthday] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    // Validação de CPF (se preenchido)
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf && !isValidCpf(cleanCpf)) {
      toast({
        title: 'CPF inválido',
        description: 'Verifique os dígitos do CPF.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await createCustomer({
      name,
      phone,
      email,
      cpf: cleanCpf || null,
      birthday: birthday || null,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Cliente cadastrado!', description: `${name} foi adicionado.` })
      setName('')
      setPhone('')
      setEmail('')
      setCpf('')
      setBirthday('')
      onOpenChange(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="cust-name">Nome</Label>
            <Input
              id="cust-name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-cpf">CPF</Label>
            <Input
              id="cust-cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              inputMode="numeric"
            />
            {cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone">Telefone</Label>
            <Input
              id="cust-phone"
              placeholder="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-email">E-mail</Label>
            <Input
              id="cust-email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-bday">Aniversário</Label>
            <Input
              id="cust-bday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || !name}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
