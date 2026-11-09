import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { GraduationCap, Settings, X } from 'lucide-react'
import { useRole } from '../../context/RoleContext.jsx'
import Avatar from '../ui/Avatar.jsx'

const SPRING = { type: 'spring', stiffness: 420, damping: 36 }
const WIDTH_EXPANDED = 272
const WIDTH_COLLAPSED = 88

function Brand({ collapsed, onClose }) {
  return (
    <div className={`flex h-[72px] shrink-0 items-center ${collapsed ? 'justify-center' : 'gap-3 px-5'}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lilac-400 to-lilac-600 text-white shadow-glow">
        <GraduationCap className="h-5 w-5" strokeWidth={2} />
      </span>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="brand-text"
            className="min-w-0 flex-1"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-white">Scholara</p>
            <p className="truncate text-xs text-white/45">School management</p>
          </motion.div>
        )}
      </AnimatePresence>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="grid h-9 w-9 place-items-center rounded-xl text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-lilac-300/80"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

function NavItem({ to, label, icon: Icon, collapsed, pillId, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={label}
      className="group relative block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-lilac-300/80"
    >
      {({ isActive }) => (
        <>
          <span className="absolute inset-0 rounded-xl transition-colors group-hover:bg-white/[0.06]" />

          {isActive && (
            <>
              {/* Glowing pill that glides between items */}
              <motion.span
                layoutId={`${pillId}-pill`}
                transition={SPRING}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-lilac-600 to-lilac-400 shadow-glow"
              />
              {/* Glowing edge marker */}
              <motion.span
                layoutId={`${pillId}-bar`}
                transition={SPRING}
                className="absolute -left-4 top-2.5 h-6 w-1 rounded-r-full bg-lilac-300 shadow-[0_0_14px_3px_rgba(171,141,255,0.8)]"
              />
            </>
          )}

          <span
            className={`relative z-10 flex h-11 items-center gap-3 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : 'px-3.5'
            } ${isActive ? 'text-white' : 'text-white/55 group-hover:text-white'}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="label"
                  className="truncate"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </>
      )}
    </NavLink>
  )
}

function ProfileCard({ collapsed, onNavigate }) {
  const { profile, accent } = useRole()

  return (
    <div className="shrink-0 p-3">
      <div
        className={`flex items-center rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 ${
          collapsed ? 'justify-center' : 'gap-3'
        }`}
      >
        <Avatar initials={profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()} accent={accent} online />

        <AnimatePresence initial={false} mode="wait">
          {!collapsed && (
            <motion.div
              key={profile.auth_user_id}
              className="flex min-w-0 flex-1 items-center gap-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16 }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
                <p className="truncate text-xs text-white/45">{profile.email}</p>
              </div>
              <NavLink
                to="/settings"
                onClick={onNavigate}
                aria-label="Settings"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-lilac-300/80"
              >
                <Settings className="h-4 w-4" />
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SidebarBody({ collapsed, pillId, onNavigate, onClose }) {
  const { nav } = useRole()

  return (
    <div className="flex h-full flex-col">
      <Brand collapsed={collapsed} onClose={onClose} />

      <nav aria-label="Primary" className="thin-scroll flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {nav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} pillId={pillId} onNavigate={onNavigate} />
        ))}
      </nav>

      <ProfileCard collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  )
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseMobile()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      {/* Desktop: collapsible rail */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
        transition={SPRING}
        className="sidebar-surface relative z-30 hidden shrink-0 overflow-hidden text-white lg:block"
      >
        <SidebarBody collapsed={collapsed} pillId="desktop" />
      </motion.aside>

      {/* Mobile: slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-night-950/60 backdrop-blur-sm" onClick={onCloseMobile} aria-hidden="true" />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="sidebar-surface absolute inset-y-0 left-0 w-[272px] overflow-hidden text-white shadow-2xl"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={SPRING}
            >
              <SidebarBody collapsed={false} pillId="mobile" onNavigate={onCloseMobile} onClose={onCloseMobile} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
