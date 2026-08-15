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
  Bell,
  Calendar,
  DollarSign,
  Gift,
  Home,
  Search,
  Scissors,
  Users,
  LogOut,
  Settings,
  Crown,
  MessageCircle,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
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
import { NotificationBell } from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Agenda', path: '/agenda', icon: Calendar },
  { name: 'Clientes', path: '/clientes', icon: Users },
  { name: 'Barbeiros', path: '/barbeiros', icon: Scissors },
  { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { name: 'Campanhas', path: '/campanhas', icon: Gift },
  { name: 'Mensagens', path: '/mensagens', icon: MessageSquare },
  { name: 'Configurações', path: '/settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, tenant, isSuperAdmin, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="relative flex h-16 items-center border-b px-4">
            <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
            <div className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <Scissors className="h-5 w-5 text-accent" />
              )}
              <span className="truncate">{tenant?.name || 'na régua'}</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="mt-4 gap-1">
                  {[
                    ...NAV_ITEMS,
                    ...(isSuperAdmin
                      ? [
                          { name: 'Admin Financeiro', path: '/super-admin', icon: Crown },
                          {
                            name: 'Gerenciar Usuários',
                            path: '/gerenciar-usuarios',
                            icon: UserPlus,
                          },
                        ]
                      : []),
                  ].map((item) => {
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
              <div className="relative w-full max-w-md hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar clientes ou agendamentos..."
                  className="w-full bg-muted/50 pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tenant?.whatsapp_phone && (
                <a
                  href={`https://wa.me/${tenant.whatsapp_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex"
                >
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 text-success" />
                    Agendar via WhatsApp
                  </Button>
                </a>
              )}
              <NotificationBell />
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
                        {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{profile?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile?.role || 'viewer'}
                    </p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" /> Configurações
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
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
