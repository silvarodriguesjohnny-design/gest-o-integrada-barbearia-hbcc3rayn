import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { submitRegistration } from '@/services/pending-tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowLeft, Scissors, CheckCircle } from 'lucide-react'
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

export default function Onboarding() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (key: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
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
      toast({
        title: 'Erro ao enviar cadastro',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader className="space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <CardTitle className="text-2xl">Cadastro enviado!</CardTitle>
            <CardDescription>
              Você receberá um e-mail quando sua conta for aprovada.
            </CardDescription>
            <Button onClick={() => navigate('/login')} className="w-full mt-4">
              Voltar para o login
            </Button>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
            <Scissors className="h-6 w-6 text-accent" />
            <span className="text-accent">na régua</span>
          </div>
          <CardTitle>Cadastre sua barbearia</CardTitle>
          <CardDescription>
            Preencha os dados abaixo. Após aprovação, você receberá um e-mail para definir sua
            senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Nome completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Telefone *</Label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => update('phone', formatPhone(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">CPF ou CNPJ *</Label>
                <Input
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={form.cpf_cnpj}
                  onChange={(e) => update('cpf_cnpj', formatCpfCnpj(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">CEP *</Label>
                <Input
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => update('cep', formatCep(e.target.value))}
                  onBlur={handleCepBlur}
                  required
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label className="font-semibold">Rua *</Label>
                <Input value={form.rua} onChange={(e) => update('rua', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Número *</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => update('numero', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label className="font-semibold">Complemento</Label>
                <Input
                  value={form.complemento}
                  onChange={(e) => update('complemento', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Bairro *</Label>
                <Input
                  value={form.bairro}
                  onChange={(e) => update('bairro', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Cidade *</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => update('cidade', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Estado *</Label>
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
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Nome da barbearia *</Label>
              <Input
                placeholder="Ex: Barbearia do João"
                value={form.nome_negocio}
                onChange={(e) => update('nome_negocio', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Nº de cadeiras *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.numero_cadeiras}
                  onChange={(e) => update('numero_cadeiras', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Nº de profissionais *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantidade_profissionais}
                  onChange={(e) =>
                    update('quantidade_profissionais', parseInt(e.target.value) || 0)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Horário *</Label>
                <Input
                  placeholder="Seg-Sex 08-18h"
                  value={form.horario_funcionamento}
                  onChange={(e) => update('horario_funcionamento', e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar cadastro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
