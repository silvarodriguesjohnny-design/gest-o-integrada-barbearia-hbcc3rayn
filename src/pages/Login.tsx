import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Scissors, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou senha inválidos.',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'Invalid email or password': 'Email ou senha inválidos.',
}

function getErrorMessage(message: string): string {
  return ERROR_MESSAGES[message] || message
}

export default function Login() {
  const { signIn, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (!authLoading && user) return <Navigate to="/selecionar-perfil" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: getErrorMessage(error.message),
        variant: 'destructive',
      })
    } else {
      navigate('/selecionar-perfil')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    setLoading(false)
    if (error) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error.message),
        variant: 'destructive',
      })
    } else {
      setResetSent(true)
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 font-serif text-3xl font-bold text-primary">
              <Scissors className="h-8 w-8 text-accent" />
              na régua
            </div>
          </div>
          {resetSent ? (
            <>
              <CardTitle className="text-2xl">Verifique seu email</CardTitle>
              <CardDescription>
                Enviamos um link para redefinir sua senha para {email}.
              </CardDescription>
              <Button
                variant="link"
                onClick={() => {
                  setForgotMode(false)
                  setResetSent(false)
                }}
                className="mt-2"
              >
                Voltar para o login
              </Button>
            </>
          ) : forgotMode ? (
            <>
              <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
              <CardDescription>
                Digite seu email para receber um link de redefinição.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
              <CardDescription>Entre com suas credenciais para acessar o sistema.</CardDescription>
            </>
          )}
        </CardHeader>
        {!resetSent && (
          <CardContent>
            <form onSubmit={forgotMode ? handleResetPassword : handleSubmit} className="space-y-4">
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
              {!forgotMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-semibold">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-accent hover:text-accent/80 transition-colors duration-200 ease-in-out hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                variant="amber"
                className="w-full h-12 text-base"
                loading={loading}
              >
                {forgotMode ? 'Enviar link de redefinição' : 'Entrar'}
              </Button>
              {forgotMode && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setForgotMode(false)}
                  className="w-full"
                >
                  Voltar para o login
                </Button>
              )}
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
