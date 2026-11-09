import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Placeholder from './pages/Placeholder.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        {/* Dedicated pages (Students, Fees, Marks...) replace this in later steps */}
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  )
}
