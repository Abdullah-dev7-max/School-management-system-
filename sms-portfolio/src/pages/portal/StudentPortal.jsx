import { Baby } from 'lucide-react'
import { useRole } from '../../context/RoleContext.jsx'
import GlassCard from '../../components/ui/GlassCard.jsx'
import { EmptyState } from '../../components/ui/States.jsx'

export default function StudentPortal() {
  const { role } = useRole()
  const audience = role === 'parent' ? 'parent' : 'student'

  return (
    <GlassCard>
      <EmptyState
        icon={Baby}
        title={`${audience[0].toUpperCase()}${audience.slice(1)} sign-in required`}
        hint={`Connect an authenticated ${audience} account to view personal progress, attendance, and fees. Demo ${audience} accounts have been removed.`}
      />
    </GlassCard>
  )
}
