import { GraduationCap } from 'lucide-react'

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

export default function LoadingScreen({ label = 'Preparing your workspace' }) {
  return (
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

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-[1400px] space-y-6 sm:px-3 lg:px-0">
          <div className="glass-strong overflow-hidden rounded-3xl p-5 sm:p-7">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-8 w-56 max-w-full rounded-lg sm:h-9 sm:w-72" />
            <Skeleton className="mt-3 h-3 w-64 max-w-full" />
            <Skeleton className="mt-6 h-10 w-32 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            <StatCard />
            <StatCard />
            <StatCard />
            <StatCard />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="glass rounded-3xl p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-36 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
              <div className="mt-6 flex h-40 items-end gap-3 sm:h-52 sm:gap-5">
                {[42, 68, 51, 82, 58, 93, 72, 48, 76, 62, 88, 55].map((height, index) => (
                  <Skeleton key={index} className="min-w-2 flex-1 rounded-t-lg rounded-b-sm" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
              <div className="mt-5 space-y-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3 w-28 max-w-full" />
                      <Skeleton className="mt-2 h-2.5 w-40 max-w-full" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    </main>
  )
}
