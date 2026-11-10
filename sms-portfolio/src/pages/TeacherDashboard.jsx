import { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Award, CalendarCheck, ClipboardList, FileText, GraduationCap, Megaphone, School } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { fetchRoleDashboard } from '../lib/api.js'
import { formatTime } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ManagementError } from '../components/admin/ManagementUi.jsx'
import { Skeleton } from '../components/ui/States.jsx'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TeacherDashboard() {
  const { profile, session } = useRole()
  const navigate = useNavigate()
  const hasRoleSession = Boolean(window.localStorage.getItem('scholara.role.session') && session?.token)
  const dashboard = useAsync(
    () => fetchRoleDashboard(profile, session?.token),
    [profile.id, profile.role, session?.token]
  )
  const classes = dashboard.data?.classes ?? []
  const students = dashboard.data?.students ?? []
  const attendance = dashboard.data?.attendance ?? []
  const present = attendance.filter((record) => record.status === 'present' || record.status === 'late').length
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : null

  useEffect(() => {
    if (dashboard.error?.status === 401 || dashboard.error?.status === 403) {
      window.localStorage.removeItem('scholara.role.session')
      navigate('/login', { replace: true })
    }
  }, [dashboard.error, navigate])

  if (!hasRoleSession) return <Navigate to="/login" replace />
  if (dashboard.error) return <ManagementError error={dashboard.error} onRetry={dashboard.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title={`Welcome, ${profile.full_name}`} description={`${dashboard.data?.teacher?.subject ?? 'Faculty'} · Teacher dashboard`} />
      </GlassCard>
      {!dashboard.data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-3xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={School} label="Assigned classes" value={classes.length} hint={dashboard.data.teacher?.subject || 'Teaching department'} />
            <StatCard icon={GraduationCap} label="Students" value={students.length} hint="Active students in your classes" accent="from-emerald-500 to-emerald-300" />
            <StatCard icon={CalendarCheck} label="Recent attendance" value={attendanceRate == null ? '—' : `${attendanceRate}%`} hint={`${attendance.length} recent records`} accent="from-sky-500 to-sky-300" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <GlassCard className="p-5 sm:p-6">
              <SectionHeader title="Assigned classes" description="Classes linked to you by the administrator" />
              <ul className="mt-4 divide-y divide-ink/5">
                {classes.map((classItem) => (
                  <li key={classItem.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-medium">{classItem.name} {classItem.section}</span>
                    <Badge tone="brand">{students.filter((student) => student.class_id === classItem.id).length} students</Badge>
                  </li>
                ))}
                {!classes.length && <li className="py-8 text-center text-sm text-ink/55">No classes are assigned yet. Ask the administrator to open Classes, edit each class, and select you as its Class teacher.</li>}
              </ul>
            </GlassCard>

            <GlassCard className="p-5 sm:p-6">
              <SectionHeader title="Teaching schedule" description="Your scheduled classes and periods" />
              <ul className="mt-4 divide-y divide-ink/5">
                {(dashboard.data.timetable ?? []).map((slot) => (
                  <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-medium">{WEEKDAYS[slot.day_of_week - 1] ?? 'Class'} · Period {slot.period}</span>
                      <span className="block text-xs text-ink/55">{slot.subject} · {slot.className}{slot.room ? ` · Room ${slot.room}` : ''}</span>
                    </span>
                    <span className="text-xs text-ink/60">{formatTime(slot.starts_at)}–{formatTime(slot.ends_at)}</span>
                  </li>
                ))}
                {!dashboard.data.timetable?.length && <li className="py-8 text-center text-sm text-ink/55">No teaching schedule has been added.</li>}
              </ul>
            </GlassCard>
          </div>

          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title="Faculty tools" description="Take attendance, record exam marks, and share learning notes with your classes." />
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/teacher-dashboard/attendance" className="inline-flex h-11 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white">
                  <ClipboardList className="h-4 w-4" />Take attendance
                </Link>
                <Link to="/teacher-dashboard/marks" className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-sm font-medium hover:bg-lilac-50">
                  <Award className="h-4 w-4" />Enter exam marks
                </Link>
                <Link to="/teacher-dashboard/notes" className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-sm font-medium hover:bg-lilac-50">
                  <FileText className="h-4 w-4" />Share class notes
                </Link>
                <Link to="/teacher-dashboard/announcements" className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-sm font-medium hover:bg-lilac-50">
                  <Megaphone className="h-4 w-4" />Announce tests and work
                </Link>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
