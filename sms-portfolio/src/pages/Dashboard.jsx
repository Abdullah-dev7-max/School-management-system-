import { AnimatePresence, motion } from 'framer-motion'
import AdminDashboard from './admin/AdminDashboard.jsx'

/** Administrator dashboard. */
export default function Dashboard() {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key="admin"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <AdminDashboard />
      </motion.div>
    </AnimatePresence>
  )
}
