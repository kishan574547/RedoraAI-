import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckSquare, Flame, ChevronDown, ChevronUp, Bot, Move, Sparkles } from 'lucide-react'
import api from '../../lib/api'

type PositionMode = 'bottom-right' | 'bottom-left' | 'top-right'

export function QuickWidget() {
  const location = useLocation()
  const isChatPage = location.pathname.startsWith('/chat')
  const isToolsPage = location.pathname.startsWith('/tools')

  // Load preferences from localStorage
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('quick_widget_open')
    return saved === 'true' // Default to false (collapsed) if not saved
  })

  const [position, setPosition] = useState<PositionMode>(() => {
    const saved = localStorage.getItem('quick_widget_position')
    if (saved === 'bottom-left' || saved === 'top-right' || saved === 'bottom-right') {
      return saved
    }
    return 'bottom-right'
  })

  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const [showPosPicker, setShowPosPicker] = useState(false)

  useEffect(() => {
    if (isToolsPage) return

    fetchTasksAndHabits()

    const handleUpdate = () => {
      fetchTasksAndHabits()
    }

    window.addEventListener('focus', handleUpdate)
    window.addEventListener('lifeos_data_updated', handleUpdate)

    return () => {
      window.removeEventListener('focus', handleUpdate)
      window.removeEventListener('lifeos_data_updated', handleUpdate)
    }
  }, [location.pathname])

  const toggleOpen = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    localStorage.setItem('quick_widget_open', String(nextState))
  }

  const changePosition = (pos: PositionMode) => {
    setPosition(pos)
    localStorage.setItem('quick_widget_position', pos)
    setShowPosPicker(false)
  }

  if (isToolsPage) {
    return null
  }

  const fetchTasksAndHabits = async () => {
    try {
      const res = await api.get('/tasks/')
      const tasks = Array.isArray(res.data) ? res.data : []
      const today = new Date().toDateString()
      
      const activeTasks = tasks.filter((t: any) => 
        t.status !== 'completed' && 
        t.status !== 'cancelled' && 
        (!t.due_date || new Date(t.due_date).toDateString() === today)
      ).slice(0, 3)
      
      setTodayTasks(activeTasks)

      const habitsRes = await api.get('/habits/')
      if (Array.isArray(habitsRes.data) && habitsRes.data.length > 0) {
        const maxStreak = Math.max(...habitsRes.data.map((h: any) => h.streak_count || h.streak || 0))
        setStreakCount(maxStreak || 0)
      } else {
        setStreakCount(0)
      }
    } catch (e) {
      console.error('Failed to fetch quick widget data', e)
    }
  }

  // Calculate dynamic classes based on position and current page
  let positionClass = ''
  if (position === 'bottom-right') {
    // If on chat page or mobile, offset bottom so it does NOT block the chat input prompt bar
    positionClass = isChatPage
      ? 'bottom-24 right-4 sm:bottom-20 sm:right-6'
      : 'bottom-4 right-4 sm:bottom-6 sm:right-6'
  } else if (position === 'bottom-left') {
    positionClass = isChatPage
      ? 'bottom-24 left-4 sm:bottom-20 sm:left-6'
      : 'bottom-4 left-4 sm:bottom-6 sm:left-6'
  } else if (position === 'top-right') {
    positionClass = 'top-20 right-4 sm:top-24 sm:right-6'
  }

  return (
    <div className={`fixed ${positionClass} z-40 transition-all duration-300 font-sans select-none max-w-[calc(100vw-2rem)]`}>
      {/* 1. COLLAPSED MINI FLOATING BUBBLE (Default Small State) */}
      {!isOpen && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleOpen}
            className="group flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/95 dark:bg-slate-900/95 text-white border border-indigo-500/40 rounded-full shadow-2xl hover:scale-105 hover:border-indigo-400 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
            title="Click to open Today Widget"
          >
            <div className="relative flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
              {todayTasks.length > 0 && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-xs font-bold tracking-tight text-indigo-100 hidden xs:inline">
              Widget
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{streakCount}d</span>
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-300 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* Position Selector Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setShowPosPicker(!showPosPicker)}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-700/80 shadow-md transition-colors"
            title="Change Widget Position"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Position Picker Popup when mini */}
      {!isOpen && showPosPicker && (
        <div className="absolute bottom-12 right-0 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-xl space-y-1 text-xs text-white z-50 min-w-[140px]">
          <div className="text-[10px] text-slate-400 px-2 py-1 uppercase font-semibold">Position</div>
          <button
            type="button"
            onClick={() => changePosition('bottom-right')}
            className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between ${position === 'bottom-right' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
          >
            <span>Bottom Right</span>
            {position === 'bottom-right' && '✓'}
          </button>
          <button
            type="button"
            onClick={() => changePosition('bottom-left')}
            className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between ${position === 'bottom-left' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
          >
            <span>Bottom Left</span>
            {position === 'bottom-left' && '✓'}
          </button>
          <button
            type="button"
            onClick={() => changePosition('top-right')}
            className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between ${position === 'top-right' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
          >
            <span>Top Right</span>
            {position === 'top-right' && '✓'}
          </button>
        </div>
      )}

      {/* 2. EXPANDED WIDGET PANEL (Full Card) */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 w-72 sm:w-80 overflow-hidden transition-all duration-300 backdrop-blur-md">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Redora AI Today</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{streakCount}d</span>
              </span>

              {/* Position Switch Button */}
              <button
                type="button"
                onClick={() => setShowPosPicker(!showPosPicker)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Reposition Widget"
              >
                <Move className="w-3.5 h-3.5" />
              </button>

              {/* Collapse Button */}
              <button
                type="button"
                onClick={toggleOpen}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Collapse Widget"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Position Selector Dropdown inside open card */}
          {showPosPicker && (
            <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Position:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => changePosition('bottom-right')}
                  className={`px-2 py-0.5 rounded ${position === 'bottom-right' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  B-Right
                </button>
                <button
                  type="button"
                  onClick={() => changePosition('bottom-left')}
                  className={`px-2 py-0.5 rounded ${position === 'bottom-left' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  B-Left
                </button>
                <button
                  type="button"
                  onClick={() => changePosition('top-right')}
                  className={`px-2 py-0.5 rounded ${position === 'top-right' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  T-Right
                </button>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-3.5 space-y-2.5 text-xs bg-white dark:bg-slate-900">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Priority Tasks Today
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                {todayTasks.filter(t => t.status === 'completed').length}/{todayTasks.length}
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-slate-400 italic text-[11px] py-2 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No pending tasks due today 🎉
              </div>
            ) : (
              todayTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${t.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className={`truncate text-[11px] ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>
                    {t.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

