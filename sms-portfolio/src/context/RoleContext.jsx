import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_ROLE, ROLES } from '../config/navigation.js'

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

  const setRole = useCallback((next) => {
    if (!ROLES[next]) return
    setRoleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable (private mode): the switch still works for this session */
    }
  }, [])

  const value = useMemo(() => {
    const current = ROLES[role]
    return {
      role,
      setRole,
      roles: ROLES,
      profile: current.profile,
      nav: current.nav,
      hero: current.hero,
      accent: current.accent,
    }
  }, [role, setRole])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
