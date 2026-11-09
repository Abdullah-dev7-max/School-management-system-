import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useRole } from '../../context/RoleContext.jsx'
import { getGreeting } from '../../config/navigation.js'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default function HeroBanner() {
  const { profile } = useRole()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="rounded-2xl border border-white/70 bg-gradient-to-r from-lilac-100 to-pink-100 px-5 py-4 shadow-[0_14px_36px_-24px_rgba(94,60,190,0.55)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
          {getGreeting(now)}, {profile.full_name}
        </h2>
        <p className="inline-flex items-center gap-2 text-sm text-ink/65">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          <time dateTime={now.toISOString()}>{dateFormatter.format(now)}</time>
        </p>
      </div>
    </section>
  )
}
