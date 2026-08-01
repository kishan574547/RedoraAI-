import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2.5 rounded-xl border transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs cursor-pointer ${
        theme === 'dark'
          ? 'bg-slate-800/90 border-slate-700/80 text-amber-400 hover:bg-slate-700/90 hover:border-amber-400/40 hover:shadow-amber-400/10'
          : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 hover:border-indigo-300 hover:shadow-indigo-500/10'
      } ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  )
}
