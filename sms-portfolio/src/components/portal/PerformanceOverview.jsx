import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Award, CalendarCheck, GraduationCap, Target, TrendingDown, TrendingUp } from 'lucide-react'
import StatCard from '../ui/StatCard.jsx'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState } from '../ui/States.jsx'
import { attendanceRate, gradeFor, subjectReport } from '../../lib/analytics.js'
import { pct } from '../../lib/format.js'

const BAR = {
  A: 'from-lilac-500 to-lilac-300',
  B: 'from-sky-500 to-sky-300',
  C: 'from-amber-400 to-amber-300',
  D: 'from-rose-500 to-rose-300',
}

export default function PerformanceOverview({ report, childName }) {
  const subjects = useMemo(() => subjectReport(report.marks), [report.marks])
  const rate = useMemo(() => attendanceRate(report.attendance), [report.attendance])

  const overall = subjects.length ? subjects.reduce((sum, s) => sum + s.average, 0) / subjects.length : null
  const strongest = subjects.length ? subjects.reduce((a, b) => (b.average > a.average ? b : a)) : null
  const weakest = subjects.length > 1 ? subjects.reduce((a, b) => (b.average < a.average ? b : a)) : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Award}
          label="Overall average"
          value={pct(overall)}
          hint={overall == null ? 'No exam results yet' : `Grade ${gradeFor(overall)} across ${subjects.length} subjects`}
          accent="from-lilac-500 to-fuchsia-400"
        />
        <StatCard icon={CalendarCheck} label="Attendance" value={pct(rate)} hint="Present or late, last 30 days" accent="from-lilac-500 to-emerald-300" />
        <StatCard
          icon={GraduationCap}
          label="Strongest subject"
          value={strongest?.subject ?? '–'}
          hint={strongest ? `${Math.round(strongest.average)}% average` : undefined}
          accent="from-lilac-500 to-sky-400"
        />
        <StatCard
          icon={Target}
          label="Needs attention"
          value={weakest?.subject ?? '–'}
          hint={weakest ? `${Math.round(weakest.average)}% average` : undefined}
          accent="from-lilac-500 to-orange-300"
        />
      </div>

      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Subject results" description={`Latest exam scores for ${childName}`} />
        {subjects.length === 0 ? (
          <EmptyState icon={Award} title="No results yet" hint="Marks appear here once teachers enter them." />
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s) => (
              <li key={s.subject} className="rounded-2xl bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{s.subject}</p>
                    <p className="mt-0.5 text-xs text-ink/50">{s.latestExam}</p>
                  </div>
                  <Badge tone="brand">Grade {s.grade}</Badge>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">{Math.round(s.latestPct)}%</p>
                  {s.delta != null && (
                    <Badge tone={s.delta >= 0 ? 'success' : 'danger'}>
                      {s.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {s.delta >= 0 ? '+' : ''}{Math.round(s.delta)} pts
                    </Badge>
                  )}
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${Math.round(s.latestPct)} percent`}>
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${BAR[s.grade]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, s.latestPct)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
