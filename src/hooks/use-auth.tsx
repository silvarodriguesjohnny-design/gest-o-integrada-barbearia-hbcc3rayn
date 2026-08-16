import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Profile, Tenant } from '@/types'

const db = supabase as any

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  tenant: Tenant | null
  isSuperAdmin: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  refreshAuth: () => Promise<void>
  trialExpired: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const { data } = await db
        .from('profiles')
        .select('*, tenant:tenants(*)')
        .eq('id', uid)
        .single()
      if (data) {
        const { tenant: t, ...profileData } = data
        setProfile(profileData as Profile)
        setTenant(t as Tenant | null)
      } else {
        setProfile(null)
        setTenant(null)
      }
    } catch {
      // Em caso de erro, garante que a app não fique presa no spinner:
      // profile segue null e o loading é liberado.
      setProfile(null)
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      // Não setamos loading=false aqui: o carregamento do profile
      // (no useEffect abaixo) é quem libera o loading, evitando uma
      // janela onde loading=false mas profile=null — o que faria as
      // guards (SuperAdminRoute/TenantRoute) redirecionarem prematuro.
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      // Re-arma o loading a cada (re)carregamento de profile: ele só volta
      // para false após o profile ser carregado (ou falhar) — ver fetchProfile.
      // Sem isso, um novo login (após logout) deixaria loading=false enquanto
      // profile ainda é null, reabrindo a janela que redireciona as guards.
      setLoading(true)
      fetchProfile(user.id)
    } else {
      setProfile(null)
      setTenant(null)
      setLoading(false)
    }
  }, [user, fetchProfile])

  const refreshAuth = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/selecionar-perfil` },
    })
    return { error }
  }
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const isSuperAdmin = profile?.is_super_admin ?? false

  const trialExpired = useMemo(() => {
    if (!tenant) return false
    if (tenant.subscription_type === 'past_due') return true
    if (tenant.subscription_type === 'trial' && tenant.trial_ends_at) {
      return new Date(tenant.trial_ends_at) < new Date()
    }
    return false
  }, [tenant])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tenant,
        isSuperAdmin,
        signUp,
        signIn,
        signOut,
        refreshAuth,
        trialExpired,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
