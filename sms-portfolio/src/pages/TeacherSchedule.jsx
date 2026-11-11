import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { fetchRoleDashboard } from '../lib/api.js'
import { formatTime } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { ManagementError } from '../components/admin/ManagementUi.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const weekdayForDate = (date) => (date.getDay() === 0 ? 7 : date.getDay())
const minutesOfTime = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function LessonCard({ slot, currentMinutes, nextLessonId }) {
  const start = minutesOfTime(slot.starts_at)
  const end = minutesOfTime(slot.ends_at)
  const inProgress = currentMinutes >= start && currentMinutes < end
  const isNext = slot.id === nextLessonId

  return (
    <li className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${inProgress ? 'border-lilac-300 bg-lilac-50/80' : 'border-ink/5 bg-white/70'}`}>
      {inProgress && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-lilac-500" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{slot.className}</h3>
            <Badge tone={inProgress ? 'success' : isNext ? 'brand' : 'neutral'}>
              {inProgress ? 'In progress' : isNext ? 'Next class' : `Period ${slot.period}`}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-ink/75">{slot.subject}</p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-sm font-semibold tabular-nums text-ink">
          <Clock3 className="h-4 w-4 text-lilac-600" />
          {formatTime(slot.starts_at)}–{formatTime(slot.ends_at)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
        <span>Period {slot.period}</span>
        {slot.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Room {slot.room}</span>}
      </div>
    </li>
  )
}

export default function TeacherSchedule() {
  const { profile, session } = useRole()
  const navigate = useNavigate()
  const hasRoleSession = Boolean(window.localStorage.getItem('scholara.role.session') && session?.token)
  const dashboard = useAsync(
    () => fetchRoleDashboard(profile, session?.token),
    [profile.id, profile.role, session?.token]
  )
  const [now, setNow] = useState(() => new Date())
  const today = weekdayForDate(now)
  const [selectedDay, setSelectedDay] = useState(() => {
    const weekday = weekdayForDate(new Date())
    return weekday <= 5 ? weekday : 1
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (dashboard.error?.status === 401 || dashboard.error?.status === 403) {
      window.localStorage.removeItem('scholara.role.session')
      navigate('/login', { replace: true })
    }
  }, [dashboard.error, navigate])

  const slots = dashboard.data?.timetable ?? []
  const daySlots = useMemo(
    () => slots.filter((slot) => slot.day_of_week === selectedDay).sort((a, b) => a.period - b.period),
    [slots, selectedDay]
  )
  const todaySlots = useMemo(
    () => slots.filter((slot) => slot.day_of_week === today).sort((a, b) => a.period - b.period),
    [slots, today]
  )
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const nextLessonId = daySlots.find((slot) => minutesOfTime(slot.starts_at) > currentMinutes)?.id
  const todayNextLessonId = todaySlots.find((slot) => minutesOfTime(slot.starts_at) > currentMinutes)?.id
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)

  if (!hasRoleSession) return <Navigate to="/login" replace />
  if (dashboard.error) return <ManagementError error={dashboard.error} onRetry={dashboard.reload} />
  if (dashboard.loading || !dashboard.data) return <LoadingScreen label="Loading your teaching schedule" />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title="My schedule"
          description="See your classes for today and check your teaching week."
          action={<span className="inline-flex items-center gap-2 rounded-xl bg-lilac-50 px-3 py-2 text-sm font-medium text-ink/70"><CalendarDays className="h-4 w-4 text-lilac-600" />{dateLabel}</span>}
        />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title={today <= 5 ? "Today's classes" : 'No weekday classes today'}
          description={today <= 5 ? `${todaySlots.length} ${todaySlots.length === 1 ? 'class' : 'classes'} scheduled for ${WEEKDAYS[today - 1]}.` : 'Your weekly schedule is available below.'}
        />
        {todaySlots.length ? (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {todaySlots.map((slot) => (
              <LessonCard key={slot.id} slot={slot} currentMinutes={currentMinutes} nextLessonId={todayNextLessonId} />
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-ink/10 bg-white/40 px-4 py-8 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-ink/35" />
            <p className="mt-2 text-sm font-medium">No classes scheduled for today</p>
            <p className="mt-1 text-xs text-ink/55">If you expect a class here, ask the administrator to update your timetable.</p>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Weekly schedule" description="Choose a day to view its lessons." />
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Schedule day">
          {WEEKDAYS.map((day, index) => {
            const dayNumber = index + 1
            const count = slots.filter((slot) => slot.day_of_week === dayNumber).length
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={selectedDay === dayNumber}
                onClick={() => setSelectedDay(dayNumber)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${selectedDay === dayNumber ? 'bg-night-900 text-white' : 'bg-canvas text-ink/70 hover:bg-lilac-100'}`}
              >
                {day}<span className={`ml-2 text-xs ${selectedDay === dayNumber ? 'text-white/70' : 'text-ink/45'}`}>{count}</span>
              </button>
            )
          })}
        </div>
        {daySlots.length ? (
          <ul className="mt-3 grid gap-3 lg:grid-cols-2" role="tabpanel">
            {daySlots.map((slot) => (
              <LessonCard key={slot.id} slot={slot} currentMinutes={selectedDay === today ? currentMinutes : -1} nextLessonId={selectedDay === today ? nextLessonId : undefined} />
            ))}
          </ul>
        ) : (
          <p role="tabpanel" className="mt-3 rounded-2xl bg-canvas/70 px-4 py-8 text-center text-sm text-ink/55">
            No classes scheduled for {WEEKDAYS[selectedDay - 1]}.
          </p>
        )}
      </GlassCard>
    </div>
  )
}
