import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
  )
}

const rememberKey = 'scholara.auth.remember'
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const storageKey = `sb-${projectRef}-auth-token`
const browserStorage = {
  getItem(key) {
    const remember = window.localStorage.getItem(rememberKey)
    if (remember === 'false') return window.sessionStorage.getItem(key)
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  },
  setItem(key, value) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
    if (window.localStorage.getItem(rememberKey) === 'false') {
      window.sessionStorage.setItem(key, value)
    } else {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem(key) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export function setRememberSession(remember) {
  window.localStorage.setItem(rememberKey, remember ? 'true' : 'false')
  browserStorage.removeItem(storageKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: browserStorage, storageKey, persistSession: true },
})
