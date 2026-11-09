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
 * One source of truth for everything that changes per role:
 * identity, accent colours, hero copy and sidebar links.
 * Tailwind only sees full class names, so accents are written out in full.
 */
export const ROLES = {
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Run the whole school',
    icon: ShieldCheck,
    accent: 'from-lilac-500 to-fuchsia-400',
    profile: { name: 'Abdullah Rauf', email: 'amara.qureshi@scholara.edu', title: 'School administrator', initials: 'AR' },
    hero: {
      gradient: 'linear-gradient(115deg, #E3D8FF 0%, #C9B6FF 48%, #F4C8E8 100%)',
      subtitle: 'Enrolment, staffing, attendance and fee collection at a glance.',
      cta: { label: 'Review fee collection', to: '/fees' },
      links: [
        { label: 'Add student', to: '/students' },
        { label: 'Class rosters', to: '/classes' },
        { label: 'Attendance', to: '/attendance' },
      ],
    },
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
    profile: { name: 'Abdullah Rauf', email: 'hassan.raza@scholara.edu', title: 'Mathematics, Grade 8A', initials: 'AR' },
    hero: {
      gradient: 'linear-gradient(115deg, #E1D9FF 0%, #BFCBFF 50%, #BDE3FF 100%)',
      subtitle: 'Take attendance, enter marks and see how each class is doing.',
      cta: { label: 'Take attendance', to: '/attendance' },
      links: [
        { label: 'My classes', to: '/classes' },
        { label: 'Enter marks', to: '/marks' },
        { label: 'Student list', to: '/students' },
      ],
    },
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
    profile: { name: 'Abdullah Rauf', email: 'zara.ahmed@student.scholara.edu', title: 'Grade 8A, Roll 1', initials: 'AR' },
    hero: {
      gradient: 'linear-gradient(115deg, #E9D8FF 0%, #D2B8FF 45%, #FFD9C7 100%)',
      subtitle: 'See your latest marks, how often you have been in class and what is due.',
      cta: { label: 'View my marks', to: '/marks' },
      links: [
        { label: 'My attendance', to: '/attendance' },
        { label: 'Fee status', to: '/fees' },
      ],
    },
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
    profile: { name: 'Abdullah Rauf', email: 'imran.ahmed@mail.com', title: 'Parent of Abdullah Rauf', initials: 'AR' },
    hero: {
      gradient: 'linear-gradient(115deg, #E6DAFF 0%, #CDBBFF 45%, #C4EBDD 100%)',
      subtitle: 'Check progress, attendance and outstanding fees for your children.',
      cta: { label: 'Pay outstanding fees', to: '/fees' },
      links: [
        { label: 'Report cards', to: '/marks' },
        { label: 'Attendance', to: '/attendance' },
      ],
    },
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
