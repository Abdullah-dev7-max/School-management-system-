import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { ROLES } from '../config/navigation.js'
const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const [session, setSession] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setProfileError(error)
      setSession(data.session)
      setInitialized(true)
    }).catch((error) => {
      if (!active) return
      setProfileError(error)
      setInitialized(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!session?.user) {
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
      return () => { active = false }
    }

    setProfileLoading(true)
    supabase
      .from('users')
      .select('id, auth_user_id, full_name, email, role')
      .eq('auth_user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setProfile(null)
          setProfileError(error)
        } else {
          setProfile(data)
          setProfileError(null)
        }
        setProfileLoading(false)
      })
      .catch((error) => {
        if (!active) return
        setProfile(null)
        setProfileError(error)
        setProfileLoading(false)
      })

    return () => { active = false }
  }, [session?.user?.id])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const updateProfileName = useCallback(async (fullName) => {
    if (!session?.user) throw new Error('You must be signed in to update your profile.')
    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('auth_user_id', session.user.id)
      .select('id, auth_user_id, full_name, email, role')
      .single()
    if (error) throw error
    setProfile(data)
  }, [session?.user])

  const value = useMemo(() => {
    const current = ROLES[profile?.role] ?? ROLES.admin
    return {
      role: profile?.role ?? 'admin',
      roles: ROLES,
      profile,
      nav: current.nav,
      accent: current.accent,
      session,
      initialized,
      profileLoading,
      profileError,
      signOut,
      updateProfileName,
    }
  }, [profile, session, initialized, profileLoading, profileError, signOut, updateProfileName])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
