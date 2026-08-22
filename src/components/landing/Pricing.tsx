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
    <section id="pricing" className="py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Escolha seu plano
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Comece hoje com 30 dias grátis. Nada é cobrado hoje. Cancele quando quiser.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'relative border-border transition-all duration-200 ease-in-out',
                plan.popular
                  ? 'border-accent/50 shadow-lg shadow-accent/10 md:-translate-y-4 scale-105'
                  : 'hover:border-accent/40 hover:-translate-y-1 hover:shadow-md',
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                    <Crown className="h-3 w-3" /> Mais Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-foreground">R$ {plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-accent font-medium mt-1">{plan.barbers}</p>
                {plan.extra && <p className="text-xs text-muted-foreground">{plan.extra}</p>}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/onboarding?plan=${plan.name.toLowerCase()}`}>
                  <Button variant={plan.popular ? 'amber' : 'outline'} className="w-full">
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
