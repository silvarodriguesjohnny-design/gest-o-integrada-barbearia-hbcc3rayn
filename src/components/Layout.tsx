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
import { Loader2 } from 'lucide-react'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Agenda', path: '/agenda', icon: Calendar },
  { name: 'Clientes', path: '/clientes', icon: Users },
  { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { name: 'Campanhas', path: '/campanhas', icon: Gift },
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
          <SidebarHeader className="flex h-16 items-center border-b px-4">
            <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <Scissors className="h-6 w-6 text-accent" />
              )}
              <span className="truncate">{tenant?.name || 'BarberFlow'}</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="mt-4 gap-2">
                  {[
                    ...NAV_ITEMS,
                    ...(isSuperAdmin
                      ? [{ name: 'Super Admin', path: '/super-admin', icon: Crown }]
                      : []),
                  ].map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={cn('text-base transition-colors', isActive && 'text-accent')}
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
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="md:hidden" />
              <div className="relative w-full max-w-md hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar clientes ou agendamentos..."
                  className="w-full bg-muted/50 pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive border border-background"></span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-2">
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-accent transition-colors">
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
                    Configurações
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
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
