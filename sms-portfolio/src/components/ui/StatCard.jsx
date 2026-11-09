import GlassCard from './GlassCard.jsx'

export default function StatCard({ icon: Icon, label, value, hint, accent = 'from-lilac-500 to-lilac-300' }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink/60">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${accent}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-ink/55">{hint}</p>}
    </GlassCard>
  )
}
