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

interface FormState {
  full_name: string
  email: string
  phone: string
  cpf_cnpj: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  nome_negocio: string
  numero_cadeiras: number
  quantidade_profissionais: number
  horario_funcionamento: string
}

const INITIAL: FormState = {
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

type FormErrors = Partial<Record<keyof FormState, string>>

function validate(form: FormState): FormErrors {
  const e: FormErrors = {}
  if (!form.full_name.trim()) e.full_name = 'Nome completo é obrigatório'
  if (!form.email.trim()) e.email = 'E-mail é obrigatório'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
  if (!form.phone.trim()) e.phone = 'Telefone é obrigatório'
  if (!isValidCpfCnpj(form.cpf_cnpj)) e.cpf_cnpj = 'CPF (11) ou CNPJ (14) dígitos'
  if (form.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP deve ter 8 dígitos'
  if (!form.rua.trim()) e.rua = 'Rua é obrigatória'
  if (!form.numero.trim()) e.numero = 'Número é obrigatório'
  if (!form.bairro.trim()) e.bairro = 'Bairro é obrigatório'
  if (!form.cidade.trim()) e.cidade = 'Cidade é obrigatória'
  if (!form.estado) e.estado = 'Selecione o estado'
  if (!form.nome_negocio.trim()) e.nome_negocio = 'Nome da barbearia é obrigatório'
  if (form.numero_cadeiras < 1) e.numero_cadeiras = 'Mínimo 1'
  if (form.quantidade_profissionais < 1) e.quantidade_profissionais = 'Mínimo 1'
  if (!form.horario_funcionamento.trim()) e.horario_funcionamento = 'Horário é obrigatório'
  return e
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (key: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

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
    const foundErrors = validate(form)
    if (Object.keys(foundErrors).length > 0) {
      setErrors(foundErrors)
      toast({
        title: 'Verifique os campos',
        description: 'Preencha todos os campos obrigatórios (*).',
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
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Cadastro enviado com sucesso!', description: 'Aguarde a aprovação.' })
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <Card className="w-full max-w-md text-center shadow-2xl bg-[#121212] border-amber-500/20 text-slate-100">
          <CardHeader className="space-y-3">
            <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto" />
            <CardTitle className="text-2xl font-bold text-amber-500">Cadastro enviado!</CardTitle>
            <CardDescription className="text-slate-300">
              Sua barbearia foi cadastrada e está em análise. Você receberá uma confirmação por
              e-mail assim que for aprovada.
            </CardDescription>
            <Button
              onClick={() => navigate('/')}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Voltar ao Início
            </Button>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl mx-auto shadow-2xl bg-card border-amber-500/20 text-card-foreground">
        <CardHeader className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 font-serif text-2xl font-bold text-amber-500">
            <Scissors className="h-6 w-6 text-amber-500" />
            <span>na régua</span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Cadastre sua barbearia
          </CardTitle>
          <CardDescription className="text-muted-foreground">
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
                />
                <Err msg={errors.full_name} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                <Err msg={errors.email} />
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
                />
                <Err msg={errors.phone} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">CPF ou CNPJ *</Label>
                <Input
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={form.cpf_cnpj}
                  onChange={(e) => update('cpf_cnpj', formatCpfCnpj(e.target.value))}
                />
                <Err msg={errors.cpf_cnpj} />
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
                />
                <Err msg={errors.cep} />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label className="font-semibold">Rua *</Label>
                <Input value={form.rua} onChange={(e) => update('rua', e.target.value)} />
                <Err msg={errors.rua} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Número *</Label>
                <Input value={form.numero} onChange={(e) => update('numero', e.target.value)} />
                <Err msg={errors.numero} />
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
                <Input value={form.bairro} onChange={(e) => update('bairro', e.target.value)} />
                <Err msg={errors.bairro} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Cidade *</Label>
                <Input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} />
                <Err msg={errors.cidade} />
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
                <Err msg={errors.estado} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Nome da barbearia *</Label>
              <Input
                placeholder="Ex: Barbearia do João"
                value={form.nome_negocio}
                onChange={(e) => update('nome_negocio', e.target.value)}
              />
              <Err msg={errors.nome_negocio} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Nº de cadeiras *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.numero_cadeiras}
                  onChange={(e) => update('numero_cadeiras', parseInt(e.target.value) || 0)}
                />
                <Err msg={errors.numero_cadeiras} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Nº de profissionais *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantidade_profissionais}
                  onChange={(e) =>
                    update('quantidade_profissionais', parseInt(e.target.value) || 0)
                  }
                />
                <Err msg={errors.quantidade_profissionais} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Horário *</Label>
                <Input
                  placeholder="Seg-Sex 08-18h"
                  value={form.horario_funcionamento}
                  onChange={(e) => update('horario_funcionamento', e.target.value)}
                />
                <Err msg={errors.horario_funcionamento} />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar cadastro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
