export default function SectionHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink/55">{description}</p>}
      </div>
      {action}
    </div>
  )
}
