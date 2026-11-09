import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, ClipboardCheck, PenLine, School } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync.js'
import { useRole } from '../../context/RoleContext.jsx'
import { fetchTeacherContext } from '../../lib/api.js'
import Segmented from '../../components/ui/Segmented.jsx'
import Badge from '../../components/ui/Badge.jsx'
import GlassCard from '../../components/ui/GlassCard.jsx'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx'
import AttendanceMarker from '../../components/teacher/AttendanceMarker.jsx'
import TimetableBoard from '../../components/teacher/TimetableBoard.jsx'
import MarksEntryForm from '../../components/teacher/MarksEntryForm.jsx'

const TABS = [
  { value: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { value: 'timetable', label: 'Timetable', icon: CalendarClock },
  { value: 'marks', label: 'Marks entry', icon: PenLine },
]

export default function TeacherPortal() {
  const { profile } = useRole()
  const ctx = useAsync(() => fetchTeacherContext(profile.email), [profile.email])
  const [tab, setTab] = useState('attendance')
  const [chosenClass, setChosenClass] = useState(null)

  if (ctx.error) return <ErrorState error={ctx.error} onRetry={ctx.reload} />
  if (!ctx.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  const teacher = ctx.data
  const active = teacher.classes.find((c) => c.id === chosenClass) ?? teacher.classes[0]
  const needsClass = tab !== 'timetable'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Teacher tools" layoutId="teacher-tab" options={TABS} value={tab} onChange={setTab} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{teacher.subject}</Badge>
          {teacher.classes.length > 1 ? (
            <Segmented
              size="sm"
              label="Choose class"
              layoutId="teacher-class"
              options={teacher.classes.map((c) => ({ value: c.id, label: c.label }))}
              value={active?.id}
              onChange={setChosenClass}
            />
          ) : (
            active && <Badge tone="neutral"><School className="h-3.5 w-3.5" />{active.label}</Badge>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {needsClass && !active ? (
            <GlassCard>
              <EmptyState icon={School} title="No class assigned" hint="Ask an administrator to make you a class teacher." />
            </GlassCard>
          ) : tab === 'attendance' ? (
            <AttendanceMarker key={active.id} classId={active.id} classLabel={active.label} teacherId={teacher.teacherId} />
          ) : tab === 'timetable' ? (
            <TimetableBoard teacherId={teacher.teacherId} />
          ) : (
            <MarksEntryForm key={active.id} classId={active.id} classLabel={active.label} teacher={teacher} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
