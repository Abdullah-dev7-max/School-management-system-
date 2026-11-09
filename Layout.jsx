import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import HeroBanner from './HeroBanner.jsx'

const COLLAPSE_KEY = 'scholara.sidebar.collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Close the drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas">
      {/* Ambient colour behind the glass surfaces */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-lilac-300/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[30rem] w-[30rem] rounded-full bg-pink-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header collapsed={collapsed} onToggleSidebar={toggleCollapsed} onOpenMobile={() => setMobileOpen(true)} />

        <main className="thin-scroll flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">
            <HeroBanner />

            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
