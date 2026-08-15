import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Scissors } from 'lucide-react'
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 ease-in-out">
      {/* Header fixo 64px */}
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 transition-colors duration-200 ease-in-out">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <Scissors className="h-5 w-5 text-accent" />
            <span>na régua</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#benefits"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-accent transition-colors duration-200 ease-in-out"
            >
              Benefícios
            </a>
            <a
              href="#testimonials"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-accent transition-colors duration-200 ease-in-out"
            >
              Depoimentos
            </a>
            <a
              href="#pricing"
              className="hidden md:block text-sm font-medium text-muted-foreground hover:text-accent transition-colors duration-200 ease-in-out"
            >
              Planos
            </a>
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button variant="amber" size="sm">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <Hero />
      <Benefits />
      <Testimonials />
      <Pricing />

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scissors className="h-4 w-4 text-accent" />
            <span className="font-serif text-lg font-bold text-primary">na régua</span>
          </div>
          <p>&copy; 2026 na régua. A plataforma completa para barbearias modernas.</p>
        </div>
      </footer>
    </div>
  )
}
