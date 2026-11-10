import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CalendarCheck, GraduationCap, School, Wallet } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { fetchRoleDashboard } from '../lib/api.js'
import { formatDate, pkr } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ManagementError } from '../components/admin/ManagementUi.jsx'
import { Skeleton } from '../components/ui/States.jsx'

function RecordList({ title, children, empty }) {
  return (
    <GlassCard className="p-5">
      <SectionHeader title={title} />
      {children.length ? <ul className="mt-4 divide-y divide-ink/5">{children}</ul> : <p className="py-8 text-center text-sm text-ink/55">{empty}</p>}
    </GlassCard>
  )
}

function TeacherDashboard({ data }) {
  const classNames = Object.fromEntries(data.classes.map((item) => [item.id, `${item.name} ${item.section}`]))
  const present = data.attendance.filter((row) => row.status === 'present' || row.status === 'late').length
  const attendanceRate = data.attendance.length ? Math.round((present / data.attendance.length) * 100) : null

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={School} label="Assigned classes" value={data.classes.length} hint={data.teacher.subject} />
        <StatCard icon={GraduationCap} label="Students" value={data.students.length} hint="Active students in your classes" />
        <StatCard icon={CalendarCheck} label="Recent attendance" value={attendanceRate == null ? '–' : `${attendanceRate}%`} hint={`${data.attendance.length} recent records`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <RecordList title="Class roster" empty="No classes or students are assigned to your account.">
          {data.students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium">{student.student?.full_name ?? 'Student'} <span className="font-normal text-ink/50">· {student.admission_no}</span></span>
              <Badge tone="brand">{classNames[student.class_id] ?? 'Class'}</Badge>
            </li>
          ))}
        </RecordList>
        <RecordList title="Recent marks" empty="No examination marks are available.">
          {data.marks.map((mark, index) => (
            <li key={`${mark.student_id}-${mark.subject}-${mark.exam}-${index}`} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium">{mark.subject} <span className="font-normal text-ink/50">· {mark.exam}</span></span>
              <span>{mark.score} / {mark.max_score}</span>
            </li>
          ))}
        </RecordList>
      </div>
    </>
  )
}

function FamilyDashboard({ data }) {
  const namesById = Object.fromEntries(data.students.map((student) => [student.id, student.student?.full_name ?? 'Student']))
  const outstanding = useMemo(
    () => data.fees.reduce((total, fee) => total + Math.max(0, Number(fee.amount) - Number(fee.amount_paid)), 0),
    [data.fees]
  )
  const present = data.attendance.filter((row) => row.status === 'present' || row.status === 'late').length
  const attendanceRate = data.attendance.length ? Math.round((present / data.attendance.length) * 100) : null
  const latestMarks = data.marks.slice(0, 10)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={GraduationCap} label={data.role === 'parent' ? 'Linked students' : 'Your class'} value={data.role === 'parent' ? data.students.length : data.students[0]?.classes ? `${data.students[0].classes.name} ${data.students[0].classes.section}` : 'Unassigned'} hint="From institute records" />
        <StatCard icon={Wallet} label="Outstanding fees" value={pkr(outstanding)} hint="Across linked student accounts" />
        <StatCard icon={CalendarCheck} label="Recent attendance" value={attendanceRate == null ? '–' : `${attendanceRate}%`} hint={`${data.attendance.length} recent records`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <RecordList title="Student records" empty="No student records are linked to this account.">
          {data.students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium">{student.student?.full_name ?? 'Student'} <span className="font-normal text-ink/50">· {student.admission_no}</span></span>
              <Badge tone="brand">{student.classes ? `${student.classes.name} ${student.classes.section}` : 'Unassigned'}</Badge>
            </li>
          ))}
        </RecordList>
        <RecordList title="Recent examination marks" empty="No examination marks are available.">
          {latestMarks.map((mark, index) => (
            <li key={`${mark.student_id}-${mark.subject}-${mark.exam}-${index}`} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium">{namesById[mark.student_id]} · {mark.subject} <span className="font-normal text-ink/50">{mark.exam}</span></span>
              <span>{mark.score} / {mark.max_score}</span>
            </li>
          ))}
        </RecordList>
      </div>
      <RecordList title="Fee vouchers" empty="No fee vouchers are available.">
        {data.fees.map((fee) => (
          <li key={fee.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="font-medium">{namesById[fee.student_id]} · {fee.title} <span className="font-normal text-ink/50">· due {formatDate(fee.due_date)}</span></span>
            <span>{pkr(Number(fee.amount) - Number(fee.amount_paid))} due</span>
          </li>
        ))}
      </RecordList>
    </>
  )
}

export default function RoleDashboard() {
  const { profile, roles, session } = useRole()
  const navigate = useNavigate()
  const roleSession = window.localStorage.getItem('scholara.role.session')
  const dashboard = useAsync(() => fetchRoleDashboard(profile, session?.token), [profile.id, profile.role, session?.token])
  const role = roles[profile.role]

  useEffect(() => {
    if (dashboard.error?.status === 401 || dashboard.error?.status === 403) {
      window.localStorage.removeItem('scholara.role.session')
      navigate('/login', { replace: true })
    }
  }, [dashboard.error, navigate])

  if ((profile.role === 'teacher' || profile.role === 'student') && (!roleSession || !session?.token)) {
    return <Navigate to="/login" replace />
  }
  if (dashboard.error) return <ManagementError error={dashboard.error} onRetry={dashboard.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title={`${role.label} dashboard`} description={`Welcome, ${profile.full_name}. These records are read-only and limited to your account.`} />
      </GlassCard>
      {!dashboard.data ? (
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div>
      ) : dashboard.data.role === 'teacher' ? (
        <TeacherDashboard data={dashboard.data} />
      ) : (
        <FamilyDashboard data={dashboard.data} />
      )}
    </div>
  )
}
