import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/admin/Students.jsx'
import Placeholder from './pages/Placeholder.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        {/* Dedicated pages (Students, Fees, Marks...) replace this in later steps */}
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  )
}
