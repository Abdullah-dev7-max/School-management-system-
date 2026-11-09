import {
  Award,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  School,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'

/**
 * The application is an authenticated administrator workspace.
 * Tailwind only sees full class names, so accents are written out in full.
 */
export const ROLES = {
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Run the whole school',
    icon: ShieldCheck,
    accent: 'from-lilac-500 to-fuchsia-400',
    nav: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/teachers', label: 'Teachers', icon: GraduationCap },
      { to: '/classes', label: 'Classes', icon: School },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/fees', label: 'Fees', icon: Wallet },
      { to: '/marks', label: 'Marks', icon: Award },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
