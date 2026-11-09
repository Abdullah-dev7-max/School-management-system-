const TONES = {
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-rose-100 text-rose-700',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-sky-100 text-sky-800',
  brand: 'bg-lilac-100 text-lilac-600',
  neutral: 'bg-ink/5 text-ink/70',
}

const DOTS = {
  success: 'bg-emerald-500',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  brand: 'bg-lilac-500',
  neutral: 'bg-ink/40',
}

export default function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  )
}
