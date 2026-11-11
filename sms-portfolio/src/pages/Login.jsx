import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles, X } from 'lucide-react'
import { ROLES } from '../config/navigation.js'
import { useRole } from '../context/RoleContext.jsx'
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
  const { signIn, signInRole, signOut } = useRole()
  const location = useLocation()
  const navigate = useNavigate()
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => window.localStorage.getItem('scholara.auth.remember') !== 'false')
  const [busy, setBusy] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminSignupAvailable, setAdminSignupAvailable] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(location.state?.notice ?? '')

  useEffect(() => {
    let active = true
    supabase.rpc('admin_signup_open').then(({ data, error: statusError }) => {
      if (!active) return
      if (statusError) {
        setAdminSignupAvailable(null)
        setError(`Could not check Admin request availability: ${statusError.message}`)
        return
      }
      setAdminSignupAvailable(data === true)
    }).catch((statusError) => {
      if (!active) return
      setAdminSignupAvailable(null)
      setError(`Could not check Admin request availability: ${statusError.message || 'Network error'}`)
    })
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    let authenticated = false
    try {
      if (!email.includes('@')) throw new Error('Enter the email address linked to your institute account.')
      if (registering) {
        if (role !== 'admin') throw new Error('Admin account requests are only available from the Admin role.')
        if (password.length < 12) throw new Error('Use a password with at least 12 characters.')
        if (password !== confirmPassword) throw new Error('The passwords do not match.')
        if (!username.trim()) throw new Error('Enter a username for the Admin account.')
        const { data: requestOpen, error: statusError } = await supabase.rpc('admin_signup_open')
        if (statusError) throw statusError
        if (requestOpen !== true) {
          setAdminSignupAvailable(false)
          throw new Error('Admin requests are unavailable. Apply the latest Admin review migration in Supabase.')
        }
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              account_type: 'admin_request',
              username: username.trim(),
              full_name: username.trim(),
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        if (signupError) throw signupError
        if (signupData.session) {
          const { error: signOutError } = await supabase.auth.signOut()
          if (signOutError) throw new Error(`Admin request was created, but the pending session could not be cleared: ${signOutError.message}`)
        }
        setMessage('Admin request submitted. Confirm your email; the active Admin will review it. If no Admin is active, the institute owner must approve the first request.')
        setRegistering(false)
        setConfirmPassword('')
      } else {
        setRememberSession(remember)
        if (role === 'teacher' || role === 'student') {
          await signInRole(role, email, password)
          navigate(role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard', { replace: true })
        } else {
          const profile = await signIn(email, password)
          authenticated = true
          if (profile.role !== role) {
            throw new Error(`This account belongs to the ${ROLES[profile.role]?.label ?? 'other'} role. Select the matching role and sign in again.`)
          }
          navigate(`/${profile.role}`, { replace: true })
        }
      }
    } catch (submitError) {
      if (authenticated) {
        try {
          await signOut()
        } catch (signOutError) {
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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f2f7f4] p-3 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-lilac-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-emerald-100/70 blur-3xl" />
      <GlassCard className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_32px_100px_-42px_rgba(12,37,45,0.38)] lg:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative isolate flex min-h-[220px] flex-col overflow-hidden bg-night-900 px-5 py-5 text-white sm:min-h-[270px] sm:px-10 sm:py-9 lg:min-h-full lg:px-12 lg:py-11">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_5%,rgba(104,180,157,0.35),transparent_40%),radial-gradient(ellipse_at_95%_95%,rgba(52,143,120,0.25),transparent_45%)]" />
          <div aria-hidden="true" className="absolute -right-28 top-24 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-16 top-36 -z-10 h-56 w-56 rounded-full border border-white/10" />

          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <GraduationCap className="h-7 w-7 text-lilac-200" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">Scholara</p>
              <p className="text-xs tracking-wide text-white/55">SCHOOL MANAGEMENT</p>
            </div>
          </div>

          <div className="my-5 max-w-md sm:my-10 lg:my-auto lg:py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-lilac-100">
              <Sparkles className="h-3.5 w-3.5" /> A brighter way to run your school
            </span>
            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.7rem]">
              Every school day,
              <span className="mt-1 block text-lilac-200">beautifully in sync.</span>
            </h2>
            <p className="mt-4 hidden max-w-sm text-sm leading-6 text-white/65 sm:block sm:text-base">
              Bring your people, progress, and day-to-day school life together in one thoughtful space.
            </p>

            <div className="mt-7 hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lilac-400/15 text-lilac-200">
                  <BookOpenCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">A clearer view of school life</p>
                  <p className="mt-0.5 text-xs text-white/50">Everything important, thoughtfully organized.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lilac-400/15 text-lilac-200">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">The right space for everyone</p>
                  <p className="mt-0.5 text-xs text-white/50">Dedicated access for your school community.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="hidden text-xs text-white/40 lg:block">Made for the people who make every school day matter.</p>
        </aside>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lilac-600">
                <span className="h-1.5 w-1.5 rounded-full bg-lilac-500" />
                Secure institute portal
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-night-900 sm:text-3xl">
                {registering ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-ink/55">
                {registering ? 'Set up an administrator account for your institute.' : 'Sign in to pick up right where your school left off.'}
              </p>
            </div>

            <div className="mb-6">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink/45">Continue as</p>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f3f7f5] p-1.5" role="tablist" aria-label="Account role">
                {roleOptions.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => { setRole(id); setRegistering(false); setError('') }} className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2 ${role === id ? 'bg-white text-night-900 shadow-sm ring-1 ring-black/[0.04]' : 'text-ink/55 hover:bg-white/70 hover:text-ink'}`}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {registering && (
                <label className="block text-sm font-medium text-ink">Admin username
                  <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={80} required className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-sm outline-none transition focus:border-lilac-500/60 focus:ring-4 focus:ring-lilac-500/10" />
                </label>
              )}
              <label className="block text-sm font-medium text-ink">Email address
                <span className="relative mt-1.5 block">
                  <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink/35" />
                  <input type="text" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} required className="h-12 w-full rounded-xl border border-ink/10 bg-white pl-11 pr-3.5 text-sm font-normal outline-none transition placeholder:text-ink/35 focus:border-lilac-500/60 focus:ring-4 focus:ring-lilac-500/10" placeholder="you@school.edu" />
                </span>
              </label>
              {registering && (
                <label className="block text-sm font-medium text-ink">Confirm password
                  <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} required className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-sm outline-none transition focus:border-lilac-500/60 focus:ring-4 focus:ring-lilac-500/10" />
                </label>
              )}
              <label className="block text-sm font-medium text-ink">Password
                <span className="relative mt-1.5 block">
                  <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink/35" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={registering ? 12 : undefined} required className="h-12 w-full rounded-xl border border-ink/10 bg-white py-2 pl-11 pr-12 text-sm font-normal outline-none transition focus:border-lilac-500/60 focus:ring-4 focus:ring-lilac-500/10" placeholder="Enter your password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink/45 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-500">
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </span>
              </label>

              {!registering && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-ink/60">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-ink/20 accent-lilac-600" />
                    Remember me
                  </label>
                  {role !== 'teacher' && role !== 'student' && (
                    <button type="button" onClick={() => { setResetOpen(true); setError('') }} className="font-medium text-lilac-600 transition hover:text-lilac-700 hover:underline">Forgot password?</button>
                  )}
                </div>
              )}

              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
              <button type="submit" disabled={busy} className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-semibold text-white shadow-lg shadow-night-900/15 transition hover:-translate-y-0.5 hover:bg-night-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lilac-500/30 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {busy ? 'Please wait…' : registering ? 'Set up administrator account' : `Sign in as ${ROLES[role].label}`}
                {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            {role === 'admin' && !registering && adminSignupAvailable === true && (
              <p className="mt-5 text-center text-sm text-ink/55">
                New to Scholara?{' '}
                <button type="button" onClick={() => { setRegistering(true); setError(''); setMessage('') }} className="font-semibold text-lilac-600 hover:text-lilac-700 hover:underline">
                  Create an Admin account
                </button>
              </p>
            )}
            {role === 'admin' && !registering && adminSignupAvailable === false && (
              <p className="mt-5 text-center text-xs leading-5 text-ink/50">
                Admin requests are temporarily unavailable. Apply the latest Admin review migration in Supabase.
              </p>
            )}
            {registering && (
              <button type="button" onClick={() => { setRegistering(false); setError(''); setMessage('') }} className="mt-5 w-full text-center text-sm font-semibold text-lilac-600 hover:text-lilac-700 hover:underline">
                Back to sign in
              </button>
            )}
            <div className="mt-7 flex items-center justify-center gap-2 border-t border-ink/[0.07] pt-5 text-xs text-ink/40">
              <ShieldCheck className="h-4 w-4 text-lilac-600/70" />
              Your school account is protected and private.
            </div>
          </div>
        </section>
      </GlassCard>
      {resetOpen && <PasswordResetModal initialEmail={email} onClose={() => setResetOpen(false)} />}
    </main>
  )
}
