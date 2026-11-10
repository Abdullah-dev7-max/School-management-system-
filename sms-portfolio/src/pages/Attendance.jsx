import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCheck, Loader2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { fetchAttendancePage, saveAttendance } from '../lib/api.js'
import { toISODate } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Skeleton } from '../components/ui/States.jsx'
import { ManagementError, SelectField } from '../components/admin/ManagementUi.jsx'
import { useRole } from '../context/RoleContext.jsx'

const OPTIONS = [
  { value: 'present', label: 'Present', active: 'bg-emerald-600 text-white' },
  { value: 'absent', label: 'Absent', active: 'bg-rose-600 text-white' },
  { value: 'late', label: 'Late', active: 'bg-amber-300 text-ink' },
  { value: 'excused', label: 'Excused', active: 'bg-sky-600 text-white' },
]

export default function Attendance() {
  const { session } = useRole()
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(toISODate())
  const [statuses, setStatuses] = useState({})
  const [saveState, setSaveState] = useState({ loading: false, message: '', error: '' })
  const sheet = useAsync(() => fetchAttendancePage(classId, date, session?.custom ? session.token : null), [classId, date, session?.token], ['classes', 'students', 'users', 'attendance'])
  const classes = sheet.data?.classes ?? []
  const roster = sheet.data?.roster ?? []

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classId, classes])

  useEffect(() => {
    if (!sheet.data) return
    setStatuses(Object.fromEntries(sheet.data.roster.map((student) => [student.id, student.status])))
    setSaveState({ loading: false, message: '', error: '' })
  }, [sheet.data])

  const counts = useMemo(() => roster.reduce(
    (result, student) => {
      const state = statuses[student.id]
      if (state && result[state] != null) result[state] += 1
      return result
    },
    { present: 0, absent: 0, late: 0, excused: 0 }
  ), [roster, statuses])

  const markAll = (status) => {
    setStatuses(Object.fromEntries(roster.map((student) => [student.id, status])))
    setSaveState({ loading: false, message: '', error: '' })
  }

  const submit = async () => {
    const unmarked = roster.filter((student) => !statuses[student.id])
    if (unmarked.length) {
      setSaveState({ loading: false, message: '', error: `Mark attendance for all ${unmarked.length} remaining students before saving.` })
      return
    }

    setSaveState({ loading: true, message: '', error: '' })
    try {
      await saveAttendance(roster.map((student) => ({
        student_id: student.id,
        attended_on: date,
        status: statuses[student.id],
      })), session?.custom ? session.token : null, classId, date)
      setSaveState({ loading: false, message: `Saved attendance for ${roster.length} students.`, error: '' })
      sheet.reload()
    } catch (error) {
      setSaveState({ loading: false, message: '', error: error.message })
    }
  }

  if (sheet.error) return <ManagementError error={sheet.error} onRetry={sheet.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Attendance" description="Choose a class and date, then mark the register." />
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <SelectField label="Class" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!classes.length}>
            {!classes.length && <option value="">No classes available</option>}
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
          </SelectField>
          <label className="block text-sm font-medium">Date
            <input type="date" value={date} max={toISODate()} onChange={(event) => event.target.value && setDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
          <button type="button" onClick={() => markAll('present')} disabled={!roster.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium hover:bg-lilac-50 disabled:opacity-50"><CheckCheck className="h-4 w-4" />Mark all present</button>
        </div>
      </GlassCard>
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Class register" description={`${roster.length} students`} />
          <div className="flex flex-wrap gap-2"><Badge tone="success" dot>{counts.present} present</Badge><Badge tone="danger" dot>{counts.absent} absent</Badge><Badge tone="warning" dot>{counts.late} late</Badge><Badge tone="info" dot>{counts.excused} excused</Badge></div>
        </div>
        {!sheet.data ? (
          <div className="mt-5 space-y-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16" />)}</div>
        ) : !roster.length ? (
          <p className="py-12 text-center text-sm text-ink/55">{classId ? 'No active students are assigned to this class.' : session?.custom ? 'No classes are assigned to you yet. Ask the administrator to select you as the Class teacher in the Classes page.' : 'Create a class to take attendance.'}</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink/5 rounded-2xl bg-white/50">
            {roster.map((student) => (
              <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div><p className="text-sm font-medium">{student.name}</p><p className="text-xs text-ink/50">Roll {student.rollNo ?? '–'} · {student.admissionNo}</p></div>
                <div className="inline-flex rounded-xl bg-ink/5 p-1" role="group" aria-label={`Attendance for ${student.name}`}>
                  {OPTIONS.map((option) => (
                    <button key={option.value} type="button" aria-pressed={statuses[student.id] === option.value} onClick={() => { setStatuses((current) => ({ ...current, [student.id]: option.value })); setSaveState({ loading: false, message: '', error: '' }) }} className={`rounded-lg px-3 py-2 text-xs font-medium ${statuses[student.id] === option.value ? option.active : 'text-ink/60 hover:text-ink'}`}>{option.label}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {saveState.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{saveState.error}</p>}
        {saveState.message && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{saveState.message}</p>}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={submit} disabled={!roster.length || saveState.loading || sheet.loading || !sheet.data} className="inline-flex h-11 items-center gap-2 rounded-full bg-night-900 px-5 text-sm font-medium text-white disabled:opacity-50">
            {saveState.loading && <Loader2 className="h-4 w-4 animate-spin" />}Save attendance
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
