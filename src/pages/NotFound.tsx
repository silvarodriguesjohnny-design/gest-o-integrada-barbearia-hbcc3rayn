import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Scissors } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex items-center gap-2 font-serif text-xl font-bold text-primary mb-8">
        <Scissors className="h-5 w-5 text-accent" />
        na régua
      </div>
      <p className="text-6xl font-bold text-accent mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        A página que você procura não existe ou foi movida. Verifique o endereço ou volte para o
        início.
      </p>
      <Link to="/">
        <Button variant="amber">Voltar para o início</Button>
      </Link>
    </div>
  )
}

export default NotFound
