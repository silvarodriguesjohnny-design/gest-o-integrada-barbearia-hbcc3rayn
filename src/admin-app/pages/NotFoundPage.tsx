import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="font-serif text-6xl font-bold text-[#D4A44A]">404</p>
      <p className="text-lg font-semibold">Página não encontrada</p>
      <p className="max-w-md text-sm text-[hsl(var(--muted-foreground))]">
        A página que você procura não existe no painel administrativo.
      </p>
      <Link to="/">
        <Button>Voltar ao Dashboard</Button>
      </Link>
    </div>
  )
}
