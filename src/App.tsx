import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import Landing from './pages/Landing'
import PublicBooking from './pages/PublicBooking'
import ConfirmAppointment from './pages/ConfirmAppointment'
import BarberPublicAgenda from './pages/BarberPublicAgenda'
import AssinaturaSucesso from './pages/AssinaturaSucesso'
import Index from './pages/Index'
import Clientes from './pages/Clientes'
import Barbeiros from './pages/Barbeiros'
import Agenda from './pages/Agenda'
import Financeiro from './pages/Financeiro'
import Campanhas from './pages/Campanhas'
import Settings from './pages/Settings'
import EnvioManual from './pages/EnvioManual'
import UserManagement from './pages/UserManagement'
import SetPassword from './pages/SetPassword'
import Onboarding from './pages/Onboarding'
import TrialExpired from './pages/TrialExpired'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import ProfileSelector from './pages/ProfileSelector'
import Layout from './components/Layout'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminCadastros from '@/pages/admin/AdminCadastros'
import AdminBarbearias from '@/pages/admin/AdminBarbearias'
import AdminAgendamentos from '@/pages/admin/AdminAgendamentos'
import AdminClientes from '@/pages/admin/AdminClientes'
import AdminConfiguracoes from '@/pages/admin/AdminConfiguracoes'
import AdminRelatorios from '@/pages/admin/AdminRelatorios'
import AdminTotemPwa from '@/pages/admin/AdminTotemPwa'
import AdminMeuCaixa from '@/pages/admin/AdminMeuCaixa'
import AdminStripeConfig from '@/pages/admin/AdminStripeConfig'
import Assinaturas from '@/pages/Assinaturas'

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  )
}

/**
 * Decide o destino pós-login:
 * - super admin E dono de barbearia → seletor de perfil
 * - super admin sem barbearia → /admin
 * - usuário comum com barbearia → /dashboard
 * - usuário comum sem barbearia → seletor (mostra tela "sem barbearia")
 */
function PostLoginRedirect({ children }: { children: ReactNode }) {
  const { user, profile, tenant, loading, isSuperAdmin, trialExpired } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />

  // Trial expirado: apenas barbearia vê; super admin não é afetado.
  if (trialExpired && !isSuperAdmin) return <Navigate to="/trial-expired" replace />

  const hasTenant = !!tenant

  if (isSuperAdmin && hasTenant) {
    // Página de seletor de perfil
    return <>{children}</>
  }
  if (isSuperAdmin && !hasTenant) {
    return <Navigate to="/admin" replace />
  }
  if (!isSuperAdmin && hasTenant) {
    return <Navigate to="/dashboard" replace />
  }
  // Não é super admin e não tem tenant: mostra seletor (tela "sem barbearia")
  return <>{children}</>
}

/** Rota do painel da barbearia: exige tenant (ou super admin). */
function TenantRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  // Super admin sem tenant vai para o admin
  if (profile?.is_super_admin && !profile.tenant_id) {
    return <Navigate to="/admin" replace />
  }
  // Usuário sem tenant (não super admin) → sem barbearia
  if (!profile?.tenant_id) {
    return <Navigate to="/selecionar-perfil" replace />
  }
  return <>{children}</>
}

/** Rota do Super Admin: exige is_super_admin. */
function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.is_super_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminIndexRedirect() {
  return <Navigate to="/admin/dashboard" replace />
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book/:tenantId" element={<PublicBooking />} />
          <Route path="/agendar/:slug" element={<PublicBooking />} />
          <Route path="/confirmar/:token" element={<ConfirmAppointment />} />
          <Route path="/barbeiro/:token" element={<BarberPublicAgenda />} />
          <Route path="/assinatura/sucesso" element={<AssinaturaSucesso />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/cadastro" element={<Onboarding />} />
          <Route path="/trial-expired" element={<TrialExpired />} />
          <Route path="/set-password" element={<SetPassword />} />

          {/* Seletor de perfil pós-login */}
          <Route
            path="/selecionar-perfil"
            element={
              <PostLoginRedirect>
                <ProfileSelector />
              </PostLoginRedirect>
            }
          />

          {/* Painel da Barbearia */}
          <Route
            element={
              <TenantRoute>
                <Layout />
              </TenantRoute>
            }
          >
            <Route path="/dashboard" element={<Index />} />
            <Route path="/dashboard/clientes" element={<Clientes />} />
            <Route path="/clientes" element={<Navigate to="/dashboard/clientes" replace />} />
            <Route path="/dashboard/barbeiros" element={<Barbeiros />} />
            <Route path="/barbeiros" element={<Navigate to="/dashboard/barbeiros" replace />} />
            <Route path="/dashboard/agenda" element={<Agenda />} />
            <Route path="/agenda" element={<Navigate to="/dashboard/agenda" replace />} />
            <Route path="/dashboard/financeiro" element={<Financeiro />} />
            <Route path="/financeiro" element={<Navigate to="/dashboard/financeiro" replace />} />
            <Route path="/dashboard/estoque" element={<Financeiro />} />
            <Route path="/dashboard/campanhas" element={<Campanhas />} />
            <Route path="/campanhas" element={<Navigate to="/dashboard/campanhas" replace />} />
            <Route path="/dashboard/mensagens" element={<EnvioManual />} />
            <Route path="/mensagens" element={<Navigate to="/dashboard/mensagens" replace />} />
            <Route path="/dashboard/servicos" element={<Financeiro />} />
            <Route path="/dashboard/assinaturas" element={<Assinaturas />} />
            <Route path="/dashboard/assinaturas/confirmacao" element={<AssinaturaSucesso />} />
            <Route path="/dashboard/configuracoes" element={<Settings />} />
            <Route path="/settings" element={<Navigate to="/dashboard/configuracoes" replace />} />
          </Route>

          {/* Painel Super Admin */}
          <Route
            element={
              <SuperAdminRoute>
                <AdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/cadastros-pendentes" element={<AdminCadastros />} />
            <Route
              path="/admin/cadastros"
              element={<Navigate to="/admin/cadastros-pendentes" replace />}
            />
            <Route path="/admin/barbearias" element={<AdminBarbearias />} />
            <Route path="/admin/agendamentos" element={<AdminAgendamentos />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
            <Route path="/admin/relatorios" element={<AdminRelatorios />} />
            <Route path="/admin/meu-caixa" element={<AdminMeuCaixa />} />
            <Route path="/admin/totem-pwa" element={<AdminTotemPwa />} />
            <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
            <Route path="/admin/stripe" element={<AdminStripeConfig />} />
            <Route path="/admin" element={<AdminIndexRedirect />} />
          </Route>

          {/* Legado: gerenciar usuários → admin */}
          <Route
            element={
              <SuperAdminRoute>
                <AdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route path="/gerenciar-usuarios" element={<UserManagement />} />
            <Route path="/super-admin" element={<Navigate to="/admin/meu-caixa" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
