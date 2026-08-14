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
import Index from './pages/Index'
import Clientes from './pages/Clientes'
import Barbeiros from './pages/Barbeiros'
import Agenda from './pages/Agenda'
import Financeiro from './pages/Financeiro'
import Campanhas from './pages/Campanhas'
import Settings from './pages/Settings'
import EnvioManual from './pages/EnvioManual'
import SuperAdmin from './pages/SuperAdmin'
import UserManagement from './pages/UserManagement'
import SetPassword from './pages/SetPassword'
import Onboarding from './pages/Onboarding'
import TrialExpired from './pages/TrialExpired'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Layout from './components/Layout'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminCadastros from '@/pages/admin/AdminCadastros'
import AdminBarbearias from '@/pages/admin/AdminBarbearias'
import AdminAgendamentos from '@/pages/admin/AdminAgendamentos'
import AdminClientes from '@/pages/admin/AdminClientes'
import AdminConfiguracoes from '@/pages/admin/AdminConfiguracoes'
import AdminRelatorios from '@/pages/admin/AdminRelatorios'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, trialExpired, isSuperAdmin } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (trialExpired && !isSuperAdmin) return <Navigate to="/trial-expired" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
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
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book/:tenantId" element={<PublicBooking />} />
          <Route path="/confirmar/:token" element={<ConfirmAppointment />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/cadastro" element={<Onboarding />} />
          <Route path="/trial-expired" element={<TrialExpired />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Index />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/barbeiros" element={<Barbeiros />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/mensagens" element={<EnvioManual />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route
            element={
              <SuperAdminRoute>
                <Layout />
              </SuperAdminRoute>
            }
          >
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/gerenciar-usuarios" element={<UserManagement />} />
          </Route>
          <Route
            element={
              <SuperAdminRoute>
                <AdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/cadastros" element={<AdminCadastros />} />
            <Route path="/admin/barbearias" element={<AdminBarbearias />} />
            <Route path="/admin/agendamentos" element={<AdminAgendamentos />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
            <Route path="/admin/relatorios" element={<AdminRelatorios />} />
            <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
            <Route path="/admin" element={<AdminIndexRedirect />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
