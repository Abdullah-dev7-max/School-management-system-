import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useRole } from '../../context/RoleContext.jsx'
import RoleSwitcher from './RoleSwitcher.jsx'

const iconButton =
  'grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink/70 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac-500/60'

export default function Header({ collapsed, onToggleSidebar, onOpenMobile }) {
  const { nav } = useRole()
  const { pathname } = useLocation()
  const title = nav.find((item) => item.to === pathname)?.label ?? 'Dashboard'

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
        <label className="glass hidden h-11 w-64 items-center gap-2.5 rounded-2xl px-3.5 text-ink/50 focus-within:ring-2 focus-within:ring-lilac-500/60 md:flex xl:w-80">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            placeholder="Search students, classes, fees"
            aria-label="Search"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
        </label>

        <button type="button" aria-label="Notifications" className={`${iconButton} glass relative`}>
          <Bell className="h-5 w-5" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-lilac-500 ring-2 ring-white" />
        </button>

        <RoleSwitcher />
      </div>
    </header>
  )
}
