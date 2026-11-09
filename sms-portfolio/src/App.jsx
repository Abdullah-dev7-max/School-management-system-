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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
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
