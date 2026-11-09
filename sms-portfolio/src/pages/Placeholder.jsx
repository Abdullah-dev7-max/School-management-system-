import { useLocation } from 'react-router-dom'
import { useRole } from '../context/RoleContext.jsx'

/** Temporary page body so every sidebar link resolves while the shell is reviewed. */
export default function Placeholder() {
  const { nav, roles, role } = useRole()
  const { pathname } = useLocation()
  const label = nav.find((item) => item.to === pathname)?.label ?? 'Dashboard'

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <h3 className="text-lg font-semibold tracking-tight">{label}</h3>
        <p className="mt-1 max-w-lg text-sm text-ink/60">
          This page is not built yet. You are viewing it as {roles[role].label.toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-36 rounded-3xl p-5">
            <div className="h-3 w-24 rounded-full bg-lilac-200/70" />
            <div className="mt-4 h-8 w-32 rounded-xl bg-lilac-100" />
            <div className="mt-4 h-3 w-40 rounded-full bg-lilac-100/80" />
          </div>
        ))}
      </div>
    </div>
  )
}
