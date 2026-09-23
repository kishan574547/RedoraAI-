import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Activity, 
  User as UserIcon, 
  Bot, 
  Search, 
  CheckCircle2, 
  Target, 
  Flame, 
  Calendar,
  FileText
} from 'lucide-react'
import api from '../lib/api'
import { getAgentTheme } from '../lib/agentTheme'

interface ActivityItem {
  id: number
  agent_name: string
  action_description: string
  related_task_id?: number
  related_goal_id?: number
  related_conversation_id?: number
  created_at: string
}

export default function FullActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<'all' | 'user' | 'agent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchAllActivities()
  }, [])

  const fetchAllActivities = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/activity/?limit=150')
      setActivities(response.data || [])
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredActivities = activities.filter((act) => {
    const isUserAction = (act.agent_name || '').toLowerCase() === 'user' || (act.agent_name || '').toLowerCase() === 'you'
    if (filterTab === 'user' && !isUserAction) return false
    if (filterTab === 'agent' && isUserAction) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const descMatch = act.action_description.toLowerCase().includes(q)
      const agentMatch = (act.agent_name || '').toLowerCase().includes(q)
      return descMatch || agentMatch
    }
    return true
  })

  const getActivityIcon = (act: ActivityItem, isUser: boolean) => {
    const desc = act.action_description.toLowerCase()
    if (desc.includes('habit') || desc.includes('streak')) return <Flame className='w-4 h-4 text-amber-500' />
    if (desc.includes('task')) return <CheckCircle2 className='w-4 h-4 text-indigo-500' />
    if (desc.includes('goal')) return <Target className='w-4 h-4 text-purple-500' />
    if (desc.includes('calendar')) return <Calendar className='w-4 h-4 text-blue-500' />
    if (desc.includes('resume') || desc.includes('cover letter') || desc.includes('interview')) return <FileText className='w-4 h-4 text-emerald-500' />
    if (isUser) return <UserIcon className='w-4 h-4 text-slate-500' />
    return <Bot className='w-4 h-4 text-indigo-500' />
  }

  return (
    <div className='space-y-6 w-full max-w-full font-sans transition-colors duration-200'>
      {/* Header Bar */}
      <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-colors duration-200'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            onClick={() => navigate('/')}
            className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium min-h-[40px] px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800'
          >
            <ArrowLeft className='w-4 h-4' /> <span className='hidden sm:inline'>Dashboard</span>
          </button>
          <div className='h-5 w-px bg-slate-200 dark:bg-slate-800' />
          <h1 className='text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate'>
            <Activity className='w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0' />
            <span className='truncate'>Activity History</span>
          </h1>
        </div>

        {/* Filter Tabs */}
        <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs w-full sm:w-auto'>
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Logs ({activities.length})
          </button>
          <button
            onClick={() => setFilterTab('user')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              filterTab === 'user'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Your Actions
          </button>
          <button
            onClick={() => setFilterTab('agent')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              filterTab === 'agent'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            AI Automations
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className='relative w-full'>
        <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
        <input
          type='text'
          placeholder='Search activity logs by action or agent name...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs transition-all'
        />
      </div>

      {/* Activities List */}
      <div className='space-y-3 w-full pb-20'>
        {isLoading ? (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs text-slate-500 text-sm'>
            Loading activity history...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs space-y-2'>
            <Activity className='w-8 h-8 text-slate-400 mx-auto' />
            <h3 className='font-serif font-bold text-sm text-slate-900 dark:text-slate-100'>No activity found</h3>
            <p className='text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto'>
              {searchQuery ? 'No matching logs for your search query.' : 'No activity recorded in this category yet.'}
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const theme = getAgentTheme(act.agent_name)
            const isUser = Boolean(theme.isUser)
            const icon = getActivityIcon(act, isUser)
            const dateObj = new Date(act.created_at)
            const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={act.id}
                className='bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0'>
                    {icon}
                  </div>
                  <div className='min-w-0 space-y-0.5'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.badge}`}>
                        {theme.name}
                      </span>
                      <span className='text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold break-words'>
                        {act.action_description}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='text-[11px] text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1 sm:self-center self-end'>
                  <span>{formattedDate}</span>
                  <span>•</span>
                  <span>{formattedTime}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

