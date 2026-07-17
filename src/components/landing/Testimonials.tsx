import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TESTIMONIALS = [
  {
    name: 'Rafael Mendes',
    shop: 'Barbearia Navalha',
    image: 'https://img.usecurling.com/ppl/medium?gender=male&seed=1',
    text: 'Desde que comecei a usar o na régua, minha agenda lotou. Os lembretes automáticos reduziram as faltas em 80%.',
  },
  {
    name: 'Diego Ferreira',
    shop: 'Studio Corte & Estilo',
    image: 'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
    text: 'O programa de fidelidade trouxe clientes de volta toda semana. Em 3 meses, meu faturamento aumentou 35%.',
  },
  {
    name: 'Bruno Carvalho',
    shop: 'Barbearia Vintage',
    image: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    text: 'O PDV integrado com o controle financeiro me deu clareza total do meu negócio. Não vivo mais sem.',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Barbeiros que já transformaram seus negócios
          </h2>
          <p className="mt-3 text-slate-400 text-lg">
            Mais de 500 barbearias já usam o na régua para crescer.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card
              key={t.name}
              className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-all duration-300"
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <img src={t.image} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.shop}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
