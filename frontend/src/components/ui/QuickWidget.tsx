import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckSquare, Flame, ChevronDown, ChevronUp, Bot } from 'lucide-react'
import api from '../../lib/api'

export function QuickWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [streakCount, setStreakCount] = useState(0)

  useEffect(() => {
    if (location.pathname.startsWith('/tools')) {
      return
    }

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

  if (location.pathname.startsWith('/tools')) {
    return null
  }

  const fetchTasksAndHabits = async () => {
    try {
      const res = await api.get('/tasks/')
      const tasks = Array.isArray(res.data) ? res.data : []
      const today = new Date().toDateString()
      
      // Only include pending/active tasks
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

  return (
    <div className='fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 w-72 overflow-hidden transition-all duration-300 font-sans'>
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className='px-4 py-3 bg-slate-50 dark:bg-slate-950 flex items-center justify-between cursor-pointer select-none border-b border-slate-200 dark:border-slate-800'
      >
        <div className='flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider'>
          <Bot className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
          <span>Redora AI Today Widget</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full'>
            <Flame className='w-3 h-3 text-amber-500 fill-amber-500' />
            <span>{streakCount}d</span>
          </span>
          {isOpen ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronUp className='w-4 h-4' />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className='p-3 space-y-2 text-xs bg-white dark:bg-slate-900'>
          <div className='text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between'>
            <span>Priority Tasks Today:</span>
            <span className='text-indigo-600 dark:text-indigo-400'>{todayTasks.filter(t => t.status === 'completed').length}/{todayTasks.length}</span>
          </div>

          {todayTasks.length === 0 ? (
            <div className='text-slate-400 italic text-[11px] py-1'>No pending tasks due today 🎉</div>
          ) : (
            todayTasks.map((t) => (
              <div key={t.id} className='flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50'>
                <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${t.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={`truncate text-[11px] ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>
                  {t.title}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
