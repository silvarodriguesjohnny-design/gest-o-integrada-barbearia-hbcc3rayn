import { Link } from 'react-router-dom'
import { Check, Crown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Essential',
    price: '97,90',
    barbers: '2 barbeiros inclusos',
    extra: '+ R$ 29,00 por barbeiro extra',
    features: [
      'Agendamento automatizado',
      'CRM de clientes',
      'Controle financeiro básico',
      '2 barbeiros inclusos',
    ],
  },
  {
    name: 'Pro',
    price: '117,90',
    barbers: '3 barbeiros inclusos',
    extra: '+ R$ 29,00 por barbeiro extra',
    features: [
      'Tudo do Essential',
      'Programa de fidelidade',
      'Campanhas automatizadas',
      '3 barbeiros inclusos',
      'Relatórios avançados',
    ],
    popular: true,
  },
  {
    name: 'Elite',
    price: '297,90',
    barbers: 'Barbeiros ilimitados',
    extra: 'Sem custo adicional',
    features: [
      'Tudo do Pro',
      'Barbeiros ilimitados',
      'Gestão multi-unidades',
      'Suporte prioritário',
      'White-label',
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Escolha seu plano
          </h2>
          <p className="mt-3 text-slate-400 text-lg">
            Comece hoje com 30 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'relative bg-slate-900 border-slate-800 transition-all duration-300',
                plan.popular
                  ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 md:-translate-y-4 scale-105'
                  : 'hover:border-amber-500/30 hover:-translate-y-1',
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-4 py-1 text-xs font-semibold text-white">
                    <Crown className="h-3 w-3" /> Mais Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-white">R$ {plan.price}</span>
                  <span className="text-slate-400">/mês</span>
                </div>
                <p className="text-sm text-amber-500 font-medium mt-1">{plan.barbers}</p>
                <p className="text-xs text-slate-500">{plan.extra}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/onboarding?plan=${plan.name.toLowerCase()}`}>
                  <Button
                    className={cn(
                      'w-full',
                      plan.popular
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
                    )}
                  >
                    Teste Grátis por 30 Dias
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
