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
    const { data } = await db.from('profiles').select('*, tenant:tenants(*)').eq('id', uid).single()
    if (data) {
      const { tenant: t, ...profileData } = data
      setProfile(profileData as Profile)
      setTenant(t as Tenant | null)
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchProfile(user.id)
    } else {
      setProfile(null)
      setTenant(null)
    }
  }, [user, fetchProfile])

  const refreshAuth = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
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
