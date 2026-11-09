import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import { RoleProvider } from './context/RoleContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Respect the OS "reduce motion" setting everywhere */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <RoleProvider>
          <App />
        </RoleProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
)
