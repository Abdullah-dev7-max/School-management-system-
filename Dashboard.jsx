import { AnimatePresence, motion } from 'framer-motion'
import { useRole } from '../context/RoleContext.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import TeacherPortal from './teacher/TeacherPortal.jsx'
import StudentPortal from './portal/StudentPortal.jsx'

const VIEWS = {
  admin: AdminDashboard,
  teacher: TeacherPortal,
  student: StudentPortal,
  parent: StudentPortal,
}

/** Picks the view for the active role and cross-fades when the role switcher changes it. */
export default function Dashboard() {
  const { role } = useRole()
  const View = VIEWS[role]

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={role}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <View />
      </motion.div>
    </AnimatePresence>
  )
}
