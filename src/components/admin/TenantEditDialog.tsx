import { useState, useEffect } from 'react'
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
import { Loader2, Save } from 'lucide-react'
import { updateTenant } from '@/services/tenants'
import { useToast } from '@/hooks/use-toast'
import { formatPhone, formatCep, formatCpfCnpj } from '@/lib/masks'
import type { Tenant, PlanType } from '@/types'

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

interface Props {
  tenant: (Tenant & Record<string, any>) | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function TenantEditDialog({ tenant, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        full_name: tenant.full_name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        cpf_cnpj: tenant.cpf_cnpj || '',
        cep: tenant.cep || '',
        rua: tenant.rua || '',
        numero: tenant.numero || '',
        complemento: tenant.complemento || '',
        bairro: tenant.bairro || '',
        cidade: tenant.cidade || '',
        estado: tenant.estado || '',
        horario_funcionamento: tenant.horario_funcionamento || '',
        numero_cadeiras: tenant.numero_cadeiras || 1,
        quantidade_profissionais: tenant.quantidade_profissionais || 1,
        plan_type: tenant.plan_type || 'essential',
        whatsapp_phone: tenant.whatsapp_phone || '',
      })
    }
  }, [tenant])

  const update = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }))

  const handleCepBlur = async () => {
    const cep = (form.cep || '').replace(/\D/g, '')
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

  const handleSave = async () => {
    if (!tenant) return
    setLoading(true)
    const { error } = await updateTenant(tenant.id, {
      name: form.name,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      cpf_cnpj: form.cpf_cnpj,
      cep: form.cep,
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      horario_funcionamento: form.horario_funcionamento,
      numero_cadeiras: Number(form.numero_cadeiras) || 1,
      quantidade_profissionais: Number(form.quantidade_profissionais) || 1,
      plan_type: form.plan_type as PlanType,
      whatsapp_phone: form.whatsapp_phone,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Dados atualizados!' })
      onOpenChange(false)
      onSaved()
    }
  }

  if (!tenant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Editar Barbearia</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Nome da Barbearia *</Label>
              <Input value={form.name || ''} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Nome Completo</Label>
              <Input
                value={form.full_name || ''}
                onChange={(e) => update('full_name', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">E-mail</Label>
              <Input value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Telefone</Label>
              <Input
                value={form.phone || ''}
                onChange={(e) => update('phone', formatPhone(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">CPF/CNPJ</Label>
              <Input
                value={form.cpf_cnpj || ''}
                onChange={(e) => update('cpf_cnpj', formatCpfCnpj(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">WhatsApp</Label>
              <Input
                value={form.whatsapp_phone || ''}
                onChange={(e) => update('whatsapp_phone', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">CEP</Label>
              <Input
                value={form.cep || ''}
                onChange={(e) => update('cep', formatCep(e.target.value))}
                onBlur={handleCepBlur}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="font-semibold">Rua</Label>
              <Input value={form.rua || ''} onChange={(e) => update('rua', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Número</Label>
              <Input value={form.numero || ''} onChange={(e) => update('numero', e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="font-semibold">Complemento</Label>
              <Input
                value={form.complemento || ''}
                onChange={(e) => update('complemento', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Bairro</Label>
              <Input value={form.bairro || ''} onChange={(e) => update('bairro', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Cidade</Label>
              <Input value={form.cidade || ''} onChange={(e) => update('cidade', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Estado</Label>
              <Select value={form.estado || ''} onValueChange={(v) => update('estado', v)}>
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
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Cadeiras</Label>
              <Input
                type="number"
                min={1}
                value={form.numero_cadeiras || 1}
                onChange={(e) => update('numero_cadeiras', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Profissionais</Label>
              <Input
                type="number"
                min={1}
                value={form.quantidade_profissionais || 1}
                onChange={(e) => update('quantidade_profissionais', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Horário</Label>
              <Input
                value={form.horario_funcionamento || ''}
                onChange={(e) => update('horario_funcionamento', e.target.value)}
                placeholder="08-18h"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Plano</Label>
            <Select
              value={form.plan_type || 'essential'}
              onValueChange={(v) => update('plan_type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essential">Essential</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}{' '}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
