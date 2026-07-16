import { Link } from 'react-router-dom'
import { Scissors, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-accent/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-5xl px-4 py-24 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent mb-6 animate-fade-in-down">
          <Sparkles className="h-4 w-4" />
          A plataforma nº 1 para barbearias
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground animate-fade-in-up">
          Transforme sua Barbearia em um{' '}
          <span className="text-accent">Negócio de Alta Performance</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up">
          Automatize agendamentos, fidelize clientes, controle seu financeiro e aumente seu
          faturamento. Tudo em uma única plataforma feita para barbearias.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
          <Link to="/onboarding">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-accent hover:bg-accent/90 transition-all active:scale-95 shadow-lg"
            >
              <Scissors className="mr-2 h-5 w-5" />
              Começar Agora
            </Button>
          </Link>
          <a href="#pricing">
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg">
              Ver Planos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}
