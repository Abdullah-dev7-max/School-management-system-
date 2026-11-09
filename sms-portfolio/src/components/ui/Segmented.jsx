import { motion } from 'framer-motion'

const SIZES = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-3.5 text-sm' }

/**
 * Radio-style segmented control with a gliding pill.
 * options: [{ value, label, icon?, activeBg?, activeText? }]
 * `layoutId` must be unique per control on the page.
 */
export default function Segmented({ options, value, onChange, layoutId, label, size = 'md', className = '' }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-ink/[0.05] p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative shrink-0 rounded-xl font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-500/60 ${SIZES[size]} ${
              active ? opt.activeText ?? 'text-ink' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className={`absolute inset-0 rounded-xl shadow-sm ${opt.activeBg ?? 'bg-white'}`}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" />}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
