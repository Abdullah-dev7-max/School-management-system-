import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, GraduationCap, Users, Wallet } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchAdminOverview, fetchStudentDirectory } from '../../lib/api.js'
import { attendanceRate, dailyAttendance, feeState, groupBy, monthlyRevenue } from '../../lib/analytics.js'
import { pct, pkrCompact } from '../../lib/format.js'
import StatCard from '../../components/ui/StatCard.jsx'
import { ErrorState, Skeleton } from '../../components/ui/States.jsx'
import AttendanceChart from '../../components/admin/AttendanceChart.jsx'
import RevenueChart from '../../components/admin/RevenueChart.jsx'
import StudentTable from '../../components/admin/StudentTable.jsx'

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const cell = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }

function buildStudentRows(directory, fees, attendance) {
  const feesBy = groupBy(fees, 'student_id')
  const attBy = groupBy(attendance, 'student_id')

  return directory.map((s) => {
    const studentFees = feesBy[s.id] ?? []
    const states = studentFees.map((f) => feeState(f))
    return {
      id: s.id,
      name: s.student?.full_name ?? 'Unknown',
      email: s.student?.email ?? '',
      className: s.classes ? `${s.classes.name} ${s.classes.section}` : 'Unassigned',
      admissionNo: s.admission_no,
      guardian: s.guardian?.full_name ?? '–',
      attendance: attendanceRate(attBy[s.id] ?? []),
      feeState: states.includes('overdue') ? 'overdue' : states.some((x) => x !== 'paid') ? 'due' : 'clear',
      outstanding: studentFees.reduce((sum, f) => sum + Math.max(0, Number(f.amount) - Number(f.amount_paid)), 0),
    }
  })
}

function AdminContent({ overview, directory }) {
  const { fees, attendance, studentCount, teacherCount } = overview

  const collected = useMemo(() => fees.reduce((sum, f) => sum + Number(f.amount_paid), 0), [fees])
  const outstanding = useMemo(() => fees.reduce((sum, f) => sum + Math.max(0, Number(f.amount) - Number(f.amount_paid)), 0), [fees])
  const students = useMemo(() => buildStudentRows(directory, fees, attendance), [directory, fees, attendance])
  const daily = useMemo(() => dailyAttendance(attendance), [attendance])
  const revenue = useMemo(() => monthlyRevenue(fees), [fees])
  const rate = useMemo(() => attendanceRate(attendance), [attendance])

  return (
    <>
      <motion.div variants={grid} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div variants={cell}>
          <StatCard icon={Users} label="Total students" value={studentCount} hint="Enrolled this academic year" accent="from-lilac-500 to-lilac-300" />
        </motion.div>
        <motion.div variants={cell}>
          <StatCard icon={GraduationCap} label="Teachers" value={teacherCount} hint="Active teaching staff" accent="from-lilac-500 to-sky-400" />
        </motion.div>
        <motion.div variants={cell}>
          <StatCard icon={Wallet} label="Fees collected" value={pkrCompact(collected)} hint={`${pkrCompact(outstanding)} still outstanding`} accent="from-lilac-500 to-fuchsia-400" />
        </motion.div>
        <motion.div variants={cell}>
          <StatCard icon={CalendarCheck} label="Attendance rate" value={pct(rate)} hint="Present or late, last 14 days" accent="from-lilac-500 to-emerald-300" />
        </motion.div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3"><AttendanceChart data={daily} /></div>
        <div className="xl:col-span-2"><RevenueChart data={revenue} /></div>
      </div>

      <StudentTable students={students} />
    </>
  )
}

export default function AdminDashboard() {
  const overview = useAsync(fetchAdminOverview, [])
  const directory = useAsync(fetchStudentDirectory, [])

  const error = overview.error ?? directory.error
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          overview.reload()
          directory.reload()
        }}
      />
    )
  }

  if (!overview.data || !directory.data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-5">
          <Skeleton className="h-96 rounded-3xl xl:col-span-3" />
          <Skeleton className="h-96 rounded-3xl xl:col-span-2" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminContent overview={overview.data} directory={directory.data} />
    </div>
  )
}
