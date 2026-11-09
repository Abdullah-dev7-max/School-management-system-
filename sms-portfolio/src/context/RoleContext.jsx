import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { ROLES } from '../config/navigation.js'
const RoleContext = createContext(null)

async function fetchUserProfile(user) {
  const columns = 'id, auth_user_id, full_name, email, role'
  const linked = await supabase
    .from('users')
    .select(columns)
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (linked.error) throw linked.error
  if (linked.data) return linked.data

  if (user.email) {
    const byEmail = await supabase
      .from('users')
      .select(columns)
      .ilike('email', user.email)
      .maybeSingle()
    if (byEmail.error) throw byEmail.error
    if (byEmail.data?.auth_user_id === user.id) return byEmail.data
  }

  throw new Error('Your sign-in is not linked to an institute profile. Ask your administrator to link this Auth account to your profile.')
}

export function RoleProvider({ children }) {
  const [session, setSession] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setProfileError(null)
        setProfileLoading(false)
      }
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
    setProfileError(null)
    fetchUserProfile(session.user)
      .then((data) => {
        if (!active) return
        setProfile(data)
        setProfileError(null)
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

  const signIn = useCallback(async (email, password) => {
    setProfileError(null)
    setProfileLoading(true)
    let data
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (result.error) throw result.error
      data = result.data
    } catch (error) {
      setProfileLoading(false)
      throw error
    }

    setSession(data.session)
    try {
      const nextProfile = await fetchUserProfile(data.user)
      setProfile(nextProfile)
      setProfileError(null)
      return nextProfile
    } catch (profileLoadError) {
      setProfile(null)
      setProfileError(profileLoadError)
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        throw new Error(`${profileLoadError.message} Sign-out also failed: ${signOutError.message}`)
      }
      throw profileLoadError
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
    setProfileError(null)
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
      signIn,
      signOut,
      updateProfileName,
    }
  }, [profile, session, initialized, profileLoading, profileError, signIn, signOut, updateProfileName])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
