import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, DollarSign, X, Check, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/** Anima o valor de 0 até `target`, formatando em BRL. */
function useCountUp(target: number, start: boolean, duration = 1600) {
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!start || startedRef.current) return
    startedRef.current = true

    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export function LostRevenue() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const formatted = useCountUp(4580, visible)

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gray-950 dark:bg-gray-900 py-20 md:py-28"
    >
      {/* Glow de fundo vermelho/âmbar */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.18),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.10),_transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Título */}
        <div
          className={`text-center mb-12 transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Badge variant="outline" className="mb-4 border-red-500/30 bg-red-500/10 text-red-400">
            <TrendingDown className="h-3.5 w-3.5 mr-1" />
            Receita perdida
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            O Dinheiro que Você Está Deixando na Mesa
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-gray-400">
            Clientes que não voltaram nos últimos 6 meses custaram isso à sua barbearia. Cada corte
            perdido é dinheiro que saiu do seu bolso.
          </p>
        </div>

        {/* Card central com o valor perdido */}
        <div
          className={`transition-all duration-1000 delay-150 ease-out ${
            visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          <Card className="relative border-2 border-red-500/60 bg-gray-900/80 backdrop-blur shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)] overflow-hidden">
            {/* Ícone grande "escapando" no canto */}
            <DollarSign className="absolute -top-4 -right-2 h-32 w-32 text-red-500/10 rotate-12 select-none" />
            <CardContent className="relative flex flex-col items-center text-center py-10 md:py-14 px-6">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-red-500/15 mb-5">
                <TrendingDown className="h-7 w-7 text-red-500" />
              </div>
              <span className="text-sm uppercase tracking-widest text-red-400 font-medium mb-3">
                Valor perdido por ano
              </span>
              <div
                className="text-5xl md:text-6xl font-extrabold text-red-500 animate-pulse drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                aria-live="polite"
              >
                {formatted}
              </div>
              <p className="mt-6 max-w-xl text-sm md:text-base text-gray-300 leading-relaxed">
                Esse é o valor estimado que uma barbearia de médio porte perde por ano com a falta
                de um sistema de fidelidade.{' '}
                <span className="text-white font-semibold">
                  E se você pudesse recuperar 70% disso?
                </span>
              </p>
              <p className="mt-4 text-xs text-gray-500">
                *Estimativa baseada em ticket médio de R$ 45,00 e 3 visitas perdidas por cliente ao
                ano.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Antes vs Depois */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div
            className={`transition-all duration-700 delay-300 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Card className="h-full border-red-500/30 bg-gray-900/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
                    <X className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Sem fidelidade</h3>
                </div>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    Clientes vão e não voltam
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    Você depende da memória deles
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    Faturamento imprevisível
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div
            className={`transition-all duration-700 delay-450 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Card className="h-full border-emerald-500/30 bg-gray-900/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Check className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Com na régua</h3>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    Programa de fidelidade automático
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    Cliente volta por recompensas
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    Faturamento previsível e crescente
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div
          className={`mt-12 flex flex-col items-center text-center transition-all duration-700 delay-[600ms] ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link to="/onboarding">
            <Button variant="amber" size="lg" className="px-8 text-base h-12">
              Parar de Perder Dinheiro
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="mt-3 text-sm text-gray-400">
            Comece seu teste grátis de 30 dias. Nada é cobrado hoje. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  )
}
