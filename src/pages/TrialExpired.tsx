import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock, AlertCircle } from 'lucide-react'

export default function TrialExpired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Período de Teste Expirado</CardTitle>
          <CardDescription>
            Seu período de teste gratuito de 30 dias terminou. Assine um plano para continuar usando
            o na régua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">Seu período de teste terminou</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Para continuar gerenciando sua barbearia, escolha um plano pago. Você pode cancelar a
              qualquer momento.
            </p>
          </div>
          <Link to="/settings">
            <Button className="w-full bg-accent hover:bg-accent/90">Ir para Configurações</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Ver Planos
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
