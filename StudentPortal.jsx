import { useState } from 'react'
import { Baby } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync.js'
import { useRole } from '../../context/RoleContext.jsx'
import { fetchFees, fetchNotices, fetchPortalContext, fetchStudentReport } from '../../services/supabaseService.js'
import Segmented from '../../components/ui/Segmented.jsx'
import GlassCard from '../../components/ui/GlassCard.jsx'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx'
import PerformanceOverview from '../../components/portal/PerformanceOverview.jsx'
import FeeChallans from '../../components/portal/FeeChallans.jsx'
import { NoticeList, NoticeTicker } from '../../components/portal/Notices.jsx'

function ChildReport({ child, notices }) {
  const report = useAsync(() => fetchStudentReport(child.id), [child.id])
  const fees = useAsync(() => fetchFees(child.id), [child.id])

  const error = report.error ?? fees.error
  if (error) {
    return <ErrorState error={error} onRetry={() => { report.reload(); fees.reload() }} />
  }

  if (!report.data || !fees.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PerformanceOverview report={report.data} childName={child.name} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><FeeChallans fees={fees.data} /></div>
        <NoticeList notices={notices.data} loading={notices.loading} />
      </div>
    </div>
  )
}

/** Shared by the Student and Parent roles. A parent can switch between children. */
export default function StudentPortal() {
  const { role, profile } = useRole()
  const ctx = useAsync(() => fetchPortalContext(role, profile.email), [role, profile.email])
  const notices = useAsync(() => fetchNotices(role), [role])
  const [childId, setChildId] = useState(null)

  if (ctx.error) return <ErrorState error={ctx.error} onRetry={ctx.reload} />
  if (!ctx.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-12 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  const { children } = ctx.data
  const active = children.find((c) => c.id === childId) ?? children[0]

  return (
    <div className="space-y-6">
      <NoticeTicker notices={notices.data} loading={notices.loading} />

      {!active ? (
        <GlassCard>
          <EmptyState icon={Baby} title="No student linked" hint="Ask the school office to link a student to this account." />
        </GlassCard>
      ) : (
        <>
          {children.length > 1 && (
            <Segmented
              label="Choose child"
              layoutId="child-pill"
              options={children.map((c) => ({ value: c.id, label: `${c.name.split(' ')[0]}, ${c.className}` }))}
              value={active.id}
              onChange={setChildId}
            />
          )}
          <ChildReport key={active.id} child={active} notices={notices} />
        </>
      )}
    </div>
  )
}
