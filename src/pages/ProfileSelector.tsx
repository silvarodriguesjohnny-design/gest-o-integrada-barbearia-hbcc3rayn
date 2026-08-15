import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Crown, Store, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import type { Tenant } from '@/types'

const db = supabase as any

export default function ProfileSelector() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [loading, user, navigate])

  useEffect(() => {
    async function loadTenants() {
      if (!profile) return
      // Dono de barbearia: tenants onde owner_id = profile.id
      // ou tenant_id do próprio perfil
      const { data } = await db
        .from('tenants')
        .select('*')
        .or(
          `owner_id.eq.${profile.id},id.eq.${profile.tenant_id || '00000000-0000-0000-0000-000000000000'}`,
        )
        .order('created_at', { ascending: true })
      setTenants((data || []) as Tenant[])
      setLoadingTenants(false)
    }
    loadTenants()
  }, [profile])

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const hasTenants = tenants.length > 0

  // Se não tem barbearia e é super admin → /admin direto
  if (!hasTenants && !loadingTenants && profile.is_super_admin) {
    navigate('/admin', { replace: true })
    return null
  }
  // Se não é super admin e não tem barbearia → sem barbearia
  if (!hasTenants && !loadingTenants && !profile.is_super_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Store className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Sem barbearia vinculada</h2>
            <p className="text-muted-foreground text-sm">
              Sua conta não está vinculada a nenhuma barbearia. Entre em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleChoose = (target: 'admin' | string) => {
    if (target === 'admin') navigate('/admin', { replace: true })
    else navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 font-serif text-3xl font-bold text-primary">
            <Scissors className="h-8 w-8 text-accent" />
            na régua
          </div>
          <h1 className="text-2xl font-semibold">Qual painel você quer acessar?</h1>
          <p className="text-muted-foreground text-sm">
            Escolha o perfil para entrar no painel correspondente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {profile.is_super_admin && (
            <button
              onClick={() => handleChoose('admin')}
              className="text-left transition-transform hover:scale-[1.02] focus:outline-none"
            >
              <Card className="h-full hover:border-accent/60 transition-colors">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Super Admin</h3>
                    <p className="text-sm text-muted-foreground">
                      Gerencie todas as barbearias, planos e integrações
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          )}

          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => handleChoose(t.id)}
              className="text-left transition-transform hover:scale-[1.02] focus:outline-none"
            >
              <Card className="h-full hover:border-accent/60 transition-colors">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg truncate">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gerencie sua barbearia: agenda, clientes, estoque
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {loadingTenants && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}
