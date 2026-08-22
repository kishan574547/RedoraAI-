import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CheckSquare, 
  Target, 
  LogOut, 
  ArrowRight,
  Brain,
  Bot,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers
} from 'lucide-react'
import MemoryPanel from '../components/memory/MemoryPanel'
import HabitsSection from '../components/habits/HabitsSection'
import { SuggestionsList, SuggestionItem } from '../components/ui/SuggestionsList'
import { getAgentTheme } from '../lib/agentTheme'
import { SkeletonCard, ErrorState } from '../components/ui/UIStates'
import api from '../lib/api'

interface Task {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string
  created_at: string
}

interface Goal {
  id: number
  title: string
  description?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  target_date?: string
  created_at: string
}

interface ActivityGroup {
  id: string
  agentName: string
  agentIcon: any
  badgeColor: string
  actionSummary: string
  timeAgo: string
  items: string[]
}

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  totalGoals: number
  activeGoals: number
  recentChats: number
}

import { LifeStateCard } from '../components/ui/LifeStateCard'

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalGoals: 0,
    activeGoals: 0,
    recentChats: 0,
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [dashboardSuggestions, setDashboardSuggestions] = useState<SuggestionItem[]>([])
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([])
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())

  // Collapsible state for Habits & Memory sections
  const [isHabitsOpen, setIsHabitsOpen] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)

  const [habitsStreak, setHabitsStreak] = useState(0)
  const [activeTaskTab, setActiveTaskTab] = useState<'today' | 'week' | 'all'>('today')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()

    const handleDataUpdate = () => {
      fetchDashboardData()
    }

    window.addEventListener('focus', handleDataUpdate)
    window.addEventListener('lifeos_data_updated', handleDataUpdate)

    return () => {
      window.removeEventListener('focus', handleDataUpdate)
      window.removeEventListener('lifeos_data_updated', handleDataUpdate)
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setErrorMsg(null)

      const [
        tasksRes,
        goalsRes,
        habitsRes,
        suggestionsRes,
        chatRes,
        activityRes
      ] = await Promise.allSettled([
        api.get('/tasks/'),
        api.get('/goals/'),
        api.get('/habits/'),
        api.get('/suggestions/?undismissed_only=true&limit=5'),
        api.get('/chat-sessions/'),
        api.get('/activity/?limit=50')
      ])

      const fetchedTasks: Task[] = tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value?.data) ? tasksRes.value.data : []
      setTasks(fetchedTasks)

      const fetchedGoals: Goal[] = goalsRes.status === 'fulfilled' && Array.isArray(goalsRes.value?.data) ? goalsRes.value.data : []
      setGoals(fetchedGoals)

      const fetchedHabits = habitsRes.status === 'fulfilled' && Array.isArray(habitsRes.value?.data) ? habitsRes.value.data : []
      const maxStreak = fetchedHabits.length > 0 ? Math.max(...fetchedHabits.map((h: any) => h.streak_count || 0)) : 0
      setHabitsStreak(maxStreak)

      const fetchedSuggestions = suggestionsRes.status === 'fulfilled' && Array.isArray(suggestionsRes.value?.data) ? suggestionsRes.value.data : []
      setDashboardSuggestions(fetchedSuggestions)

      const chats = chatRes.status === 'fulfilled' && Array.isArray(chatRes.value?.data) ? chatRes.value.data : []

      const totalTasks = fetchedTasks.length
      const completedTasks = fetchedTasks.filter((t) => t.status === 'completed').length
      const totalGoals = fetchedGoals.length
      const activeGoals = fetchedGoals.filter((g) => g.status === 'in_progress').length
      const recentChats = chats.length

      setStats({
        totalTasks,
        completedTasks,
        totalGoals,
        activeGoals,
        recentChats,
      })

      const rawLogs = activityRes.status === 'fulfilled' && Array.isArray(activityRes.value?.data) ? activityRes.value.data : []
      const groupedMap = new Map<string, { agent: string; time: string; descriptions: string[] }>()
      rawLogs.forEach((log: any) => {
        const key = log.related_conversation_id ? `conv_${log.related_conversation_id}` : `log_${log.id}`
        const timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            agent: log.agent_name || 'System',
            time: timeStr,
            descriptions: []
          })
        }
        groupedMap.get(key)?.descriptions.push(log.action_description)
      })

      const groups: ActivityGroup[] = Array.from(groupedMap.entries()).map(([key, value]) => {
        const theme = getAgentTheme(value.agent)
        const count = value.descriptions.length

        let summary = value.descriptions[0] || `${theme.name} performed an action`
        if (count > 1) {
          const taskLogs = value.descriptions.filter(d => d.toLowerCase().includes('created task:'))
          const goalLog = value.descriptions.find(d => d.toLowerCase().includes('created goal:'))

          let goalTitle = ''
          if (goalLog) {
            const match = goalLog.match(/'([^']+)'/)
            if (match) goalTitle = match[1]
          }

          if (taskLogs.length > 0 && goalTitle) {
            summary = `${theme.name} created ${taskLogs.length} tasks for '${goalTitle}'`
          } else if (taskLogs.length > 0) {
            summary = `${theme.name} created ${taskLogs.length} tasks`
          } else {
            summary = `${theme.name} executed ${count} automated actions`
          }
        }

        return {
          id: key,
          agentName: theme.name,
          agentIcon: Bot,
          badgeColor: theme.badge,
          actionSummary: summary,
          timeAgo: value.time,
          items: value.descriptions
        }
      })

      setActivityGroups(groups)
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      setErrorMsg("LifeOS couldn't fetch your dashboard data. Check your backend server and retry.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleGroupExpand = (id: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      await api.put(`/tasks/${taskId}`, { status: newStatus })
      fetchDashboardData()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (err) {
      console.error('Failed to toggle task status from dashboard:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  // Pending tasks queue for auto-advancing next task focus
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.id - b.id
  })
  const currentNextTask = sortedPendingTasks[0] || null

  const filteredTasks = tasks.filter((task) => {
    if (activeTaskTab === 'all') return true
    if (!task.due_date) return activeTaskTab === 'week' || activeTaskTab === 'today'
    const due = new Date(task.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday = due.toDateString() === today.toDateString()
    if (activeTaskTab === 'today') return isToday
    return true
  })

  // Sort Tasks Schedule items so pending tasks appear first (ordered by due date / creation), followed by completed items
  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    const aPending = a.status === 'pending' || a.status === 'in_progress' ? 0 : 1
    const bPending = b.status === 'pending' || b.status === 'in_progress' ? 0 : 1
    if (aPending !== bPending) return aPending - bPending

    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.id - b.id
  })

  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-50/70 p-6 space-y-6 max-w-7xl mx-auto'>
        <div className='flex items-center justify-between pb-4 border-b border-slate-200'>
          <div className='h-8 bg-slate-200 rounded w-48 animate-pulse' />
          <div className='h-8 bg-slate-200 rounded w-32 animate-pulse' />
        </div>
        <SkeletonCard rows={2} />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center p-6'>
        <ErrorState
          title="LifeOS couldn't fetch your dashboard"
          message={errorMsg}
          onRetry={fetchDashboardData}
        />
      </div>
    )
  }

  return (
    <div className='space-y-6 w-full max-w-full transition-colors duration-300'>
      {/* 1. COMPACT TOP APP BAR / BRAND HEADER */}
      <header className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 dark:border-slate-800'>
        <div className='flex items-center space-x-3 shrink-0'>
          <img src="/logo.png" alt="Redora AI Logo" className='w-9 h-9 rounded-xl object-contain bg-slate-900 shadow-md border border-indigo-500/20' />
          <div>
            <h1 className='text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-none'>Redora AI</h1>
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium'>Personal AI Executive Assistant</p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate('/tasks')}
              className='p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-all border border-slate-200/80 dark:border-slate-700 shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center'
              title='Tasks Shortcut'
            >
              <CheckSquare className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
            </button>
            <button
              onClick={() => navigate('/goals')}
              className='p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-all border border-slate-200/80 dark:border-slate-700 shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center'
              title='Goals Shortcut'
            >
              <Target className='w-4 h-4 text-purple-600 dark:text-purple-400' />
            </button>
          </div>
          
          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate('/chat')}
              className='inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm shadow-indigo-600/20 min-h-[40px]'
            >
              <Bot className='w-4 h-4' />
              <span>Ask AI Agents</span>
            </button>
            <button
              onClick={handleLogout}
              className='p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center'
              title='Sign Out'
            >
              <LogOut className='w-4.5 h-4.5' />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 w-full max-w-full overflow-x-hidden pb-28'>

        {/* 1. MERGED HERO CARD (State of Your Life + Daily Digest combined) */}
        <LifeStateCard
          completedTasksCount={stats.completedTasks}
          totalTasksCount={stats.totalTasks}
          activeGoalsCount={stats.activeGoals}
          totalGoalsCount={stats.totalGoals}
          habitsStreak={habitsStreak}
          topPriorityGoal={goals[0]?.title || ''}
          dueTasksCount={tasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString()).length}
          topSuggestion={dashboardSuggestions[0]?.title || ''}
          currentNextTaskTitle={currentNextTask?.title || ''}
          pendingTasksCount={pendingTasks.length}
        />

        {/* 2. PROMINENT AI AUTOMATION FEED (Moved right after Hero for instant proof of AI work) */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-md space-y-4 transition-colors duration-200'>
          <div className='flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5'>
            <div className='flex items-center gap-2.5'>
              <div className='p-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400'>
                <Activity className='w-4 h-4' />
              </div>
              <div>
                <h2 className='text-base font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
                  <span>AI Automation Feed</span>
                  <span className='text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold'>
                    ⚡ AI Active
                  </span>
                </h2>
                <p className='text-xs text-slate-500 dark:text-slate-400 font-sans'>
                  Real-time actions executed by Redora AI agents for your goals
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className='text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0'
            >
              <span>Full Log</span>
              <ExternalLink className='w-3 h-3' />
            </button>
          </div>

          <div className='space-y-3'>
            {activityGroups.length === 0 ? (
              <div className='text-center py-6 text-slate-400 dark:text-slate-500 text-xs'>No recent agent batch activity.</div>
            ) : (
              activityGroups.slice(0, 3).map((group) => {
                const isExpanded = expandedGroupIds.has(group.id)
                return (
                  <div key={group.id} className='bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs transition-all'>
                    <div
                      onClick={() => toggleGroupExpand(group.id)}
                      className='p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors'
                    >
                      <div className='flex items-center gap-3 min-w-0'>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${group.badgeColor}`}>
                          {group.agentName}
                        </span>
                        <span className='font-semibold text-slate-800 dark:text-slate-200 truncate'>{group.actionSummary}</span>
                      </div>
                      <div className='flex items-center gap-2 text-slate-400 dark:text-slate-500 shrink-0'>
                        <span className='text-[11px]'>{group.timeAgo}</span>
                        {group.items.length > 1 && (
                          <button className='p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'>
                            {isExpanded ? <ChevronUp className='w-3.5 h-3.5' /> : <ChevronDown className='w-3.5 h-3.5' />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable List underneath for multi-action batches */}
                    {isExpanded && group.items.length > 1 && (
                      <div className='px-4 pb-3 pt-1 border-t border-slate-200/50 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-1 text-slate-600 dark:text-slate-400'>
                        {group.items.map((item, idx) => (
                          <div key={idx} className='flex items-center gap-2 text-[11px] py-0.5'>
                            <span className='w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0' />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 3. TASKS SCHEDULE & ACTIVE GOALS (Side by Side) */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Tasks Schedule */}
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col transition-colors duration-200'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-base font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
                <CheckSquare className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
                <span>Tasks Schedule</span>
              </h2>
              <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs'>
                <button
                  onClick={() => setActiveTaskTab('today')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTaskTab === 'today' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setActiveTaskTab('week')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTaskTab === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setActiveTaskTab('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTaskTab === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  All
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1'>
              {sortedFilteredTasks.length === 0 || (activeTaskTab !== 'all' && sortedFilteredTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length === 0) ? (
                <div className='text-center py-8 px-4 bg-slate-50/60 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2 my-auto'>
                  <CheckCircle2 className='w-7 h-7 text-emerald-500 mx-auto' />
                  <h4 className='font-serif font-bold text-sm text-slate-900 dark:text-slate-100'>All caught up! 🎉</h4>
                  <p className='text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-sans leading-relaxed'>
                    No pending tasks remaining. Add a new task or ask Redora AI to generate action items!
                  </p>
                </div>
              ) : (
                sortedFilteredTasks.map((task) => (
                  <div key={task.id} className='p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs transition-colors'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className='p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0'
                        title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                      >
                        <CheckCircle2 className={`w-4 h-4 transition-colors ${task.status === 'completed' ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'}`} />
                      </button>
                      <span className={`truncate font-medium ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                      </span>
                    </div>
                    {task.due_date && (
                      <span className='text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-sans'>
                        {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => navigate('/tasks')}
              className='mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center justify-center gap-1 transition-colors'
            >
              <span>Manage All Tasks</span>
              <ArrowRight className='w-3.5 h-3.5' />
            </button>
          </div>

          {/* Active Goals */}
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col transition-colors duration-200'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-base font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
                <Target className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                <span>Active Goals</span>
              </h2>
              <button
                onClick={() => navigate('/goals')}
                className='text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700'
              >
                View All
              </button>
            </div>

            <div className='flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1'>
              {goals.length === 0 ? (
                <div className='text-center py-8 text-slate-400 text-xs'>No active goals set yet.</div>
              ) : (
                goals.map((goal) => (
                  <div key={goal.id} className='p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-xs text-slate-900 dark:text-slate-100 truncate'>{goal.title}</span>
                      <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 uppercase tracking-wider shrink-0'>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                    {goal.description && (
                      <p className='text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed'>{goal.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => navigate('/goals')}
              className='mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center justify-center gap-1 transition-colors'
            >
              <span>Manage Goals & Resources</span>
              <ArrowRight className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>

        {/* 4. SUGGESTED FOR YOU PANEL (Collapsed to 2, expandable) */}
        {dashboardSuggestions.length > 0 && (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors duration-200'>
            <SuggestionsList suggestions={dashboardSuggestions} title="Suggested for You (Agent Insights)" initialLimit={2} />
          </div>
        )}

        {/* COLLAPSIBLE SECTION 1: DAILY HABITS & STREAKS */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200'>
          <button
            onClick={() => setIsHabitsOpen(!isHabitsOpen)}
            className='w-full p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors'
          >
            <div className='flex items-center gap-2 text-sm font-serif font-bold text-slate-900 dark:text-slate-100'>
              <Layers className='w-4 h-4 text-amber-500' />
              <span>Daily Habits & Streaks</span>
            </div>
            <div className='flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400'>
              <span>{isHabitsOpen ? 'Collapse' : 'Expand'}</span>
              {isHabitsOpen ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
            </div>
          </button>
          {isHabitsOpen && (
            <div className='p-6 pt-0 border-t border-slate-100 dark:border-slate-800'>
              <HabitsSection />
            </div>
          )}
        </div>

        {/* COLLAPSIBLE SECTION 2: WHAT LIFEOS REMEMBERS ABOUT YOU (MEMORY) */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200'>
          <button
            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
            className='w-full p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors'
          >
            <div className='flex items-center gap-2 text-sm font-serif font-bold text-slate-900 dark:text-slate-100'>
              <Brain className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
              <span>What LifeOS remembers about you</span>
            </div>
            <div className='flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400'>
              <span>{isMemoryOpen ? 'Collapse' : 'Expand'}</span>
              {isMemoryOpen ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
            </div>
          </button>
          {isMemoryOpen && (
            <div className='p-6 pt-0 border-t border-slate-100 dark:border-slate-800'>
              <MemoryPanel />
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

export default Dashboard
