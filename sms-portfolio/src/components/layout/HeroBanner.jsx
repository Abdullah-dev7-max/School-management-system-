import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '../../context/RoleContext.jsx'
import { getGreeting } from '../../config/navigation.js'
import Avatar from '../ui/Avatar.jsx'

const dateFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export default function HeroBanner() {
  const { role, roles, profile, hero, accent } = useRole()
  const firstName = profile.name.split(' ')[0]
  const label = roles[role].label

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/70 bg-lilac-100 shadow-[0_28px_70px_-30px_rgba(94,60,190,0.6)]">
      {/* Pastel gradient: cross-fades when the role changes */}
      <AnimatePresence initial={false}>
        <motion.div
          key={role}
          aria-hidden="true"
          className="absolute inset-0 -z-20"
          style={{ background: hero.gradient }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Soft light orbs for depth. One drifts slowly, the other is still. */}
      <motion.div
        aria-hidden="true"
        className="absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-white/50 blur-3xl"
        animate={{ x: [0, -36, 0], y: [0, 22, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div aria-hidden="true" className="absolute -bottom-28 left-1/4 -z-10 h-72 w-72 rounded-full bg-lilac-500/20 blur-3xl" />

      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:p-10">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <span className="glass inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-ink/70">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateFormatter.format(new Date())}
          </span>

          <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
            {getGreeting()}, {firstName}
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/70">{hero.subtitle}</p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              to={hero.cta.to}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-night-900 px-5 text-sm font-medium text-white shadow-lg shadow-night-900/25 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2 focus-visible:ring-offset-lilac-100"
            >
              {hero.cta.label}
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            {hero.links.map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="glass inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-ink/80 outline-none transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-lilac-500/60"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Identity card: mirrors the current role selection */}
        <motion.div
          key={`${role}-card`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          className="glass hidden w-64 rounded-3xl p-5 md:block"
        >
          <Avatar initials={profile.initials} accent={accent} size="lg" online />
          <p className="mt-4 text-base font-semibold">{profile.name}</p>
          <p className="mt-0.5 text-sm text-ink/60">{profile.title}</p>
          <span className="mt-4 inline-flex h-7 items-center rounded-full bg-lilac-100 px-3 text-xs font-medium text-lilac-600">
            {label} view
          </span>
        </motion.div>
      </div>
    </section>
  )
}
