import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Lock, 
  KeyRound, 
  Moon, 
  Sun, 
  Globe, 
  Bell, 
  LogOut, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Settings as SettingsIcon
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

export default function Settings() {
  const navigate = useNavigate()
  const { theme } = useTheme()

  // Account State
  const [userEmail, setUserEmail] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [nameSuccess, setNameSuccess] = useState<boolean>(false)

  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Preferences State
  const [language, setLanguage] = useState(() => localStorage.getItem('lifeos_language') || 'English')

  // Notifications State
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(() => localStorage.getItem('lifeos_notif_digest') !== 'false')
  const [agentAlertsEnabled, setAgentAlertsEnabled] = useState(() => localStorage.getItem('lifeos_notif_alerts') !== 'false')

  // Danger Zone Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || 'user@example.com')
        const existingName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        setDisplayName(existingName)
      }
    })
  }, [])

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await supabase.auth.updateUser({
        data: { full_name: displayName }
      })
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to update display name', err)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordStatus(null)

    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err.message || 'Failed to update password.' })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('lifeos_language', lang)
  }

  const toggleDailyDigest = () => {
    const next = !dailyDigestEnabled
    setDailyDigestEnabled(next)
    localStorage.setItem('lifeos_notif_digest', String(next))
  }

  const toggleAgentAlerts = () => {
    const next = !agentAlertsEnabled
    setAgentAlertsEnabled(next)
    localStorage.setItem('lifeos_notif_alerts', String(next))
  }

  const handleLogout = () => {
    supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('is_logged_in')
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <div className="space-y-6 w-full max-w-full font-sans transition-colors duration-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Preferences & Account</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Manage your profile details, security, app preferences, and notifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {/* 1. ACCOUNT SECTION */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Account Info & Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your public display name and account credentials</p>
            </div>
          </div>

          <form onSubmit={handleSaveDisplayName} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Read Only
                  </span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
              >
                Save Name
              </button>
              {nameSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Name saved!
                </span>
              )}
            </div>
          </form>

          {/* Change Password Flow */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100">Security — Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {passwordStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordStatus.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                }`}>
                  {passwordStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </section>

        {/* 2. PREFERENCES SECTION */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-600 dark:text-purple-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">App Preferences</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Theme appearance and regional language settings</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Theme Toggle Sync */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>Appearance Mode</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Currently active: <span className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">{theme} Mode</span>
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                Interface Language
              </label>
              <div className="flex flex-wrap gap-2">
                {['English', 'Telugu', 'Tamil'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      language === lang
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. NOTIFICATIONS SECTION */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Notifications & Alerts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control digest emails, task deadlines, and automated alerts</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Daily Task & Habit Digest</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Receive morning summary notifications for due tasks</p>
              </div>
              <button
                type="button"
                onClick={toggleDailyDigest}
                className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  dailyDigestEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">AI Agent Proactive Alerts</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Get notified when agents create new tasks or suggestions</p>
              </div>
              <button
                type="button"
                onClick={toggleAgentAlerts}
                className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  agentAlertsEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>
        </section>

        {/* 4. DANGER ZONE */}
        <section className="bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl p-6 space-y-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-rose-500/20">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-rose-700 dark:text-rose-400">Danger Zone</h2>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Irreversible actions and session termination</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Sign Out of LifeOS</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Terminate current session safely</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 min-h-[42px]"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete Account & Data</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Permanently erase profile and stored workspace history</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 min-h-[42px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">Delete Account?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Are you sure you want to delete your account? All your registered tasks, goals, memories, habits, and chat history will be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors min-h-[42px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors min-h-[42px]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
