import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { invokeRoleAuth } from '../lib/roleAuth.js'
import { ROLES } from '../config/navigation.js'
const RoleContext = createContext(null)
const profileRequests = new Map()
const roleSessionKey = 'scholara.role.session'

function clearRoleSession() {
  window.localStorage.removeItem(roleSessionKey)
}

function saveRoleSession(token, profile) {
  window.localStorage.setItem(roleSessionKey, JSON.stringify({ token, profile }))
}

function readRoleSession() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(roleSessionKey) ?? 'null')
    if (typeof saved?.token === 'string' && saved.profile && Object.hasOwn(ROLES, saved.profile.role)) return saved
  } catch {
    clearRoleSession()
  }
  return null
}

async function fetchUserProfile(user) {
  if (!profileRequests.has(user.id)) {
    const request = supabase.rpc('resolve_current_profile').then(({ data, error }) => {
      if (error) {
        if (error.message.includes('Admin approval is pending')) {
          throw new Error(error.message)
        }
        throw new Error(
          `${error.message}. Make sure database/login_profile_link_migration.sql has been run in Supabase.`
        )
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Your sign-in is not linked to an institute profile. Ask your administrator to verify your account.')
      }
      if (
        typeof data.id !== 'string'
        || typeof data.full_name !== 'string'
        || typeof data.email !== 'string'
        || !Object.hasOwn(ROLES, data.role)
      ) {
        throw new Error('The institute profile response is incomplete or has an unsupported role.')
      }
      return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        phone: data.phone ?? null,
      }
    }).finally(() => profileRequests.delete(user.id))
    profileRequests.set(user.id, request)
  }
  return profileRequests.get(user.id)
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
      if (window.localStorage.getItem(roleSessionKey)) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setProfileError(null)
        setProfileLoading(false)
      }
    })

    const initialize = async () => {
      try {
        const saved = readRoleSession()
        if (saved) {
          try {
            const data = await invokeRoleAuth({ action: 'restore', token: saved.token })
            if (!active) return
            setSession({ custom: true, token: saved.token, user: { id: data.profile.id } })
            setProfile(data.profile)
            setInitialized(true)
            return
          } catch (error) {
            if (error.status !== 401 && error.status !== 403) throw error
            clearRoleSession()
          }
        }

        const { data, error } = await supabase.auth.getSession()
        if (!active) return
        if (error) setProfileError(error)
        setSession(data.session)
      } catch (error) {
        if (!active) return
        setProfileError(error)
      }
      if (active) setInitialized(true)
    }
    initialize()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    if (session?.custom) {
      return () => { active = false }
    }
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
    clearRoleSession()
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
      setSession(null)
      if (signOutError) {
        setProfileLoading(false)
        throw new Error(`${profileLoadError.message} Sign-out also failed: ${signOutError.message}`)
      }
      throw profileLoadError
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const signInRole = useCallback(async (role, email, password) => {
    setProfileError(null)
    clearRoleSession()
    const data = await invokeRoleAuth({ action: 'login', role, email: email.trim(), password })
    if (!data?.token || !data.profile) throw new Error('The account service returned an invalid session.')
    saveRoleSession(data.token, data.profile)
    setSession({ custom: true, token: data.token, user: { id: data.profile.id } })
    setProfile(data.profile)
    return data.profile
  }, [])

  const signOut = useCallback(async () => {
    if (!session) clearRoleSession()
    if (session?.custom) {
      let logoutError
      try {
        await invokeRoleAuth({ action: 'logout', token: session.token })
      } catch (error) {
        logoutError = error
      } finally {
        clearRoleSession()
        setSession(null)
        setProfile(null)
        setProfileError(null)
      }
      if (logoutError) throw logoutError
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
    setProfileError(null)
  }, [session])

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
      signInRole,
      signOut,
      updateProfileName,
    }
  }, [profile, session, initialized, profileLoading, profileError, signIn, signInRole, signOut, updateProfileName])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
