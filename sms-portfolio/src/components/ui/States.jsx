import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import GlassCard from './GlassCard.jsx'

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-lilac-100/80 ${className}`} />
}

export function ErrorState({ error, onRetry }) {
  return (
    <GlassCard role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold">Could not load this section</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">{error?.message ?? 'Something went wrong.'}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-night-900 px-4 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </GlassCard>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink/55">{hint}</p>}
      {action}
    </div>
  )
}
