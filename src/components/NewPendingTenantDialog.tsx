import { useState, ReactNode } from 'react'
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
import { Loader2 } from 'lucide-react'
import { submitRegistration } from '@/services/pending-tenants'
import { useToast } from '@/hooks/use-toast'
import { formatPhone, formatCep, formatCpfCnpj, isValidCpfCnpj } from '@/lib/masks'

const STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

const INITIAL = {
  full_name: '',
  email: '',
  phone: '',
  cpf_cnpj: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nome_negocio: '',
  numero_cadeiras: 1,
  quantidade_profissionais: 1,
  horario_funcionamento: '',
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="font-semibold">
        {label}
        {required && ' *'}
      </Label>
      {children}
    </div>
  )
}

export function NewPendingTenantDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)

  const update = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }))

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((p) => ({
          ...p,
          rua: data.logradouro || p.rua,
          bairro: data.bairro || p.bairro,
          cidade: data.localidade || p.cidade,
          estado: data.uf || p.estado,
        }))
      }
    } catch {
      /* ignore */
    }
  }

  const handleSubmit = async () => {
    if (!isValidCpfCnpj(form.cpf_cnpj)) {
      toast({
        title: 'CPF/CNPJ inválido',
        description: 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    const { error } = await submitRegistration({
      ...form,
      cpf_cnpj: form.cpf_cnpj.replace(/\D/g, ''),
      phone: form.phone.replace(/\D/g, ''),
      cep: form.cep.replace(/\D/g, ''),
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: 'Cliente cadastrado!',
      description: `${form.full_name} foi adicionado como pendente.`,
    })
    setForm(INITIAL)
    onOpenChange(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo" required>
              <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </Field>
            <Field label="E-mail" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefone" required>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => update('phone', formatPhone(e.target.value))}
              />
            </Field>
            <Field label="CPF ou CNPJ" required>
              <Input
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={form.cpf_cnpj}
                onChange={(e) => update('cpf_cnpj', formatCpfCnpj(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="CEP" required>
              <Input
                placeholder="00000-000"
                value={form.cep}
                onChange={(e) => update('cep', formatCep(e.target.value))}
                onBlur={handleCepBlur}
              />
            </Field>
            <Field label="Rua" required>
              <Input value={form.rua} onChange={(e) => update('rua', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Número" required>
              <Input value={form.numero} onChange={(e) => update('numero', e.target.value)} />
            </Field>
            <Field label="Complemento">
              <Input
                value={form.complemento}
                onChange={(e) => update('complemento', e.target.value)}
              />
            </Field>
            <Field label="Bairro" required>
              <Input value={form.bairro} onChange={(e) => update('bairro', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cidade" required>
              <Input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} />
            </Field>
            <Field label="Estado" required>
              <Select value={form.estado} onValueChange={(v) => update('estado', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Nome da barbearia" required>
            <Input
              placeholder="Ex: Barbearia do João"
              value={form.nome_negocio}
              onChange={(e) => update('nome_negocio', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nº de cadeiras" required>
              <Input
                type="number"
                min={0}
                value={form.numero_cadeiras}
                onChange={(e) => update('numero_cadeiras', parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Nº de profissionais" required>
              <Input
                type="number"
                min={0}
                value={form.quantidade_profissionais}
                onChange={(e) => update('quantidade_profissionais', parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Horário" required>
              <Input
                placeholder="Seg-Sex 08-18h"
                value={form.horario_funcionamento}
                onChange={(e) => update('horario_funcionamento', e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar Cadastro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
