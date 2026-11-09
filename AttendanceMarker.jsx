import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCheck, Loader2, TriangleAlert, Users } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Segmented from '../ui/Segmented.jsx'
import Badge from '../ui/Badge.jsx'
import Avatar from '../ui/Avatar.jsx'
import { EmptyState, ErrorState, Skeleton } from '../ui/States.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchAttendanceSheet, saveAttendance } from '../../services/supabaseService.js'
import { formatDate, initials, toISODate } from '../../lib/format.js'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', activeBg: 'bg-emerald-600', activeText: 'text-white' },
  { value: 'absent', label: 'Absent', activeBg: 'bg-rose-600', activeText: 'text-white' },
  { value: 'late', label: 'Late', activeBg: 'bg-amber-300', activeText: 'text-ink' },
]

export default function AttendanceMarker({ classId, classLabel, teacherId }) {
  const today = toISODate()
  const [date, setDate] = useState(today)
  const sheet = useAsync(() => fetchAttendanceSheet(classId, date), [classId, date])
  const [marks, setMarks] = useState({})
  const [dirty, setDirty] = useState(false)
  const [save, setSave] = useState({ state: 'idle', message: '' })

  // Reset the grid whenever a fresh register is loaded (class or date changed)
  useEffect(() => {
    if (!sheet.data) return
    const next = {}
    sheet.data.roster.forEach((s) => {
      next[s.id] = sheet.data.existing[s.id] ?? 'present'
    })
    setMarks(next)
    setDirty(false)
    setSave({ state: 'idle', message: '' })
  }, [sheet.data])

  const roster = sheet.data?.roster ?? []
  const alreadySaved = roster.length > 0 && roster.every((s) => sheet.data.existing[s.id])

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 }
    Object.values(marks).forEach((v) => {
      if (c[v] != null) c[v] += 1
    })
    return c
  }, [marks])

  const setStatus = (id, status) => {
    setMarks((prev) => ({ ...prev, [id]: status }))
    setDirty(true)
    setSave({ state: 'idle', message: '' })
  }

  const markAllPresent = () => {
    setMarks(Object.fromEntries(roster.map((s) => [s.id, 'present'])))
    setDirty(true)
    setSave({ state: 'idle', message: '' })
  }

  const onSave = async () => {
    setSave({ state: 'saving', message: '' })
    try {
      await saveAttendance(roster.map((s) => ({ student_id: s.id, attended_on: date, status: marks[s.id], marked_by: teacherId })))
      setDirty(false)
      setSave({ state: 'saved', message: `Saved ${roster.length} records for ${formatDate(date)}` })
    } catch (error) {
      const hint = /row-level security|permission/i.test(error.message) ? ' Run database/step2_migration.sql to allow demo writes.' : ''
      setSave({ state: 'error', message: `${error.message}.${hint}` })
    }
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader
        title="Take attendance"
        description={`${classLabel}. Everyone starts as present, so only change the exceptions.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="attendance-date">Register date</label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-10 rounded-xl bg-white/70 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60"
            />
            <button
              type="button"
              onClick={markAllPresent}
              disabled={!roster.length}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/70 px-3.5 text-sm font-medium outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-lilac-500/60 disabled:opacity-40"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all present
            </button>
          </div>
        }
      />

      {sheet.error ? (
        <div className="mt-5"><ErrorState error={sheet.error} onRetry={sheet.reload} /></div>
      ) : sheet.loading && !sheet.data ? (
        <div className="mt-5 space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : roster.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class" hint="Add students to the class and they will show up here." />
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="success" dot>{counts.present} present</Badge>
            <Badge tone="danger" dot>{counts.absent} absent</Badge>
            <Badge tone="warning" dot>{counts.late} late</Badge>
            {alreadySaved && !dirty && <Badge tone="brand">Register already saved for this date</Badge>}
          </div>

          <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-white/50">
            {roster.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials(s.name)} accent="from-lilac-400 to-lilac-300" size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-ink/50">Roll {s.rollNo ?? '–'}</p>
                  </div>
                </div>
                <Segmented
                  size="sm"
                  label={`Attendance for ${s.name}`}
                  layoutId={`att-${s.id}`}
                  options={STATUS_OPTIONS}
                  value={marks[s.id]}
                  onChange={(value) => setStatus(s.id, value)}
                />
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${save.state === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
              {save.state === 'saved' && <Check className="h-4 w-4" />}
              {save.state === 'error' && <TriangleAlert className="h-4 w-4 shrink-0" />}
              {save.message}
            </p>
            <button
              type="button"
              onClick={onSave}
              disabled={save.state === 'saving' || (!dirty && alreadySaved)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-night-900 px-5 text-sm font-medium text-white shadow-lg shadow-night-900/20 outline-none focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {save.state === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {save.state === 'saving' ? 'Saving' : 'Save attendance'}
            </button>
          </div>
        </>
      )}
    </GlassCard>
  )
}
