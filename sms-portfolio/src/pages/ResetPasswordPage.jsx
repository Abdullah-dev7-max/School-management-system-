import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import GlassCard from '../components/ui/GlassCard.jsx'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw new Error(`Your password was updated, but sign-out failed: ${signOutError.message}`)
      setMessage('Your password has been updated. Sign in with your new password.')
    } catch (updateError) {
      setError(updateError.message || 'Could not update your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas p-4">
      <GlassCard className="relative w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink/60">Use at least 12 characters for your account.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">New password
            <input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
          <label className="block text-sm font-medium">Confirm new password
            <input type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {!message && <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-night-900 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>}
          {message && <Link to="/login" className="block text-center text-sm font-medium text-lilac-700 hover:underline">Return to sign in</Link>}
        </form>
      </GlassCard>
    </main>
  )
}
