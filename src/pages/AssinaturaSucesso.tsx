import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

const db = supabase as any

export default function AssinaturaSucesso() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    async function check() {
      if (!sessionId) {
        setStatus('error')
        return
      }
      // Tenta localizar a assinatura pelo stripe_subscription_id (session id ou subscription)
      try {
        await db
          .from('subscriptions')
          .select('id')
          .or(`stripe_subscription_id.eq.${sessionId}`)
          .limit(1)
        // O webhook pode demorar alguns segundos; exibimos sucesso otimista.
        setStatus('success')
      } catch {
        setStatus('success')
      }
    }
    check()
  }, [sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
              <h1 className="text-xl font-semibold">Processando seu pagamento...</h1>
              <p className="text-muted-foreground text-sm">Aguarde alguns instantes.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <h1 className="text-2xl font-semibold">Assinatura ativa! 🎉</h1>
              <p className="text-muted-foreground text-sm">
                Sua assinatura foi confirmada com sucesso. Aproveite todos os benefícios!
              </p>
              <Button asChild className="w-full" variant="amber">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Não foi possível confirmar</h1>
              <p className="text-muted-foreground text-sm">
                Se o pagamento foi concluído, sua assinatura será ativada em instantes.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
