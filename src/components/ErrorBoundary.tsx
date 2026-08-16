import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  message?: string
}

/**
 * ErrorBoundary genérico: captura erros de renderização dos filhos e exibe
 * uma fallback amigável em vez de deixar a tela em branco (o comportamento
 * padrão do React sem boundary). Usado no AdminLayout para envolver o Outlet.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Algo deu errado</h2>
              <p className="text-muted-foreground text-sm">
                {this.state.message || 'Ocorreu um erro inesperado ao renderizar esta página.'}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="amber" onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = '/admin')}>
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
