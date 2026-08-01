import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity } from 'lucide-react'
import api from '../lib/api'
import { getAgentTheme } from '../lib/agentTheme'
import { ThemeToggle } from '../components/ui/ThemeToggle'


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
  const navigate = useNavigate()

  useEffect(() => {
    const fetchAllActivities = async () => {
      try {
        const response = await api.get('/activity/?limit=100')
        setActivities(response.data || [])
      } catch (error) {
        console.error('Failed to fetch activity logs:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAllActivities()
  }, [])



  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <div className='min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 w-full max-w-full overflow-x-hidden transition-colors duration-200'>
      <header className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-10 shadow-sm transition-colors duration-200'>
        <div className='max-w-4xl mx-auto flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3 min-w-0'>
            <button
              onClick={() => navigate('/')}
              className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium min-h-[44px] min-w-[44px]'
            >
              <ArrowLeft className='w-4 h-4' /> <span className='hidden sm:inline'>Back to Dashboard</span>
            </button>
            <h1 className='text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate'>
              <Activity className='w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0' />
              <span className='truncate'>Activity Log</span>
            </h1>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-medium shrink-0 min-h-[44px] px-2'
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 w-full'>
        {isLoading ? (
          <div className='text-center py-12 text-slate-500'>Loading activity logs...</div>
        ) : activities.length === 0 ? (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm transition-colors duration-200'>
            <p className='text-slate-500 dark:text-slate-400 text-sm'>No activity recorded yet.</p>
          </div>
        ) : (
          activities.map((act) => {
            const theme = getAgentTheme(act.agent_name)
            return (
              <div
                key={act.id}
                className='bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 transition-colors duration-200'
              >
                <div className='flex items-center gap-3'>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${theme.badge}`}>
                    {theme.name}
                  </span>
                  <span className='text-sm text-slate-800 dark:text-slate-200 font-medium'>{act.action_description}</span>
                </div>
                <div className='text-xs text-slate-400 shrink-0'>
                  {new Date(act.created_at).toLocaleString()}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
