import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Building2, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function AdminConfiguracoes() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configurações administrativas da plataforma Na Régua.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Shield className="h-5 w-5 text-accent" /> Conta do Admin
            </CardTitle>
            <CardDescription>Informações da sua conta de administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{profile?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{profile?.email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Função:</span>
              <span className="font-medium">Administrador</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Building2 className="h-5 w-5 text-accent" /> Gestão de Barbearias
            </CardTitle>
            <CardDescription>Gerencie tenants, planos e assinaturas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-start" disabled>
              <SettingsIcon className="h-4 w-4 mr-2" /> Configurações de planos (em breve)
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elevation transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Bell className="h-5 w-5 text-accent" /> Notificações
            </CardTitle>
            <CardDescription>Preferências de notificações do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-start" disabled>
              <SettingsIcon className="h-4 w-4 mr-2" /> Configurar notificações (em breve)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
