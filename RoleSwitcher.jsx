import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useRole } from '../../context/RoleContext.jsx'
import { ROLE_ORDER } from '../../config/navigation.js'

export default function RoleSwitcher() {
  const { role, setRole, roles } = useRole()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = roles[role]
  const CurrentIcon = current.icon

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (id) => {
    setRole(id)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass flex h-11 items-center gap-2.5 rounded-2xl pl-1.5 pr-3 outline-none transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-lilac-500/60"
      >
        <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${current.accent} text-white shadow-sm`}>
          <CurrentIcon className="h-4 w-4" strokeWidth={2.1} />
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-[11px] leading-none text-ink/50">Viewing as</span>
          <span className="mt-1 block text-sm font-semibold leading-none">{current.label}</span>
        </span>

        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-ink/50">
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Switch role"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            style={{ transformOrigin: 'top right' }}
            className="glass-strong absolute right-0 top-full z-50 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl p-2"
          >
            {ROLE_ORDER.map((id) => {
              const item = roles[id]
              const Icon = item.icon
              const selected = id === role

              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => choose(id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-500/60 ${
                    selected ? 'bg-lilac-100/80' : 'hover:bg-lilac-50'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-ink/55">{item.description}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-lilac-600" strokeWidth={2.5} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
