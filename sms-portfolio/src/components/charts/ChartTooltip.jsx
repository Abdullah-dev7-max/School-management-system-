export default function ChartTooltip({ active, payload, label, formatter = (v) => v }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-1 flex items-center gap-2 text-ink/70">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill ?? p.stroke }} />
          {p.name}: <span className="font-medium text-ink">{formatter(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
