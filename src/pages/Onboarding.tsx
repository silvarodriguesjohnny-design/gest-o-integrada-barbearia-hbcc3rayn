import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/services/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Scissors, Loader2, Check, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const PLANS = [
  { id: 'essential', name: 'Essential', price: 'R$ 97,90/mês' },
  { id: 'pro', name: 'Pro', price: 'R$ 117,90/mês' },
  { id: 'elite', name: 'Elite', price: 'R$ 297,90/mês' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [plan, setPlan] = useState(searchParams.get('plan') || 'pro')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })

    if (authError) {
      toast({
        title: 'Erro ao criar conta',
        description: authError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      toast({ title: 'Verifique seu e-mail', description: 'Confirme seu cadastro para continuar.' })
      setLoading(false)
      return
    }

    const { data: tenantData, error: tenantError } = await db
      .from('tenants')
      .insert({ name: shopName, owner_id: userId, plan_type: plan })
      .select()
      .single()

    if (tenantError) {
      toast({
        title: 'Erro ao criar barbearia',
        description: tenantError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    await db.from('profiles').update({ tenant_id: tenantData.id, role: 'admin' }).eq('id', userId)

    toast({ title: 'Conta criada!', description: 'Bem-vindo ao BarberFlow!' })
    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
            <Scissors className="h-6 w-6 text-accent" /> BarberFlow
          </div>
          <CardTitle>Criar sua conta</CardTitle>
          <CardDescription>Comece a gerenciar sua barbearia em minutos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName" className="font-semibold">
                Nome da Barbearia
              </Label>
              <Input
                id="shopName"
                placeholder="Ex: Barbearia do João"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Escolha seu Plano</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      plan === p.id
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                        : 'hover:border-accent/50',
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {plan === p.id && <Check className="h-3 w-3 text-accent" />}
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.price}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta e Começar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
