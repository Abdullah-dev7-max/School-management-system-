import { GraduationCap } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

function Skeleton({ className = '', dark = false }) {
  return <div className={`skeleton-shimmer${dark ? ' skeleton-shimmer-dark' : ''} rounded-xl ${className}`} />
}

function StatCard() {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-20 rounded-lg" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

function Panel({ children, className = '' }) {
  return <div className={`glass rounded-3xl p-4 sm:p-6 ${className}`}>{children}</div>
}

function PageHeading({ action = false }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        </div>
        {action && <Skeleton className="h-10 w-32 rounded-xl" />}
      </div>
    </Panel>
  )
}

function Filters({ count = 2 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  )
}

function TablePanel({ columns = 5, rows = 6, toolbar = false }) {
  return (
    <Panel className="overflow-hidden p-0">
      {toolbar && (
        <div className="flex flex-wrap gap-3 p-4 sm:p-5">
          <Skeleton className="h-11 min-w-48 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-4 w-24 self-center" />
        </div>
      )}
      <div className="overflow-hidden border-t border-white/70">
        <div className="flex gap-5 bg-white/40 px-5 py-3">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className={`h-3 ${index === 0 ? 'w-32' : 'hidden w-24 sm:block'} shrink-0`} />
          ))}
        </div>
        <div className="divide-y divide-ink/5">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex items-center gap-5 px-5 py-4">
              {Array.from({ length: columns }, (_, column) => (
                <Skeleton key={column} className={`h-3 ${column === 0 ? 'w-36' : 'hidden w-24 sm:block'} shrink-0`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function ListPanel({ rows = 4 }) {
  return (
    <Panel>
      <Skeleton className="h-5 w-40 rounded-lg" />
      <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      <div className="mt-5 divide-y divide-ink/5 border-t border-white/70">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-40 max-w-full" />
              <Skeleton className="mt-2 h-2.5 w-60 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </Panel>
  )
}

function FormPanel({ fields = 4 }) {
  return (
    <Panel>
      <Skeleton className="h-5 w-44 rounded-lg" />
      <Skeleton className="mt-2 h-3 w-60 max-w-full" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className={index === fields - 1 && fields % 2 ? 'sm:col-span-2' : ''}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </Panel>
  )
}

function ClassCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Panel key={index}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-36 rounded-lg" />
          <Skeleton className="mt-4 h-6 w-24 rounded-lg" />
          <div className="mt-5 space-y-3 border-t border-ink/5 pt-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </Panel>
      ))}
    </div>
  )
}

function DashboardContent({ variant }) {
  if (variant === 'teacher-dashboard') {
    return (
      <div className="space-y-5">
        <PageHeading />
        <div className="grid gap-4 sm:grid-cols-3"><StatCard /><StatCard /><StatCard /></div>
        <div className="grid gap-5 xl:grid-cols-2"><ListPanel /><ListPanel /></div>
        <Panel><Skeleton className="h-5 w-36 rounded-lg" /><Skeleton className="mt-2 h-3 w-64 max-w-full" /><div className="mt-5 flex flex-wrap gap-2"><Skeleton className="h-11 w-36 rounded-xl" /><Skeleton className="h-11 w-36 rounded-xl" /><Skeleton className="h-11 w-36 rounded-xl" /></div></Panel>
      </div>
    )
  }

  if (variant === 'student-dashboard') {
    return <div className="space-y-5"><PageHeading /><div className="grid gap-4 sm:grid-cols-3"><StatCard /><StatCard /><StatCard /></div></div>
  }

  return (
    <div className="space-y-6">
      <Panel>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-8 w-56 max-w-full rounded-lg sm:h-9 sm:w-72" />
        <Skeleton className="mt-3 h-3 w-64 max-w-full" />
        <Skeleton className="mt-6 h-10 w-32 rounded-xl" />
      </Panel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4"><StatCard /><StatCard /><StatCard /><StatCard /></div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between gap-4"><Skeleton className="h-5 w-36 rounded-lg" /><Skeleton className="h-9 w-24 rounded-xl" /></div>
          <div className="mt-6 flex h-40 items-end gap-3 sm:h-52 sm:gap-5">{[42, 68, 51, 82, 58, 93, 72, 48, 76, 62, 88, 55].map((height, index) => <Skeleton key={index} className="min-w-2 flex-1 rounded-t-lg rounded-b-sm" style={{ height: `${height}%` }} />)}</div>
        </Panel>
        <ListPanel />
      </div>
      <TablePanel columns={6} rows={4} />
    </div>
  )
}

