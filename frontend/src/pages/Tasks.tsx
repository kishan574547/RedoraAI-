import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckSquare, Bot, ExternalLink, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { getAgentTheme } from '../lib/agentTheme'
import { CalendarConfirmModal } from '../components/ui/CalendarConfirmModal'

interface Task {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string
  created_by_agent?: string
  conversation_id?: number
  google_calendar_event_id?: string
  calendar_synced?: string
  created_at: string
}

function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [calendarModalTask, setCalendarModalTask] = useState<Task | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTasks()

    const handleUpdate = () => {
      fetchTasks()
    }
    window.addEventListener('lifeos_data_updated', handleUpdate)
    return () => {
      window.removeEventListener('lifeos_data_updated', handleUpdate)
    }
  }, [])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/tasks/')
      setTasks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSchedule = async (startTime: string, durationMinutes: number) => {
    if (!calendarModalTask) return
    try {
      const res = await api.post(`/tasks/${calendarModalTask.id}/sync-calendar?start_time=${startTime}&duration=${durationMinutes}`)
      if (res.data?.calendar_launch_url) {
        window.open(res.data.calendar_launch_url, '_blank')
      }
      fetchTasks()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (err) {
      console.error('Failed to sync calendar:', err)
    } finally {
      setCalendarModalTask(null)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setIsCreating(true)
    try {
      await api.post('/tasks/', {
        title: newTaskTitle,
        due_date: newTaskDueDate || null,
        status: 'pending',
      })
      setNewTaskTitle('')
      setNewTaskDueDate('')
      fetchTasks()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateStatus = async (taskId: number, newStatus: Task['status']) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus })
      fetchTasks()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.delete(`/tasks/${taskId}`)
      fetchTasks()
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }



  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-slate-600'>Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className='space-y-6 w-full max-w-full font-sans transition-colors duration-200'>
      <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex items-center justify-between gap-3 shadow-sm transition-colors duration-200'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            onClick={() => navigate('/')}
            className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium min-h-[44px] min-w-[44px]'
          >
            <ArrowLeft className='w-4 h-4' /> <span className='hidden sm:inline'>Back to Dashboard</span>
          </button>
          <h1 className='text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 truncate'>Tasks Management</h1>
        </div>
      </div>

      <div className='space-y-6 w-full'>
        <div className='bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200'>
          <h2 className='text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4'>Create New Task</h2>
          <form onSubmit={handleCreateTask} className='space-y-4'>
            <div>
              <label className='block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1'>Task Title</label>
              <input
                type='text'
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder='Enter task title...'
                className='w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm'
                required
              />
            </div>
            <div>
              <label className='block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1'>Due Date (optional)</label>
              <input
                type='date'
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className='w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm'
              />
            </div>
            <button
              type='submit'
              disabled={isCreating || !newTaskTitle.trim()}
              className='bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-sm min-h-[44px] w-full sm:w-auto'
            >
              {isCreating ? 'Creating...' : 'Add Task'}
            </button>
          </form>
        </div>

        <div className='space-y-3'>
          {tasks.length === 0 ? (
            <div className='bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm transition-colors duration-200'>
              <CheckSquare className='w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3' />
              <h3 className='text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-1'>
                No tasks yet
              </h3>
              <p className='text-slate-500 dark:text-slate-400 text-sm'>
                Create a task above or ask an AI Agent in Chat to generate a plan.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className='bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <h3 className='font-semibold text-slate-900 dark:text-slate-100 text-base'>{task.title}</h3>
                    <div className='flex flex-wrap items-center gap-3 mt-1.5'>
                      {task.due_date && (
                        <span className='text-xs text-slate-500'>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      
                      {/* Bi-directional Link Tag: Agent Tag pointing to Conversation */}
                      {task.created_by_agent && (() => {
                        const theme = getAgentTheme(task.created_by_agent)
                        return (
                          <button
                            onClick={() => navigate('/chat')}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${theme.badge}`}
                            title='Click to view original conversation in Chat'
                          >
                            <Bot className={`w-3 h-3 ${theme.iconColor}`} />
                            <span>created by {theme.name}</span>
                            <ExternalLink className='w-3 h-3 ml-0.5 opacity-70' />
                          </button>
                        )
                      })()}
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => {
                        if (task.calendar_synced === "true") {
                          const reSync = window.confirm(`'${task.title}' is already scheduled in Google Calendar. Would you like to reschedule or modify event time blocks?`)
                          if (!reSync) return
                        }
                        setCalendarModalTask(task)
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        task.calendar_synced === "true"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-slate-200"
                      }`}
                      title="Schedule event into your Google Calendar with explicit approval"
                    >
                      {task.calendar_synced === "true" ? "📅 Synced in Google Calendar" : "📆 Schedule in Google Calendar"}
                    </button>

                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value as Task['status'])}
                      className={'px-3 py-1 rounded-full text-xs font-semibold border ' + getStatusColor(task.status)}
                    >
                      <option value='pending'>Pending</option>
                      <option value='in_progress'>In Progress</option>
                      <option value='completed'>Completed</option>
                      <option value='cancelled'>Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className='text-slate-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-slate-100'
                      title='Delete task'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendar Confirmation Modal */}
      {calendarModalTask && (
        <CalendarConfirmModal
          isOpen={!!calendarModalTask}
          taskTitle={calendarModalTask.title}
          dueDate={calendarModalTask.due_date}
          onClose={() => setCalendarModalTask(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}
    </div>
  )
}

export default Tasks
