import { GraduationCap } from 'lucide-react'
import GlassCard from '../../components/ui/GlassCard.jsx'
import { EmptyState } from '../../components/ui/States.jsx'

export default function TeacherPortal() {
  return (
    <GlassCard>
      <EmptyState
        icon={GraduationCap}
        title="Teacher sign-in required"
        hint="Connect an authenticated teacher account to view classes, attendance, and marks. Demo teacher accounts have been removed."
      />
    </GlassCard>
  )
}
