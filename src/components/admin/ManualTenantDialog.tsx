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
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createTenantDirect } from '@/services/pending-tenants'
import { formatCpfCnpj } from '@/lib/masks'

export function ManualTenantDialog({
  onCreated,
  open: openProp,
  onOpenChange,
}: {
  onCreated: () => void
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Controlled (open/onOpenChange) when provided, otherwise uncontrolled.
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = (v: boolean) => {
    if (isControlled) {
      onOpenChange?.(v)
    } else {
      setInternalOpen(v)
    }
  }

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    nome_negocio: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    numero_cadeiras: '1',
    quantidade_profissionais: '1',
    horario_funcionamento: '08:00 - 18:00',
  })

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }))
      }
    } catch {
      /* ignore */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.nome_negocio.trim()) {
      toast({ title: 'Preencha os campos obrigatórios (*)', variant: 'destructive' })
      return
    }

    setLoading(true)
    const { data, error } = await createTenantDirect({
      ...form,
      numero_cadeiras: parseInt(form.numero_cadeiras) || 1,
      quantidade_profissionais: parseInt(form.quantidade_profissionais) || 1,
    })
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao cadastrar barbearia',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      const msg = data?.whatsapp_sent
        ? 'Barbearia cadastrada e aprovada! E-mail e WhatsApp enviados.'
        : 'Barbearia cadastrada e aprovada com sucesso!'
      toast({ title: 'Sucesso!', description: msg })
      setOpen(false)
      setForm({
        full_name: '',
        email: '',
        phone: '',
        cpf_cnpj: '',
        nome_negocio: '',
        cep: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        numero_cadeiras: '1',
        quantidade_profissionais: '1',
        horario_funcionamento: '08:00 - 18:00',
      })
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Cadastrar Barbearia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Cadastrar Barbearia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="text-sm font-semibold text-accent border-b pb-1">
            Informações do Responsável
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="João da Silva"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="joao@barbearia.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Telefone / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(11) 98765-4321"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF / CNPJ</Label>
              <Input
                value={form.cpf_cnpj}
                onChange={(e) => set('cpf_cnpj', formatCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div className="text-sm font-semibold text-accent border-b pb-1 pt-2">
            Informações da Barbearia
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome do Negócio *</Label>
            <Input
              value={form.nome_negocio}
              onChange={(e) => set('nome_negocio', e.target.value)}
              placeholder="Barbearia Premium"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nº Cadeiras</Label>
              <Input
                type="number"
                min="1"
                value={form.numero_cadeiras}
                onChange={(e) => set('numero_cadeiras', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissionais</Label>
              <Input
                type="number"
                min="1"
                value={form.quantidade_profissionais}
                onChange={(e) => set('quantidade_profissionais', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Horário</Label>
              <Input
                value={form.horario_funcionamento}
                onChange={(e) => set('horario_funcionamento', e.target.value)}
                placeholder="08:00 - 18:00"
              />
            </div>
          </div>

          <div className="text-sm font-semibold text-accent border-b pb-1 pt-2">Endereço</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => set('cep', e.target.value)}
                onBlur={handleCepBlur}
                placeholder="00000-000"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Rua / Logradouro</Label>
              <Input
                value={form.rua}
                onChange={(e) => set('rua', e.target.value)}
                placeholder="Rua das Flores"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              <Input
                value={form.numero}
                onChange={(e) => set('numero', e.target.value)}
                placeholder="123"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => set('complemento', e.target.value)}
                placeholder="Sala 2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => set('bairro', e.target.value)}
                placeholder="Centro"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado (UF)</Label>
              <Input
                value={form.estado}
                onChange={(e) => set('estado', e.target.value)}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Cadastrar Barbearia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
