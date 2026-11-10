import { useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import RoleDashboard from './pages/RoleDashboard.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import Students from './pages/admin/Students.jsx'
import Teachers from './pages/Teachers.jsx'
import Classes from './pages/Classes.jsx'
import Attendance from './pages/Attendance.jsx'
import AttendanceOverview from './pages/admin/AttendanceOverview.jsx'
import Fees from './pages/Fees.jsx'
import Marks from './pages/Marks.jsx'
import TeacherNotes from './pages/TeacherNotes.jsx'
import TeacherAnnouncements from './pages/TeacherAnnouncements.jsx'
import Settings from './pages/Settings.jsx'
import Placeholder from './pages/Placeholder.jsx'
import { useRole } from './context/RoleContext.jsx'
import { LogOut } from 'lucide-react'

const roleHome = {
  admin: '/admin',
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  parent: '/parent',
}

function RequireRole({ role, children }) {
  const { profile } = useRole()
  if (profile.role !== role) return <Navigate to={roleHome[profile.role] ?? '/login'} replace />
  return children ?? <Outlet />
}

export default function App() {
  const { initialized, profileLoading, profile, profileError, session, signOut } = useRole()
  const [signOutError, setSignOutError] = useState('')
  const location = useLocation()

  if (location.pathname === '/reset-password' && initialized) return <ResetPasswordPage />
  if (!initialized || profileLoading || (session?.user && !profile && !profileError)) {
    return <main className="grid min-h-screen place-items-center text-sm text-ink/60">Loading secure session…</main>
  }
  if (profileError) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <div role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="font-semibold">Could not verify this institute account</p>
          <p className="mt-2">{profileError.message}</p>
          {signOutError && <p className="mt-2">{signOutError}</p>}
          <button type="button" onClick={async () => {
            try {
              await signOut()
              setSignOutError('')
            } catch (error) {
              setSignOutError(error.message)
            }
          }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-night-900 px-4 py-2 text-white">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </div>
      </main>
    )
  }
  if (!profile) {
    return location.pathname === '/login' ? <Login /> : <Navigate to="/login" replace />
  }
  if (location.pathname === '/login') {
    if (session?.custom && !window.localStorage.getItem('scholara.role.session')) return <Login />
    return <Navigate to={roleHome[profile.role] ?? '/'} replace />
  }

  return (
    <Routes>
      <Route element={<RequireRole role="admin" />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="admin" element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="classes" element={<Classes />} />
          <Route path="attendance" element={<AttendanceOverview />} />
          <Route path="fees" element={<Fees />} />
          <Route path="marks" element={<Marks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
      <Route path="teacher" element={<RequireRole role="teacher"><Layout /></RequireRole>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="marks" element={<Marks />} />
        <Route path="notes" element={<TeacherNotes />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
      </Route>
      <Route path="student" element={<RequireRole role="student"><Layout /></RequireRole>}>
        <Route index element={<StudentDashboard />} />
      </Route>
      <Route path="parent" element={<RequireRole role="parent"><Layout /></RequireRole>}>
        <Route index element={<RoleDashboard />} />
      </Route>
      {['teacher', 'student'].map((role) => (
        <Route key={`${role}-dashboard`} path={`${role}-dashboard`} element={<RequireRole role={role}><Layout /></RequireRole>}>
          <Route index element={role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />} />
          {role === 'teacher' && (
            <>
              <Route path="attendance" element={<Attendance />} />
              <Route path="marks" element={<Marks />} />
              <Route path="notes" element={<TeacherNotes />} />
              <Route path="announcements" element={<TeacherAnnouncements />} />
            </>
          )}
        </Route>
      ))}
      <Route path="login" element={<Navigate to={roleHome[profile.role] ?? '/'} replace />} />
      <Route path="*" element={<Navigate to={roleHome[profile.role] ?? '/'} replace />} />
    </Routes>
  )
}
