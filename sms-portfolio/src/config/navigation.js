import {
  Award,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  School,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'

export const DEFAULT_ROLE = 'admin'

/**
 * One source of truth for the role switcher, accent colours and sidebar links.
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

  teacher: {
    id: 'teacher',
    label: 'Teacher',
    description: 'Classes, attendance and grading',
    icon: GraduationCap,
    accent: 'from-lilac-500 to-sky-400',
    nav: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/classes', label: 'My classes', icon: School },
      { to: '/students', label: 'My students', icon: Users },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/marks', label: 'Gradebook', icon: Award },
    ],
  },

  student: {
    id: 'student',
    label: 'Student',
    description: 'Your marks, attendance and fees',
    icon: BookOpen,
    accent: 'from-lilac-500 to-orange-300',
    nav: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/marks', label: 'My marks', icon: Award },
      { to: '/attendance', label: 'My attendance', icon: CalendarCheck },
      { to: '/fees', label: 'My fees', icon: Wallet },
    ],
  },

  parent: {
    id: 'parent',
    label: 'Parent',
    description: 'Follow your children at school',
    icon: HeartHandshake,
    accent: 'from-lilac-500 to-emerald-300',
    nav: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/marks', label: 'Report cards', icon: Award },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/fees', label: 'Fees', icon: Wallet },
    ],
  },
}

export const ROLE_ORDER = ['admin', 'teacher', 'student', 'parent']

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
