import { Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hero } from '@/components/landing/Hero'
import { Benefits } from '@/components/landing/Benefits'
import { Pricing } from '@/components/landing/Pricing'

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
            <Scissors className="h-6 w-6 text-accent" /> BarberFlow
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#benefits"
              className="hidden md:block text-sm font-medium hover:text-accent transition-colors"
            >
              Benefícios
            </a>
            <a
              href="#pricing"
              className="hidden md:block text-sm font-medium hover:text-accent transition-colors"
            >
              Planos
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button size="sm" className="bg-accent hover:bg-accent/90">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <Hero />
      <Benefits />
      <Pricing />

      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scissors className="h-5 w-5 text-accent" />
            <span className="font-serif text-lg font-bold text-primary">BarberFlow</span>
          </div>
          <p>© 2026 BarberFlow. A plataforma completa para barbearias modernas.</p>
        </div>
      </footer>
    </div>
  )
}
