import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar'
import {
  Scissors,
  LayoutDashboard,
  UserCheck,
  Store,
  CalendarDays,
  Users,
  Settings,
  LogOut,
  Download,
  MonitorSmartphone,
  Wallet,
  Repeat,
  CreditCard,
} from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Cadastros Pendentes', path: '/admin/cadastros-pendentes', icon: UserCheck },
  { name: 'Barbearias', path: '/admin/barbearias', icon: Store },
  { name: 'Agendamentos', path: '/admin/agendamentos', icon: CalendarDays },
  { name: 'Clientes', path: '/admin/clientes', icon: Users },
  { name: 'Relatórios', path: '/admin/relatorios', icon: Download },
  { name: 'Meu Caixa', path: '/admin/meu-caixa', icon: Wallet },
  { name: 'Totem & PWA', path: '/admin/totem-pwa', icon: MonitorSmartphone },
  { name: 'Stripe', path: '/admin/stripe', icon: CreditCard },
  { name: 'Configurações', path: '/admin/configuracoes', icon: Settings },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSwitchProfile = () => {
    navigate('/selecionar-perfil')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="relative flex h-16 items-center border-b px-4">
            <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
            <div className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
              <Scissors className="h-5 w-5 text-accent" />
              <span className="truncate">na régua</span>
              <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-accent">
                Admin
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="mt-4 gap-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={cn(
                            'text-sm font-medium transition-colors duration-200 ease-in-out',
                            isActive && 'bg-accent/10 text-accent font-semibold',
                          )}
                        >
                          <Link to={item.path}>
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Scissors className="h-4 w-4" />
              <span className="font-serif">na régua</span>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(217,119,6,0.04),_transparent_400px)]">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/70 transition-colors duration-200 ease-in-out">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h2 className="font-serif text-lg font-semibold leading-none">Painel do Admin</h2>
                <p className="text-xs text-muted-foreground mt-1">Gestão da plataforma Na Régua</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-1">
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-accent transition-colors duration-200 ease-in-out">
                      <AvatarImage
                        src={profile?.avatar_url || undefined}
                        alt={profile?.full_name || 'User'}
                      />
                      <AvatarFallback>
                        {profile?.full_name?.[0]?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{profile?.full_name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">Administrador</p>
                  </div>
                  <DropdownMenuItem onClick={handleSwitchProfile}>
                    <Repeat className="mr-2 h-4 w-4" /> Trocar de Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
            <div className="page-container">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
