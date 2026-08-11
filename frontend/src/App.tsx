import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import Goals from './pages/Goals'
import Login from './pages/Login'
import FullActivity from './pages/FullActivity'
import PdfToolkit from './pages/tools/PdfToolkit'
import GpaCalculator from './pages/tools/GpaCalculator'
import CodeSandbox from './pages/tools/CodeSandbox'
import ResumeAtsChecker from './pages/tools/ResumeAtsChecker'
import KaggleExplorer from './pages/tools/KaggleExplorer'
import Settings from './pages/Settings'

import AppLayout from './components/layout/AppLayout'
import { QuickWidget } from './components/ui/QuickWidget'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 1. Check if user logged in during current session
    const isLoggedSession = sessionStorage.getItem('is_logged_in') === 'true'

    if (!isLoggedSession) {
      localStorage.removeItem('access_token')
      sessionStorage.removeItem('is_logged_in')
      setIsAuthenticated(false)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && sessionStorage.getItem('is_logged_in') === 'true') {
        localStorage.setItem('access_token', session.access_token)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('is_logged_in')
        setIsAuthenticated(false)
      }
      setLoading(false)
    }).catch(() => {
      localStorage.removeItem('access_token')
      sessionStorage.removeItem('is_logged_in')
      setIsAuthenticated(false)
      setLoading(false)
    })

    // 2. Listen to auth state changes in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && sessionStorage.getItem('is_logged_in') === 'true') {
        localStorage.setItem('access_token', session.access_token)
        setIsAuthenticated(true)
      } else if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('is_logged_in')
        setIsAuthenticated(false)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      {children}
      <QuickWidget />
    </AppLayout>
  )
}


import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><FullActivity /></ProtectedRoute>} />
          <Route path="/tools/pdf" element={<ProtectedRoute><PdfToolkit /></ProtectedRoute>} />
          <Route path="/tools/gpa" element={<ProtectedRoute><GpaCalculator /></ProtectedRoute>} />
          <Route path="/tools/sandbox" element={<ProtectedRoute><CodeSandbox /></ProtectedRoute>} />
          <Route path="/tools/resume-ats" element={<ProtectedRoute><ResumeAtsChecker /></ProtectedRoute>} />
          <Route path="/tools/kaggle" element={<ProtectedRoute><KaggleExplorer /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
