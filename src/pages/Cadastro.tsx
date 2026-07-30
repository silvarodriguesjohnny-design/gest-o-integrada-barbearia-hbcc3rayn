import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { submitRegistration } from '@/services/pending-tenants'

function formatCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, '')
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export default function Cadastro() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
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
    numero_cadeiras: '1',
    quantidade_profissionais: '1',
    horario_funcionamento: '',
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleCep = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((p) => ({
          ...p,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }))
      }
    } catch {
      /* intentionally ignored */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = form.cpf_cnpj.replace(/\D/g, '')
    if (digits.length !== 11 && digits.length !== 14) {
      toast({ title: 'CPF/CNPJ inválido', variant: 'destructive' })
      return
    }
    if (!form.full_name || !form.email || !form.nome_negocio) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await submitRegistration({
      ...form,
      numero_cadeiras: parseInt(form.numero_cadeiras) || 1,
      quantidade_profissionais: parseInt(form.quantidade_profissionais) || 1,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold">Cadastro em Análise!</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Recebemos seu cadastro. Você receberá um email quando sua barbearia for aprovada.
        </p>
        <Link to="/">
          <Button className="mt-6">Voltar ao Início</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <Scissors className="h-6 w-6 text-accent" />
          <span className="font-serif text-xl font-bold">Na Régua</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Cadastro de Barbearia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.cpf_cnpj}
                    onChange={(e) => set('cpf_cnpj', formatCpfCnpj(e.target.value))}
                    maxLength={18}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => set('cep', e.target.value)}
                    onBlur={handleCep}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Rua</Label>
                  <Input value={form.rua} onChange={(e) => set('rua', e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => set('numero', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={form.complemento}
                    onChange={(e) => set('complemento', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={form.estado}
                    onChange={(e) => set('estado', e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Nome do Negócio *</Label>
                  <Input
                    value={form.nome_negocio}
                    onChange={(e) => set('nome_negocio', e.target.value)}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Cadeiras</Label>
                    <Input
                      type="number"
                      value={form.numero_cadeiras}
                      onChange={(e) => set('numero_cadeiras', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profissionais</Label>
                    <Input
                      type="number"
                      value={form.quantidade_profissionais}
                      onChange={(e) => set('quantidade_profissionais', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      value={form.horario_funcionamento}
                      onChange={(e) => set('horario_funcionamento', e.target.value)}
                      placeholder="08:00-18:00"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar Cadastro
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
