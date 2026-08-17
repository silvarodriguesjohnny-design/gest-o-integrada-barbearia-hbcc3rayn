import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../auth'
import { Button } from '../components/Button'
import { Scissors, ShieldCheck } from 'lucide-react'

export function LoginPage() {
  const { signIn } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A44A] text-white shadow-lg">
            <Scissors className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Painel Administrativo</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Acesso restrito a super administradores
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[#D4A44A] focus:ring-2 focus:ring-[#D4A44A]/30"
              placeholder="admin@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[#D4A44A] focus:ring-2 focus:ring-[#D4A44A]/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            <ShieldCheck className="h-4 w-4" /> Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Aplicação isolada · não compartilha código com a app principal
        </p>
      </div>
    </div>
  )
}
