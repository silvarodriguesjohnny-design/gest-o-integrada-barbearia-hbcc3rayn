import { CalendarClock, Users, Wallet, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const BENEFITS = [
  {
    icon: CalendarClock,
    title: 'Agendamento Automatizado',
    description: 'Reduza faltas com lembretes automáticos e permita agendamentos online 24/7.',
  },
  {
    icon: Users,
    title: 'CRM Inteligente',
    description: 'Conheça cada cliente: histórico de visitas, preferências e dados de contato.',
  },
  {
    icon: Wallet,
    title: 'Controle Financeiro',
    description:
      'Controle de Caixa integrado, fluxo de caixa em tempo real e relatórios que você entende.',
  },
  {
    icon: Gift,
    title: 'Programa de Fidelidade',
    description: 'Cartão de selos digital que traz clientes de volta toda semana.',
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Tudo que sua barbearia precisa
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Pare de usar planilhas e papel. Professionalize sua gestão hoje.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <Card
              key={b.title}
              className="border-border transition-all duration-200 ease-in-out hover:border-accent/40 hover:shadow-md hover:-translate-y-1"
            >
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-2">
                  <b.icon className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-lg text-foreground">{b.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
