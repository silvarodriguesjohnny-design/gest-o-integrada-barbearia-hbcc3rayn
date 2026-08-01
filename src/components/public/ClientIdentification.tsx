import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import {
  identifyCustomer,
  createPublicCustomer,
  type PublicCustomer,
} from '@/services/public-booking'

interface Props {
  tenantId: string
  onIdentified: (customer: PublicCustomer) => void
}

export function ClientIdentification({ tenantId, onIdentified }: Props) {
  const [mode, setMode] = useState<'choose' | 'existing' | 'new'>('choose')
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [channels, setChannels] = useState<string[]>(['email', 'whatsapp'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExisting = async () => {
    if (!cpf) return setError('Informe seu CPF')
    setLoading(true)
    setError('')
    const { data } = await identifyCustomer(tenantId, cpf)
    setLoading(false)
    if (data?.customer) onIdentified(data.customer)
    else setError('CPF não encontrado. Tente "Primeira vez".')
  }

  const handleNew = async () => {
    if (!cpf || !name || !phone) return setError('Preencha CPF, nome e telefone')
    setLoading(true)
    setError('')
    const { data } = await createPublicCustomer({
      tenant_id: tenantId,
      cpf,
      name,
      phone,
      email,
      communication_preferences: channels,
    })
    setLoading(false)
    if (data?.customer) onIdentified(data.customer)
    else setError('Erro ao cadastrar. Tente novamente.')
  }

  const toggleChannel = (ch: string) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]))

  if (mode === 'choose') {
    return (
      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Você já é cliente?</h2>
        <Card
          className="cursor-pointer hover:shadow-elevation transition-shadow"
          onClick={() => setMode('existing')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <UserCheck className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold">Sou cliente</p>
              <p className="text-sm text-muted-foreground">Informe apenas seu CPF</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-elevation transition-shadow"
          onClick={() => setMode('new')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <UserPlus className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold">Primeira vez na Barbearia</p>
              <p className="text-sm text-muted-foreground">Faça seu cadastro rápido</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
        ← Voltar
      </Button>
      {mode === 'existing' ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Identificação</h2>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white"
            onClick={handleExisting}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Buscar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Novo Cadastro</h2>
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Como deseja receber comunicações?</Label>
            <div className="flex gap-4">
              {['email', 'whatsapp', 'sms'].map((ch) => (
                <div key={ch} className="flex items-center gap-2">
                  <Checkbox
                    checked={channels.includes(ch)}
                    onCheckedChange={() => toggleChannel(ch)}
                  />
                  <Label className="capitalize cursor-pointer" onClick={() => toggleChannel(ch)}>
                    {ch}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white"
            onClick={handleNew}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar
          </Button>
        </div>
      )}
    </div>
  )
}
