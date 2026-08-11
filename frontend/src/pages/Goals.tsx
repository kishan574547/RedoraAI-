import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Target, 
  Trash2, 
  Bot, 
  ExternalLink, 
  BookOpen, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react'
import { SuggestionsList, SuggestionItem } from '../components/ui/SuggestionsList'
import { getAgentTheme } from '../lib/agentTheme'
import { GoalRoadmapTimeline } from '../components/goals/GoalRoadmapTimeline'
import api from '../lib/api'


interface ResourceLink {
  id: number
  goal_id: number
  title: string
  description?: string
  url?: string
}

interface PracticeQuestion {
  id: number
  goal_id: number
  question: string
  answer: string
}

interface Goal {
  id: number
  title: string
  description?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  target_date?: string
  created_by_agent?: string
  conversation_id?: number
  is_template?: string
  created_at: string
  resources?: ResourceLink[]
  practice_questions?: PracticeQuestion[]
  suggestions?: SuggestionItem[]
}

function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('')
  
  // View Mode: list vs visual timeline roadmap
  const [viewMode, setViewMode] = useState<'list' | 'roadmap'>('list')
  const [expandedQAIds, setExpandedQAIds] = useState<Set<number>>(new Set())

  const navigate = useNavigate()

  useEffect(() => {
    fetchGoals()

    const handleUpdate = () => {
      fetchGoals()
    }
    window.addEventListener('lifeos_data_updated', handleUpdate)
    return () => {
      window.removeEventListener('lifeos_data_updated', handleUpdate)
    }
  }, [])

  const fetchGoals = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/goals/')
      const fetchedGoals: Goal[] = Array.isArray(response.data) ? response.data : []
      
      let allSuggestions: SuggestionItem[] = []
      try {
        const suggestionsResponse = await api.get('/suggestions/?undismissed_only=true')
        allSuggestions = Array.isArray(suggestionsResponse.data) ? suggestionsResponse.data : []
      } catch (err) {
        console.warn('Could not load suggestions for goals:', err)
      }

      const updatedGoals = fetchedGoals.map((g) => ({
        ...g,
        suggestions: allSuggestions.filter((s: any) => s.related_goal_id === g.id)
      }))

      setGoals(updatedGoals)
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalTitle.trim()) return

    setIsCreating(true)
    try {
      await api.post('/goals/', {
        title: newGoalTitle,
        description: newGoalDescription || null,
        target_date: newGoalTargetDate || null,
        status: 'not_started',
      })
      setNewGoalTitle('')
      setNewGoalDescription('')
      setNewGoalTargetDate('')
      fetchGoals()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to create goal:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateStatus = async (goalId: number, newStatus: Goal['status']) => {
    try {
      await api.put(`/goals/${goalId}`, { status: newStatus })
      fetchGoals()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const handleDeleteGoal = async (goalId: number) => {
    try {
      await api.delete(`/goals/${goalId}`)
      fetchGoals()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const toggleQA = (qaId: number) => {
    setExpandedQAIds((prev) => {
      const next = new Set(prev)
      if (next.has(qaId)) next.delete(qaId)
      else next.add(qaId)
      return next
    })
  }



  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'on_hold':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-50'>
        <div className='text-slate-600 font-medium'>Loading goals & resources...</div>
      </div>
    )
  }

  return (
    <div className='space-y-6 w-full max-w-full font-sans transition-colors duration-200'>
      <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-colors duration-200'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            onClick={() => navigate('/')}
            className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium min-h-[44px] min-w-[44px]'
          >
            <ArrowLeft className='w-4 h-4' /> <span className='hidden sm:inline'>Back to Dashboard</span>
          </button>
          <h1 className='text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 truncate'>Goals & Learning Hub</h1>
        </div>
        
        <div className='flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end'>
          <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs'>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg font-semibold transition-all min-h-[38px] ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('roadmap')}
              className={`px-3 py-2 rounded-lg font-semibold transition-all min-h-[38px] ${viewMode === 'roadmap' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Roadmap Timeline
            </button>
          </div>
        </div>
      </div>

      <div className='space-y-6 w-full'>
        {/* Create Goal Form */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200'>
          <h2 className='text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4'>Create New Goal</h2>
          <form onSubmit={handleCreateGoal} className='space-y-4'>
            <div>
              <label className='block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1'>Goal Title</label>
              <input
                type='text'
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder='e.g. Secure Placement in Product Company...'
                className='w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm'
                required
              />
            </div>
            <div>
              <label className='block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1'>Description (optional)</label>
              <textarea
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder='Describe your target...'
                rows={2}
                className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm'
              />
            </div>
            <button
              type='submit'
              disabled={isCreating || !newGoalTitle.trim()}
              className='bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm'
            >
              {isCreating ? 'Creating...' : 'Add Goal'}
            </button>
          </form>
        </div>

        {/* Goals List / Roadmap View */}
        <div className='space-y-6'>
          {viewMode === 'roadmap' && goals.length > 0 ? (
            goals.map((goal) => (
              <GoalRoadmapTimeline
                key={goal.id}
                goalTitle={goal.title}
                goalDescription={goal.description}
                targetDate={goal.target_date}
                milestones={[
                  { id: '1', title: 'Goal Roadmap Initiated', date: 'Phase 1', status: 'completed' },
                  { id: '2', title: 'Curated 6 Recommended Resources', date: 'Phase 2', status: 'completed' },
                  { id: '3', title: 'System Design & DSA Prep', date: 'Phase 3', status: 'in_progress' },
                  { id: '4', title: 'Final Placement Evaluation', date: 'Phase 4', status: 'upcoming' },
                ]}
              />
            ))
          ) : goals.length === 0 ? (
            <div className='bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm transition-colors duration-200'>
              <Target className='w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3' />
              <h3 className='text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-1'>No goals set yet</h3>
              <p className='text-slate-500 dark:text-slate-400 text-sm'>
                Ask an AI Agent in Chat to generate a roadmap, resources, and practice questions for campus placement or software engineering!
              </p>
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className='bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-200'>
                {/* Header */}
                <div className='flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4'>
                  <div>
                    <h3 className='font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2'>
                      <Target className='w-5 h-5 text-purple-600' />
                      <span>{goal.title}</span>
                      {goal.is_template === "true" && (
                        <span className='text-[10px] uppercase font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full'>
                          🌐 Public Template
                        </span>
                      )}
                    </h3>
                    {goal.description && (
                      <p className='text-sm text-slate-600 mt-1 leading-relaxed'>{goal.description}</p>
                    )}
                    {goal.created_by_agent && (() => {
                      const theme = getAgentTheme(goal.created_by_agent)
                      const isMultiAgentGoal = goal.created_by_agent.includes('multi') || goal.description?.toLowerCase().includes('multi-agent') || goal.title.toLowerCase().includes('product company')
                      return (
                        <div className='mt-2 flex items-center gap-2 flex-wrap'>
                          <button
                            onClick={() => navigate('/chat')}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${theme.badge}`}
                          >
                            <Bot className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                            <span>Generated by {theme.name}</span>
                          </button>
                          {isMultiAgentGoal && (
                            <div className='inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 text-indigo-900 border border-indigo-200 rounded-full shadow-xs'>
                              <span>🤝 Multi-Agent Thread Badges:</span>
                              <span className='px-1.5 py-0.5 bg-blue-200/80 text-blue-900 rounded font-medium text-[10px]'>Career</span>
                              <span className='px-1.5 py-0.5 bg-purple-200/80 text-purple-900 rounded font-medium text-[10px]'>Study</span>
                              <span className='px-1.5 py-0.5 bg-orange-200/80 text-orange-900 rounded font-medium text-[10px]'>Productivity</span>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  <div className='flex items-center gap-2 shrink-0'>
                    <button
                      onClick={async () => {
                        const newTemplateState = goal.is_template === "true" ? "false" : "true"
                        await api.put(`/goals/${goal.id}`, { is_template: newTemplateState })
                        fetchGoals()
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        goal.is_template === "true"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700 border-slate-200"
                      }`}
                      title="Share goal roadmap as a public template for others"
                    >
                      {goal.is_template === "true" ? "🌐 Shared Public Template" : "📤 Share as Template"}
                    </button>
                    <select
                      value={goal.status}
                      onChange={(e) => handleUpdateStatus(goal.id, e.target.value as Goal['status'])}
                      className={'px-3 py-1 rounded-full text-xs font-semibold border ' + getStatusColor(goal.status)}
                    >
                      <option value='not_started'>Not Started</option>
                      <option value='in_progress'>In Progress</option>
                      <option value='on_hold'>On Hold</option>
                      <option value='completed'>Completed</option>
                    </select>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className='text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>

                {/* TWO NEW SECTIONS: RECOMMENDED RESOURCES & PRACTICE QUESTIONS */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-1'>
                  
                  {/* b) Recommended Resources */}
                  <div className='bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3'>
                    <div className='flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider'>
                      <BookOpen className='w-4 h-4 text-blue-600' />
                      <span>Recommended Resources</span>
                    </div>

                    {!goal.resources || goal.resources.length === 0 ? (
                      <p className='text-xs text-slate-400 italic'>No resources generated for this goal yet.</p>
                    ) : (
                      <div className='space-y-2'>
                        {goal.resources.map((res) => (
                          <a
                            key={res.id}
                            href={res.url || '#'}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='block p-2.5 bg-white rounded-lg border border-slate-200/70 hover:border-blue-300 hover:shadow-xs transition-all text-xs group'
                          >
                            <div className='font-bold text-slate-800 group-hover:text-blue-600 flex items-center justify-between'>
                              <span>{res.title}</span>
                              <ExternalLink className='w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600' />
                            </div>
                            {res.description && (
                              <p className='text-slate-500 mt-1 text-[11px] leading-snug'>{res.description}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* c) Practice Questions & Answers */}
                  <div className='bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3'>
                    <div className='flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider'>
                      <HelpCircle className='w-4 h-4 text-emerald-600' />
                      <span>Practice Q&A Set</span>
                    </div>

                    {!goal.practice_questions || goal.practice_questions.length === 0 ? (
                      <p className='text-xs text-slate-400 italic'>No practice questions generated yet.</p>
                    ) : (
                      <div className='space-y-2'>
                        {goal.practice_questions.map((qa) => {
                          const isExpanded = expandedQAIds.has(qa.id)
                          return (
                            <div key={qa.id} className='bg-white rounded-lg border border-slate-200/70 overflow-hidden text-xs'>
                              <button
                                onClick={() => toggleQA(qa.id)}
                                className='w-full p-2.5 text-left font-semibold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors gap-2'
                              >
                                <span className='line-clamp-2'>Q: {qa.question}</span>
                                {isExpanded ? <ChevronUp className='w-4 h-4 text-slate-400 shrink-0' /> : <ChevronDown className='w-4 h-4 text-slate-400 shrink-0' />}
                              </button>
                              {isExpanded && (
                                <div className='p-3 border-t border-slate-100 bg-slate-50/50 text-slate-600 text-[11px] leading-relaxed whitespace-pre-wrap'>
                                  <span className='font-bold text-emerald-700 block mb-1'>Answer & Explanation:</span>
                                  {qa.answer}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Agent Proactive Suggestions for this Goal */}
                {goal.suggestions && goal.suggestions.length > 0 && (
                  <div className='pt-3 border-t border-slate-100'>
                    <SuggestionsList suggestions={goal.suggestions} title="Agent Proactive Suggestions for this Goal" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Goals
