import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, UserCheck, Loader2, Scissors } from 'lucide-react'
import {
  identifyCustomer,
  createPublicCustomer,
  type PublicCustomer,
} from '@/services/public-booking'
import { formatCpf, isValidCpf } from '@/lib/masks'

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

  const activeRef = useRef<HTMLDivElement>(null)

  // Rola suavemente até o campo focado quando o teclado virtual abre (tablet/totem)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' && activeRef.current) {
        activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [mode])

  const handleExisting = async () => {
    const cleanCpf = cpf.replace(/\D/g, '')
    if (!cleanCpf) return setError('Informe seu CPF')
    if (!isValidCpf(cleanCpf)) return setError('CPF inválido. Verifique os dígitos.')
    setLoading(true)
    setError('')
    const { data } = await identifyCustomer(tenantId, cleanCpf)
    setLoading(false)
    if (data?.customer) onIdentified(data.customer)
    else setError('CPF não encontrado. Tente "Primeira vez".')
  }

  const handleNew = async () => {
    const cleanCpf = cpf.replace(/\D/g, '')
    if (!cleanCpf || !name || !phone) return setError('Preencha CPF, nome e telefone')
    if (!isValidCpf(cleanCpf)) return setError('CPF inválido. Verifique os dígitos.')
    setLoading(true)
    setError('')
    const { data } = await createPublicCustomer({
      tenant_id: tenantId,
      cpf: cleanCpf,
      name,
      phone,
      email,
      communication_preferences: channels,
    })
    setLoading(false)
    if (data?.customer) onIdentified(data.customer)
    else setError('Erro ao cadastrar. Verifique se o CPF já não está cadastrado.')
  }

  const toggleChannel = (ch: string) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]))

  if (mode === 'choose') {
    return (
      <div className="grid gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-accent" />
          <h2 className="text-lg md:text-xl font-semibold">Você já é cliente?</h2>
        </div>
        <Card
          className="touch-card cursor-pointer hover:shadow-elevation active:scale-[0.98]"
          onClick={() => setMode('existing')}
        >
          <CardContent className="flex items-center gap-3 p-4 md:p-5 min-h-[56px]">
            <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <UserCheck className="h-6 w-6 md:h-7 md:w-7 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base md:text-lg">Sou cliente</p>
              <p className="text-sm text-muted-foreground">Informe apenas seu CPF</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="touch-card cursor-pointer hover:shadow-elevation active:scale-[0.98]"
          onClick={() => setMode('new')}
        >
          <CardContent className="flex items-center gap-3 p-4 md:p-5 min-h-[56px]">
            <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <UserPlus className="h-6 w-6 md:h-7 md:w-7 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base md:text-lg">Primeira vez na Barbearia</p>
              <p className="text-sm text-muted-foreground">Faça seu cadastro rápido</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5" ref={activeRef}>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-[48px] md:min-h-[56px] touch-manipulation"
        onClick={() => setMode('choose')}
      >
        ← Voltar
      </Button>
      {mode === 'existing' ? (
        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Identificação</h2>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              className="tablet-input h-12 md:h-14 text-base md:text-lg"
            />
            {cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full min-h-[56px] bg-accent hover:bg-accent/90 text-white text-base md:text-lg touch-manipulation"
            onClick={handleExisting}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Buscar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Novo Cadastro</h2>
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              className="tablet-input h-12 md:h-14 text-base md:text-lg"
            />
            {cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              inputMode="text"
              autoComplete="name"
              className="tablet-input h-12 md:h-14 text-base md:text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
              inputMode="tel"
              autoComplete="tel"
              className="tablet-input h-12 md:h-14 text-base md:text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              inputMode="email"
              autoComplete="email"
              className="tablet-input h-12 md:h-14 text-base md:text-lg"
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
                    className="touch-manipulation"
                  />
                  <Label
                    className="capitalize cursor-pointer text-sm md:text-base"
                    onClick={() => toggleChannel(ch)}
                  >
                    {ch}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full min-h-[56px] bg-accent hover:bg-accent/90 text-white text-base md:text-lg touch-manipulation"
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
