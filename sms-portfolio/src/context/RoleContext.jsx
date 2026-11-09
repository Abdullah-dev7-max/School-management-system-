import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_ROLE, ROLES } from '../config/navigation.js'

const STORAGE_KEY = 'scholara.role'
const SETTINGS_KEY = 'scholara.school-settings'
const RoleContext = createContext(null)

function readProfileName() {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) : null
    return typeof settings?.fullName === 'string' ? settings.fullName.trim() : ''
  } catch {
    return ''
  }
}

function getInitials(name, fallback) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')
  return (initials || fallback.slice(0, 2)).toUpperCase()
}

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
  const [profileName, setProfileName] = useState(readProfileName)

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
      profile: {
        name: profileName,
        title: current.label,
        initials: getInitials(profileName, current.label),
      },
      nav: current.nav,
      accent: current.accent,
    }
  }, [role, profileName, setRole])

  const updateProfileName = useCallback((name) => {
    setProfileName(name.trim())
  }, [])

  return <RoleContext.Provider value={{ ...value, setProfileName: updateProfileName }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
