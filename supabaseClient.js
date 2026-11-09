import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until both variables are set in .env (and the dev server is restarted). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    '[Scholara] Supabase is not configured. Copy .env.example to .env, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart `npm run dev`.'
  )
}

/**
 * Single shared Supabase client.
 * There is no login, so sessions are disabled and every request uses the public
 * anon key, limited by the RLS policies in database/*.sql.
 * Placeholder values keep the app rendering (with a setup notice) when env vars are missing.
 */
export const supabase = createClient(supabaseUrl ?? 'http://localhost:54321', supabaseAnonKey ?? 'missing-anon-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
