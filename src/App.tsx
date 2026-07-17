import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import Landing from './pages/Landing'
import Index from './pages/Index'
import Clientes from './pages/Clientes'
import Agenda from './pages/Agenda'
import Financeiro from './pages/Financeiro'
import Campanhas from './pages/Campanhas'
import Settings from './pages/Settings'
import SuperAdmin from './pages/SuperAdmin'
import Onboarding from './pages/Onboarding'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
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

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Index />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/campanhas" element={<Campanhas />} />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
