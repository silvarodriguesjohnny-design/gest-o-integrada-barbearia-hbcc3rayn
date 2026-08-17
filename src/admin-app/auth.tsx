import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AdminProfile {
  id: string
  email: string
  full_name: string | null
  is_super_admin: boolean
}

interface AdminAuthState {
  user: User | null
  session: Session | null
  profile: AdminProfile | null
  loading: boolean
  isSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined)

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider')
  return ctx
}

async function fetchProfile(userId: string): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_super_admin')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return (data as AdminProfile) ?? null
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(user.id)
    setProfile(p)
  }, [user])

  // Boot: restore session
  useEffect(() => {
    let mounted = true

    const { data: subData } = supabase.auth.onAuthStateChange((_event, sess) => {
      // sync only — no async/await inside
      if (!mounted) return
      setSession(sess)
      setUser(sess?.user ?? null)
    })

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const sess = data.session
      setSession(sess)
      setUser(sess?.user ?? null)
      if (sess?.user) {
        const p = await fetchProfile(sess.user.id)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      subData.subscription.unsubscribe()
    }
  }, [])

  // Keep profile in sync with user
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    if (profile?.id === user.id) return
    fetchProfile(user.id).then(setProfile)
  }, [user, profile?.id])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    // Fetch profile to validate super admin immediately
    const {
      data: { user: signedUser },
    } = await supabase.auth.getUser()
    if (signedUser) {
      const p = await fetchProfile(signedUser.id)
      setProfile(p)
      if (!p?.is_super_admin) {
        // sign out non-admin immediately
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        return { error: 'Acesso restrito a super administradores.' }
      }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [])

  const value: AdminAuthState = {
    user,
    session,
    profile,
    loading,
    isSuperAdmin: !!profile?.is_super_admin,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
