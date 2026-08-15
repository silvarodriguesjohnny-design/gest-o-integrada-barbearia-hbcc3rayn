import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Calendar, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.15),_transparent_50%)]" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent mb-6 animate-fade-in-down">
          <Sparkles className="h-4 w-4" />
          30 dias grátis &middot; Sem cartão de crédito
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground animate-fade-in-up">
          A plataforma completa para <span className="text-accent">barbearias modernas</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up">
          Automatize agendamentos, fidelize clientes, controle seu financeiro e aumente seu
          faturamento. Tudo em uma única plataforma feita para barbearias.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
          <Link to="/onboarding">
            <Button variant="amber" size="lg" className="w-full sm:w-auto">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <a href="#pricing" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Ver Planos
            </Button>
          </a>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-5 w-5 text-accent" />
            Agenda automatizada
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-5 w-5 text-accent" />
            CRM de clientes
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-5 w-5 text-accent" />
            Controle de Caixa integrado
          </div>
        </div>
      </div>
    </section>
  )
}
