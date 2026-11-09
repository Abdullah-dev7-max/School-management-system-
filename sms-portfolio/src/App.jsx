import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/admin/Students.jsx'
import Teachers from './pages/Teachers.jsx'
import Classes from './pages/Classes.jsx'
import Attendance from './pages/Attendance.jsx'
import Fees from './pages/Fees.jsx'
import Marks from './pages/Marks.jsx'
import Settings from './pages/Settings.jsx'
import Placeholder from './pages/Placeholder.jsx'
import AuthPage from './pages/AuthPage.jsx'
import { useRole } from './context/RoleContext.jsx'
import { LogOut } from 'lucide-react'

export default function App() {
  const { initialized, profileLoading, profile, profileError, session, signOut } = useRole()
  const [signOutError, setSignOutError] = useState('')

  if (!initialized || profileLoading || (session?.user && !profile && !profileError)) {
    return <main className="grid min-h-screen place-items-center text-sm text-ink/60">Loading secure session…</main>
  }
  if (profileError) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <div role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="font-semibold">Could not verify the administrator account</p>
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
  if (!profile) return <AuthPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="classes" element={<Classes />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="fees" element={<Fees />} />
        <Route path="marks" element={<Marks />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  )
}
