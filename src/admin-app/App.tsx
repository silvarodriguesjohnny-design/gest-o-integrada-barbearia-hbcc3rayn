import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AdminAuthProvider, useAdminAuth } from './auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BarbeariasPage } from './pages/BarbeariasPage'
import { ClientesPage } from './pages/ClientesPage'
import { AgendamentosPage } from './pages/AgendamentosPage'
import { StripeConfigPage } from './pages/StripeConfigPage'
import { TotemPwaPage } from './pages/TotemPwaPage'
import { NotFoundPage } from './pages/NotFoundPage'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D4A44A] border-t-transparent" />
    </div>
  )
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, loading } = useAdminAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="font-serif text-2xl font-bold text-red-600">Acesso restrito</p>
        <p className="max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          Sua conta não possui privilégios de super administrador.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAdmin>
            <Layout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="barbearias" element={<BarbeariasPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="agendamentos" element={<AgendamentosPage />} />
        <Route path="stripe" element={<StripeConfigPage />} />
        <Route path="totem-pwa" element={<TotemPwaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <AdminAuthProvider>
      <HashRouter>
        <AdminRoutes />
      </HashRouter>
    </AdminAuthProvider>
  )
}

export default App
