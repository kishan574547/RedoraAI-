import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckSquare, Flame, ChevronDown, ChevronUp, Bot, GripHorizontal } from 'lucide-react'
import api from '../../lib/api'

export function QuickWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [streakCount, setStreakCount] = useState(0)

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('redora_widget_pos')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  })

  const allowedPages = ['/', '/dashboard', '/tasks', '/goals']
  const isAllowedPage = allowedPages.includes(location.pathname)

  useEffect(() => {
    if (!isAllowedPage) return
    fetchTasksAndHabits()

    const handleUpdate = () => fetchTasksAndHabits()

    window.addEventListener('focus', handleUpdate)
    window.addEventListener('lifeos_data_updated', handleUpdate)

    return () => {
      window.removeEventListener('focus', handleUpdate)
      window.removeEventListener('lifeos_data_updated', handleUpdate)
    }
  }, [location.pathname, isAllowedPage])

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

  // Handle Dragging
  const handleStart = (clientX: number, clientY: number) => {
    const currentX = position?.x ?? (window.innerWidth - 300)
    const currentY = position?.y ?? (window.innerHeight - 80)

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
      moved: false,
    }
    setIsDragging(true)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (clientX: number, clientY: number) => {
      const deltaX = clientX - dragRef.current.startX
      const deltaY = clientY - dragRef.current.startY

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragRef.current.moved = true
      }

      // Keep widget within screen bounds
      const widgetWidth = Math.min(window.innerWidth - 32, 288)
      const newX = Math.max(10, Math.min(window.innerWidth - widgetWidth - 10, dragRef.current.initialX + deltaX))
      const newY = Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.initialY + deltaY))

      setPosition({ x: newX, y: newY })
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
      if (position) {
        try {
          localStorage.setItem('redora_widget_pos', JSON.stringify(position))
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, position])

  if (!isAllowedPage) {
    return null
  }

  const stylePosition = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : {}

  return (
    <div
      style={stylePosition}
      className={`fixed z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 w-[calc(100vw-2rem)] sm:w-72 overflow-hidden font-sans touch-none select-none ${
        !position ? 'bottom-4 right-4 sm:bottom-6 sm:right-6' : ''
      } ${isDragging ? 'shadow-indigo-500/20 scale-[1.02] cursor-grabbing' : 'transition-all duration-200'}`}
    >
      {/* Header with Grip Drag Area */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => {
          if (!dragRef.current.moved) {
            setIsOpen(!isOpen)
          }
        }}
        className='px-3 py-2.5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-slate-200 dark:border-slate-800'
      >
        <div className='flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider min-w-0'>
          <GripHorizontal className='w-4 h-4 text-slate-400 shrink-0' />
          <Bot className='w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0' />
          <span className='truncate'>Redora AI Today</span>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full'>
            <Flame className='w-3 h-3 text-amber-500 fill-amber-500' />
            <span>{streakCount}d</span>
          </span>
          {isOpen ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronUp className='w-4 h-4 text-slate-400' />}
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

