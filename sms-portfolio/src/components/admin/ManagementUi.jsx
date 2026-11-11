import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'

export function ManagementModal({ title, description, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-night-950/60 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="management-modal-title"
        className="glass-strong relative z-10 my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="management-modal-title" className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/60 hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function ManagementError({ error, onRetry }) {
  return (
    <GlassCard role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold">Could not load this section</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">{error?.message ?? 'Something went wrong.'}</p>
      </div>
      <button type="button" onClick={onRetry} className="inline-flex h-10 items-center gap-2 rounded-full bg-night-900 px-4 text-sm font-medium text-white">
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </GlassCard>
  )
}

export function Field({ label, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        {...props}
        className={`mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60 ${className}`}
      />
    </label>
  )
}

export function SelectField({ label, children, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        {...props}
        className={`mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60 ${className}`}
      >
        {children}
      </select>
    </label>
  )
}

export function FormError({ children }) {
  return children ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{children}</p> : null
}

export const FORM_BUTTON =
  'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60 disabled:opacity-50'
