const SIZES = {
  sm: 'h-9 w-9 rounded-xl text-xs',
  md: 'h-11 w-11 rounded-2xl text-sm',
  lg: 'h-16 w-16 rounded-3xl text-lg',
}

/** Initials avatar with a role-coloured gradient and an optional presence dot. */
export default function Avatar({ initials, accent, size = 'md', online = false, className = '' }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        aria-hidden="true"
        className={`grid place-items-center bg-gradient-to-br ${accent} font-semibold text-white shadow-md ${SIZES[size]}`}
      >
        {initials}
      </span>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
      )}
    </span>
  )
}
