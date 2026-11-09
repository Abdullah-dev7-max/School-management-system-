import { useMemo } from 'react'
import { CalendarX2, DoorOpen } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, ErrorState, Skeleton } from '../ui/States.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchTimetable } from '../../services/supabaseService.js'
import { groupBy } from '../../lib/analytics.js'
import { formatTime } from '../../lib/format.js'

const DAYS = [
  { n: 1, label: 'Monday' },
  { n: 2, label: 'Tuesday' },
  { n: 3, label: 'Wednesday' },
  { n: 4, label: 'Thursday' },
  { n: 5, label: 'Friday' },
]

const SUBJECT_BAR = {
  Mathematics: 'border-lilac-500',
  English: 'border-pink-400',
  Science: 'border-sky-400',
}

export default function TimetableBoard({ teacherId }) {
  const { data, error, loading, reload } = useAsync(() => fetchTimetable(teacherId), [teacherId])
  const byDay = useMemo(() => groupBy(data ?? [], 'day_of_week'), [data])
  const todayN = new Date().getDay()

  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Weekly timetable" description="Your periods across every class" />

      {error ? (
        <div className="mt-5"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && !data ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-busy="true">
          {DAYS.map((d) => <Skeleton key={d.n} className="h-64 rounded-2xl" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No periods scheduled" hint="Periods assigned to you will appear here." />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {DAYS.map((day) => (
            <section key={day.n} aria-label={day.label} className={`rounded-2xl p-3 ${day.n === todayN ? 'bg-lilac-100/70 ring-1 ring-lilac-300' : 'bg-white/50'}`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h4 className="text-sm font-semibold">{day.label}</h4>
                {day.n === todayN && <Badge tone="brand">Today</Badge>}
              </div>
              <ul className="space-y-2.5">
                {(byDay[day.n] ?? []).map((slot) => (
                  <li key={slot.id} className={`rounded-xl border-l-4 bg-white/80 p-3 shadow-sm ${SUBJECT_BAR[slot.subject] ?? 'border-ink/20'}`}>
                    <p className="text-xs tabular-nums text-ink/55">
                      {formatTime(slot.starts_at)} to {formatTime(slot.ends_at)}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{slot.subject}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/60">
                      <DoorOpen className="h-3.5 w-3.5" />
                      {slot.classes ? `${slot.classes.name} ${slot.classes.section}` : 'Class'}
                      {slot.room ? `, ${slot.room}` : ''}
                    </p>
                  </li>
                ))}
                {!(byDay[day.n] ?? []).length && <li className="px-1 py-4 text-center text-xs text-ink/45">Free day</li>}
              </ul>
            </section>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
