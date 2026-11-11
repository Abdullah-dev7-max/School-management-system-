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
  ClipboardList,
  FileText,
  Megaphone,
  Clock3,
} from 'lucide-react'

/**
 * The application exposes role-specific authenticated workspaces.
 * Tailwind only sees full class names, so accents are written out in full.
 */
export const ROLES = {
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Run the whole institute',
    icon: ShieldCheck,
    accent: 'from-lilac-500 to-fuchsia-400',
    nav: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/teachers', label: 'Teachers', icon: GraduationCap },
      { to: '/classes', label: 'Classes', icon: School },
      { to: '/timetable', label: 'Timetable', icon: Clock3 },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/fees', label: 'Fees', icon: Wallet },
      { to: '/marks', label: 'Marks', icon: Award },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher',
    description: 'View your classes and student records',
    icon: GraduationCap,
    accent: 'from-sky-500 to-lilac-400',
    nav: [
      { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/teacher-dashboard/attendance', label: 'Attendance', icon: ClipboardList },
      { to: '/teacher-dashboard/marks', label: 'Exam marks', icon: Award },
      { to: '/teacher-dashboard/timetable', label: 'Schedule', icon: Clock3 },
      { to: '/teacher-dashboard/notes', label: 'Class notes', icon: FileText },
      { to: '/teacher-dashboard/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  student: {
    id: 'student',
    label: 'Student',
    description: 'View your academic and attendance records',
    icon: Award,
    accent: 'from-emerald-500 to-sky-400',
    nav: [
      { to: '/student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/student-dashboard/fees', label: 'Fees', icon: Wallet },
      { to: '/student-dashboard/marks', label: 'Marks', icon: Award },
      { to: '/student-dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/student-dashboard/timetable', label: 'Timetable', icon: Clock3 },
      { to: '/student-dashboard/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/student-dashboard/notes', label: 'Notes', icon: FileText },
    ],
  },
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
