import { useMemo, useState } from 'react'
import { ClipboardCheck, Clock3, SearchCheck, Users } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchAdminAttendanceOverview } from '../../lib/api.js'
import { toISODate } from '../../lib/format.js'
import GlassCard from '../../components/ui/GlassCard.jsx'
import SectionHeader from '../../components/ui/SectionHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { ErrorState, Skeleton } from '../../components/ui/States.jsx'

function percentage(count, total) {
  return total ? `${Math.round((count / total) * 100)}%` : '0%'
}

function attendanceCounts(students) {
  return students.reduce((counts, student) => {
    if (student.status === 'present' || student.status === 'late') counts.present += 1
    else if (student.status === 'absent') counts.absent += 1
    else if (student.status === 'excused') counts.leave += 1
    return counts
  }, { present: 0, absent: 0, leave: 0 })
}

function StatusPill({ status }) {
  const styles = {
    present: 'bg-emerald-50 text-emerald-700',
    late: 'bg-amber-50 text-amber-800',
    absent: 'bg-rose-50 text-rose-700',
    excused: 'bg-sky-50 text-sky-700',
    pending: 'bg-ink/5 text-ink/55',
  }
  const labels = { present: 'Present', late: 'Late', absent: 'Absent', excused: 'On leave', pending: 'Not marked' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>
}

function DetailDialog({ classItem, onClose }) {
  if (!classItem) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close class attendance details" onClick={onClose} className="fixed inset-0 bg-night-950/60 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="attendance-detail-title" className="glass-strong relative z-10 my-auto max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="attendance-detail-title" className="text-lg font-semibold">{classItem.name} {classItem.section}</h2>
            <p className="mt-1 text-sm text-ink/55">Read-only student attendance details</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-ink/5">Close</button>
        </div>
        <div className="mt-5 max-h-[65vh] overflow-auto rounded-2xl bg-white/60">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-ink/50">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Roll no.</th><th className="px-4 py-3">Admission no.</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {classItem.students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3">{student.rollNo ?? '–'}</td>
                  <td className="px-4 py-3">{student.admissionNo}</td>
                  <td className="px-4 py-3"><StatusPill status={student.status ?? 'pending'} /></td>
                </tr>
              ))}
              {!classItem.students.length && <tr><td colSpan="4" className="px-4 py-8 text-center text-ink/55">No active students are assigned to this class.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default function AttendanceOverview() {
  const [date, setDate] = useState(toISODate())
  const [selectedClassId, setSelectedClassId] = useState(null)
  const report = useAsync(() => fetchAdminAttendanceOverview(date), [date], ['classes', 'students', 'users', 'attendance'])
  const data = report.data
  const selectedClass = data?.classes.find((item) => item.id === selectedClassId) ?? null
  const totals = useMemo(() => attendanceCounts(data?.students ?? []), [data])

  if (report.error) return <ErrorState error={report.error} onRetry={report.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader title="Attendance overview" description="Daily attendance reports are read-only for administrators." />
          <label className="block min-w-48 text-sm font-medium">Report date
            <input type="date" value={date} max={toISODate()} onChange={(event) => event.target.value && setDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
        </div>
      </GlassCard>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-3xl" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Total students" value={data.totalStudents} hint="Active student records" accent="from-lilac-500 to-lilac-300" />
            <StatCard icon={ClipboardCheck} label="Present" value={`${totals.present} · ${percentage(totals.present, data.totalStudents)}`} hint="Includes students marked late" accent="from-emerald-500 to-emerald-300" />
            <StatCard icon={SearchCheck} label="Absent" value={`${totals.absent} · ${percentage(totals.absent, data.totalStudents)}`} hint="For the selected date" accent="from-rose-500 to-rose-300" />
            <StatCard icon={Clock3} label="On leave" value={`${totals.leave} · ${percentage(totals.leave, data.totalStudents)}`} hint="Marked as excused" accent="from-sky-500 to-sky-300" />
          </div>

          <GlassCard className="p-5 sm:p-6">
            <SectionHeader title="Class-wise attendance" description={`${data.classes.length} classes · ${data.totalStudents} active students`} />
            <div className="mt-5 overflow-x-auto rounded-2xl bg-white/55">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-ink/5 text-xs uppercase tracking-wide text-ink/50">
                  <tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">On leave</th><th className="px-4 py-3">Attendance status</th></tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {data.classes.map((classItem) => {
                    const counts = attendanceCounts(classItem.students)
                    const marked = classItem.students.filter((student) => student.status).length
                    const completion = classItem.students.length === 0 || marked === 0 ? 'Pending' : marked === classItem.students.length ? 'Marked' : 'In progress'
                    return (
                      <tr key={classItem.id}>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedClassId(classItem.id)} className="font-semibold text-lilac-700 underline-offset-2 hover:underline">{classItem.name} {classItem.section}</button>
                          <p className="mt-0.5 text-xs text-ink/50">{classItem.teacherName ? `Teacher: ${classItem.teacherName}` : 'No class teacher assigned'}</p>
                        </td>
                        <td className="px-4 py-3">{classItem.students.length}</td>
                        <td className="px-4 py-3">{counts.present} <span className="text-ink/45">({percentage(counts.present, classItem.students.length)})</span></td>
                        <td className="px-4 py-3">{counts.absent} <span className="text-ink/45">({percentage(counts.absent, classItem.students.length)})</span></td>
                        <td className="px-4 py-3">{counts.leave} <span className="text-ink/45">({percentage(counts.leave, classItem.students.length)})</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${completion === 'Marked' ? 'bg-emerald-50 text-emerald-700' : completion === 'Pending' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-700'}`}>{completion}{completion === 'Marked' && classItem.teacherName ? ` by ${classItem.teacherName}` : ''}</span></td>
                      </tr>
                    )
                  })}
                  {!data.classes.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-ink/55">No classes available.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
      <DetailDialog classItem={selectedClass} onClose={() => setSelectedClassId(null)} />
    </div>
  )
}
