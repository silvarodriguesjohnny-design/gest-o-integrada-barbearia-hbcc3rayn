import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Calendar, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.15),_transparent_50%)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-24 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-sm text-amber-500 mb-6 animate-fade-in-down">
          <Sparkles className="h-4 w-4" />
          30 dias grátis &middot; Sem cartão de crédito
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white animate-fade-in-up">
          A plataforma completa para <span className="text-amber-500">barbearias modernas</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 animate-fade-in-up">
          Automatize agendamentos, fidelize clientes, controle seu financeiro e aumente seu
          faturamento. Tudo em uma única plataforma feita para barbearias.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
          <Link to="/onboarding">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-amber-600 hover:bg-amber-700 text-white transition-all active:scale-95 shadow-lg"
            >
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <a href="#pricing">
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/5"
            >
              Ver Planos
            </Button>
          </a>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-400">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-5 w-5 text-amber-500" />
            Agenda automatizada
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-5 w-5 text-amber-500" />
            CRM de clientes
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-5 w-5 text-amber-500" />
            PDV integrado
          </div>
        </div>
      </div>
    </section>
  )
}
