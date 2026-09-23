import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import { PersistentAppShell } from './components/layout/PersistentAppShell'
import { ToolSessionProvider } from './context/ToolSessionContext'
import { ThemeProvider } from './context/ThemeContext'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function ProtectedShell() {
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
    <ToolSessionProvider>
      <PersistentAppShell />
    </ToolSessionProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedShell />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

