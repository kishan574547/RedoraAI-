import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Target, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Activity,
  FileText,
  Calculator,
  Code2,
  FileCheck,
  Database,
  Settings
} from 'lucide-react'
import { NetworkStatusBanner } from '../ui/UIStates'
import { ThemeToggle } from '../ui/ThemeToggle'

import { supabase } from '../../lib/supabaseClient'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('is_logged_in')
    navigate('/login')
  }

  const primaryNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Chat with Agents', path: '/chat', icon: Sparkles },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Goals', path: '/goals', icon: Target },
  ]

  const toolNavItems = [
    { name: 'PDF Toolkit', path: '/tools/pdf', icon: FileText },
    { name: 'GPA Calculator', path: '/tools/gpa', icon: Calculator },
    { name: 'Code Sandbox', path: '/tools/sandbox', icon: Code2 },
    { name: 'Resume ATS Checker', path: '/tools/resume-ats', icon: FileCheck },
    { name: 'Kaggle', path: '/tools/kaggle', icon: Database },
    { name: 'Activity Log', path: '/activity', icon: Activity },
  ]

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans relative transition-colors duration-200">
      <NetworkStatusBanner />
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 fixed left-0 top-0 bottom-0 h-screen bg-white dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 p-4 z-30 overflow-hidden shrink-0 transition-colors duration-200 justify-between">
        <div className="flex items-center space-x-3 mb-4">
          <img src="/logo.png" alt="Redora AI Logo" className="h-8 w-8 rounded-xl object-contain shadow-sm bg-slate-900 border border-indigo-500/20" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent font-serif">
            Redora AI
          </span>
        </div>

        <nav className="flex-1 flex flex-col justify-between overflow-hidden min-h-0 space-y-3">
          {/* Top Primary Nav Items */}
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group min-h-[38px] ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-800/80 my-1" />

          {/* Tools Section Header & Sub-items */}
          <div className="space-y-1 overflow-y-auto min-h-0 flex-1 scrollbar-none">
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Tools
            </div>
            <div className="space-y-0.5 pl-1">
              {toolNavItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-1.5 rounded-lg transition-all duration-200 group min-h-[36px] ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'}`} />
                    <span className="font-medium text-xs sm:text-sm">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Settings Section Item */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80">
            <Link
              to="/settings"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group min-h-[38px] ${
                location.pathname === '/settings' 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Settings className={`h-4.5 w-4.5 ${location.pathname === '/settings' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'}`} />
              <span className="font-medium text-sm">Settings</span>
            </Link>
          </div>
        </nav>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 min-h-[40px]"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile & Tablet Navigation Header */}
      <div className="flex flex-col flex-1 min-w-0 w-full lg:pl-64 overflow-x-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <img src="/logo.png" alt="Redora AI Logo" className="h-8 w-8 rounded-lg object-contain bg-slate-900 shadow-sm border border-indigo-500/20 shrink-0" />
            <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent font-serif truncate">
              Redora AI
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 rounded-xl border border-slate-700 focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Backdrop & Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="Redora AI Logo" className="h-8 w-8 rounded-lg object-contain bg-slate-900 shadow-sm" />
                <span className="text-xl font-bold font-serif text-emerald-400">Navigation</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-3 text-slate-400 hover:text-white bg-slate-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl min-h-[48px] ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold' 
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="font-semibold text-base">{item.name}</span>
                    </Link>
                  )
                })}
              </div>

              <div className="border-t border-slate-800 my-4" />

              <div className="space-y-2">
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tools
                </div>
                <div className="space-y-1 pl-2">
                  {toolNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl min-h-[48px] ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold' 
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold text-sm">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-800 my-4" />

              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl min-h-[48px] ${
                  location.pathname === '/settings'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Settings className="h-6 w-6" />
                <span className="font-semibold text-base">Settings</span>
              </Link>
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-4 px-4 py-4 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 mt-auto border border-rose-500/20 font-semibold min-h-[48px]"
            >
              <LogOut className="h-6 w-6" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 lg:p-10 w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-6 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

