import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail, X } from 'lucide-react'
import { ROLES } from '../config/navigation.js'
import { supabase, setRememberSession } from '../lib/supabaseClient.js'
import GlassCard from '../components/ui/GlassCard.jsx'

const roleOptions = Object.values(ROLES)

function PasswordResetModal({ initialEmail, onClose }) {
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setMessage('If an account exists for this email, a password reset link will be sent.')
    } catch (resetError) {
      setError(resetError.message || 'Could not request a password reset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button type="button" aria-label="Close password reset dialog" onClick={onClose} className="fixed inset-0 bg-night-950/60 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="reset-title" className="text-xl font-semibold">Reset your password</h2>
            <p className="mt-1 text-sm text-ink/60">We’ll email you a secure password reset link.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Account email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Send reset link
          </button>
        </form>
      </section>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => window.localStorage.getItem('scholara.auth.remember') !== 'false')
  const [busy, setBusy] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [fullName, setFullName] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    let authenticated = false
    try {
      if (!email.includes('@')) throw new Error('Enter the email address linked to your institute account. Supabase login does not support usernames.')
      if (registering) {
        if (role !== 'admin') throw new Error('Only the initial administrator account can be set up here.')
        if (password.length < 12) throw new Error('Use a password with at least 12 characters.')
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        if (signupError) throw signupError
        setMessage('If this email is authorized for initial setup, check your inbox to confirm the administrator account.')
        setRegistering(false)
      } else {
        setRememberSession(remember)
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (loginError) throw loginError
        authenticated = true
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single()
        if (profileError) throw new Error('This account is not linked to an institute profile. Contact your administrator.')
        if (profile.role !== role) {
          throw new Error(`This account belongs to the ${ROLES[profile.role]?.label ?? 'other'} role. Select the matching role and sign in again.`)
        }
        navigate(`/${profile.role}`, { replace: true })
      }
    } catch (submitError) {
      if (authenticated) {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) {
          setError(`${submitError.message || 'Authentication failed.'} Sign-out also failed: ${signOutError.message}`)
          setBusy(false)
          return
        }
      }
      setError(submitError.message || 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas p-4">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-lilac-300/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" />
      <GlassCard className="relative w-full max-w-lg p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-lilac-400 to-lilac-600 text-white shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Welcome to Scholara</h1>
            <p className="text-sm text-ink/55">Sign in to your institute account</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/55 p-1.5 sm:grid-cols-4" role="tablist" aria-label="Account role">
          {roleOptions.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => { setRole(id); setRegistering(false); setError('') }} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors ${role === id ? 'bg-night-900 text-white shadow-sm' : 'text-ink/60 hover:bg-white/70 hover:text-ink'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {registering && (
            <label className="block text-sm font-medium">Administrator full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={160} required className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
            </label>
          )}
          <label className="block text-sm font-medium">Email / Username
            <span className="relative mt-1.5 block">
              <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input type="text" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} required className="h-11 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
            </span>
            <span className="mt-1 block text-xs font-normal text-ink/50">Use the email address linked to your account.</span>
          </label>
          <label className="block text-sm font-medium">Password
            <span className="relative mt-1.5 block">
              <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={registering ? 12 : undefined} required className="h-11 w-full rounded-xl border border-ink/10 bg-white py-2 pl-10 pr-12 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink/50 hover:bg-ink/5 hover:text-ink">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {!registering && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-ink/65">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-ink/20 accent-lilac-600" />
                Remember me
              </label>
              <button type="button" onClick={() => { setResetOpen(true); setError('') }} className="font-medium text-lilac-700 hover:underline">Forgot Password?</button>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-semibold text-white shadow-lg shadow-night-900/10 transition hover:bg-night-800 disabled:cursor-wait disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? 'Please wait…' : registering ? 'Set up administrator account' : `Sign in as ${ROLES[role].label}`}
          </button>
        </form>

        {role === 'admin' && !registering && (
          <button type="button" onClick={() => { setRegistering(true); setError(''); setMessage('') }} className="mt-5 w-full text-center text-sm font-medium text-lilac-700 hover:underline">
            Set up the initial administrator account
          </button>
        )}
        {registering && (
          <button type="button" onClick={() => { setRegistering(false); setError(''); setMessage('') }} className="mt-5 w-full text-center text-sm font-medium text-lilac-700 hover:underline">
            Back to sign in
          </button>
        )}
      </GlassCard>
      {resetOpen && <PasswordResetModal initialEmail={email} onClose={() => setResetOpen(false)} />}
    </main>
  )
}