function PageContent({ variant }) {
  if (variant.endsWith('-dashboard')) return <DashboardContent variant={variant} />

  if (variant === 'students' || variant === 'teachers') {
    return <div className="space-y-5"><PageHeading action /><TablePanel columns={variant === 'students' ? 7 : 6} rows={7} toolbar /></div>
  }
  if (variant === 'classes') return <div className="space-y-5"><PageHeading action /><ClassCards /></div>
  if (variant === 'settings') return <div className="space-y-5"><PageHeading /><FormPanel fields={5} /></div>
  if (variant === 'timetable') {
    return <div className="space-y-5"><PageHeading action />{Array.from({ length: 3 }, (_, index) => <ListPanel key={index} rows={3} />)}</div>
  }
  if (variant === 'attendance-overview') {
    return (
      <div className="space-y-5">
        <PageHeading action />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard /><StatCard /><StatCard /><StatCard /></div>
        <TablePanel columns={6} rows={7} />
      </div>
    )
  }
  if (variant === 'attendance-register') {
    return (
      <div className="space-y-5">
        <PageHeading />
        <Panel><Filters count={3} /></Panel>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
          </div>
          <div className="mt-5 divide-y divide-ink/5">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-4 py-4">
                <div><Skeleton className="h-3 w-36" /><Skeleton className="mt-2 h-2.5 w-28" /></div>
                <Skeleton className="h-9 w-44 max-w-[48%] rounded-xl" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    )
  }
  if (variant === 'marks') {
    return <div className="space-y-5"><PageHeading /><Panel><Filters count={5} /></Panel><TablePanel columns={5} rows={7} /></div>
  }
  if (variant === 'fees') {
    return (
      <div className="space-y-5">
        <PageHeading action />
        <div className="grid gap-4 sm:grid-cols-3"><StatCard /><StatCard /><StatCard /></div>
        <Panel>
          <Skeleton className="h-5 w-52 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          <div className="mt-5"><Filters count={3} /></div>
        </Panel>
        <Panel>
          <div className="flex gap-4 border-b border-ink/5 pb-4">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </Panel>
        <TablePanel columns={7} rows={6} toolbar />
      </div>
    )
  }
  if (variant === 'notes') {
    return <div className="space-y-5"><PageHeading /><FormPanel fields={4} /><ListPanel rows={5} /></div>
  }
  if (variant === 'announcements') {
    return <div className="space-y-5"><PageHeading /><FormPanel fields={4} /><ListPanel rows={4} /></div>
  }
  if (variant.startsWith('student-')) {
    return (
      <div className="space-y-5">
        <PageHeading />
        {variant === 'student-fees' && <><ListPanel rows={5} /><ListPanel rows={4} /></>}
        {variant === 'student-marks' && <TablePanel columns={5} rows={7} />}
        {variant === 'student-attendance' && <ListPanel rows={8} />}
        {variant === 'student-timetable' && <ListPanel rows={6} />}
        {variant === 'student-announcements' && <ListPanel rows={4} />}
        {variant === 'student-notes' && <ListPanel rows={5} />}
      </div>
    )
  }

  if (variant === 'session') return <Panel className="mx-auto mt-12 max-w-lg"><Skeleton className="h-6 w-48 rounded-lg" /><Skeleton className="mt-3 h-3 w-64 max-w-full" /><Skeleton className="mt-8 h-2 w-full rounded-full" /></Panel>
  return <DashboardContent variant="dashboard" />
}

function getVariant(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/teacher-dashboard' || path === '/teacher') return 'teacher-dashboard'
  if (path.startsWith('/teacher-dashboard/') || path.startsWith('/teacher/')) {
    const section = path.split('/').at(-1)
    if (section === 'attendance') return 'attendance-register'
    if (section === 'marks') return 'marks'
    if (section === 'notes') return 'notes'
    if (section === 'announcements') return 'announcements'
  }
  if (path === '/student-dashboard' || path === '/student') return 'student-dashboard'
  if (path.startsWith('/student-dashboard/') || path.startsWith('/student/')) {
    return `student-${path.split('/').at(-1)}`
  }
  if (path === '/students') return 'students'
  if (path === '/teachers') return 'teachers'
  if (path === '/classes') return 'classes'
  if (path === '/timetable') return 'timetable'
  if (path === '/attendance') return 'attendance-overview'
  if (path === '/marks') return 'marks'
  if (path === '/fees') return 'fees'
  if (path === '/settings') return 'settings'
  return 'dashboard'
}

export default function LoadingScreen({ label = 'Preparing your workspace' }) {
  const { pathname } = useLocation()
  const variant = getVariant(pathname)

  return createPortal((
    <main
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-[100] flex min-h-screen overflow-hidden bg-canvas text-ink"
    >
      <span className="sr-only">{label}</span>

      <aside aria-hidden="true" className="sidebar-surface hidden w-[252px] shrink-0 flex-col px-5 py-6 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-lilac-400 to-lilac-600 text-white shadow-glow">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Scholara</p>
            <p className="mt-1 text-[11px] text-white/45">School management</p>
          </div>
        </div>
        <div className="mt-12 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={`flex h-11 items-center gap-3 rounded-xl px-3 ${index === 0 ? 'bg-white/10' : ''}`}>
              <Skeleton dark className="h-4 w-4 rounded-md" />
              <Skeleton dark className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <Skeleton dark className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton dark className="h-3 w-24" />
            <Skeleton dark className="mt-2 h-2.5 w-32" />
          </div>
        </div>
      </aside>

      <section aria-hidden="true" className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-lilac-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-pink-200/35 blur-3xl" />

        <header className="relative flex h-[72px] items-center justify-between border-b border-ink/5 bg-white/35 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-lilac-400 to-lilac-600 text-white shadow-glow lg:hidden">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="hidden sm:block">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-2.5 w-36" />
            </div>
            <div className="sm:hidden">
              <p className="text-sm font-semibold">Scholara</p>
              <p className="mt-0.5 text-[11px] text-ink/45">Getting things ready</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-9 w-36 rounded-xl sm:block" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7 lg:px-9">
          <div className="mx-auto max-w-[1400px]">
            <PageContent variant={variant} />
          </div>
        </div>
      </section>
    </main>
  ), document.body)
}
