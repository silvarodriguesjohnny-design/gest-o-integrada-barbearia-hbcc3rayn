import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Hero } from '@/components/landing/Hero'
import { Benefits } from '@/components/landing/Benefits'
import { Testimonials } from '@/components/landing/Testimonials'
import { Pricing } from '@/components/landing/Pricing'
import { useAuth } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Landing() {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-2xl font-bold">
            <span className="text-amber-500">na régua</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#benefits"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-amber-500 transition-colors"
            >
              Benefícios
            </a>
            <a
              href="#testimonials"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-amber-500 transition-colors"
            >
              Depoimentos
            </a>
            <a
              href="#pricing"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-amber-500 transition-colors"
            >
              Planos
            </a>
            <ThemeToggle />
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-amber-500"
              >
                Login
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <Hero />
      <Benefits />
      <Testimonials />
      <Pricing />

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-serif text-lg font-bold text-amber-500">na régua</span>
          </div>
          <p>&copy; 2026 na régua. A plataforma completa para barbearias modernas.</p>
        </div>
      </footer>
    </div>
  )
}
