import { LoaderCircle, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRole } from '../../context/RoleContext.jsx'

const iconButton =
  'grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink/70 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac-500/60'

export default function Header({ collapsed, onToggleSidebar, onOpenMobile }) {
  const { nav, profile, signOut } = useRole()
  const { pathname } = useLocation()
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const title = nav
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Dashboard'

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    setError('')
    try {
      await signOut()
    } catch (signOutError) {
      setError(signOutError.message)
      setSigningOut(false)
    }
  }

  return (
    <header className="glass relative z-20 flex h-[72px] shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 sm:px-6 lg:px-8">
      {/* Mobile: open drawer */}
      <button type="button" onClick={onOpenMobile} aria-label="Open navigation" className={`${iconButton} glass lg:hidden`}>
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop: collapse / expand rail */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        className={`${iconButton} glass hidden lg:grid`}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
        <span className="hidden max-w-48 truncate text-sm font-medium sm:block">{profile.full_name}</span>
        <button
          type="button"
          aria-label={signingOut ? 'Signing out' : 'Sign out'}
          aria-busy={signingOut}
          title={signingOut ? 'Signing out…' : 'Sign out'}
          onClick={handleSignOut}
          disabled={signingOut}
          className={`${iconButton} glass disabled:cursor-wait disabled:opacity-70`}
        >
          {signingOut ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
        </button>
      </div>
      {error && <span role="alert" className="absolute right-4 top-full mt-1 rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</span>}
    </header>
  )
}
