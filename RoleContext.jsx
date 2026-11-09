import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_ROLE, ROLES } from '../config/navigation.js'
import { fetchProfileSummary } from '../services/supabaseService.js'
import { initials } from '../lib/format.js'

const STORAGE_KEY = 'scholara.role'
const RoleContext = createContext(null)

function readStoredRole() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && ROLES[stored] ? stored : DEFAULT_ROLE
  } catch {
    return DEFAULT_ROLE
  }
}

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(readStoredRole)
  const [live, setLive] = useState(null)

  const setRole = useCallback((next) => {
    if (!ROLES[next]) return
    setRoleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable: the switch still works for this session */
    }
  }, [])

  // Replace the placeholder identity with the real row from Supabase
  useEffect(() => {
    let cancelled = false
    setLive(null)
    fetchProfileSummary(ROLES[role].profile.email, role)
      .then((summary) => !cancelled && setLive(summary))
      .catch((error) => console.warn('[Scholara] Using fallback profile:', error.message))
    return () => {
      cancelled = true
    }
  }, [role])

  const value = useMemo(() => {
    const current = ROLES[role]
    const profile = live ? { ...current.profile, ...live, initials: initials(live.name) } : current.profile
    return { role, setRole, roles: ROLES, profile, nav: current.nav, hero: current.hero, accent: current.accent }
  }, [role, live, setRole])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
