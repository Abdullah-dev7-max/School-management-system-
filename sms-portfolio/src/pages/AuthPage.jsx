import { useState } from 'react'
import { GraduationCap, LogIn, UserPlus } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import { Field, FORM_BUTTON, FormError } from '../components/admin/ManagementUi.jsx'

export default function AuthPage() {
  const { signIn, signUp, signupOpen, signupStatusError } = useRole()
  const [registering, setRegistering] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (registering) {
        if (password.length < 12) throw new Error('Use a password with at least 12 characters.')
        await signUp(fullName, email.trim(), password)
        setMessage('Check your email to confirm the administrator account before signing in.')
        setRegistering(false)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas p-4">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-lilac-300/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" />
      <GlassCard className="relative w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-lilac-400 to-lilac-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Institute administration</h1>
            <p className="text-sm text-ink/55">Sign in to manage school records</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {registering && (
            <Field label="Administrator full name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={160} autoComplete="name" required />
          )}
          <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} autoComplete="email" required />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={registering ? 12 : undefined} autoComplete={registering ? 'new-password' : 'current-password'} required />
          {registering && <p className="text-xs text-ink/55">At least 12 characters. Only the email pre-authorized in Supabase can create the first admin account.</p>}
          <FormError>{error || signupStatusError?.message}</FormError>
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <button type="submit" disabled={busy || (registering && !signupOpen)} className={`${FORM_BUTTON} w-full bg-night-900 text-white`}>
            {registering ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
            {busy ? 'Please wait…' : registering ? 'Create admin account' : 'Sign in'}
          </button>
        </form>

        {signupOpen && (
          <button type="button" onClick={() => { setRegistering((value) => !value); setError(''); setMessage('') }} className="mt-4 w-full text-center text-sm font-medium text-lilac-700 hover:underline">
            {registering ? 'Back to sign in' : 'Set up the initial admin account'}
          </button>
        )}
      </GlassCard>
    </main>
  )
}
