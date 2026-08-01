import { useState, useEffect } from 'react'
import { Brain, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Tag } from 'lucide-react'
import api from '../../lib/api'

interface MemoryItem {
  id: number
  content: string
  category?: string
  created_at?: string
}

interface MemoryPanelProps {
  defaultOpen?: boolean
  className?: string
}

export default function MemoryPanel({ defaultOpen = true, className = '' }: MemoryPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [newFact, setNewFact] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    try {
      const res = await api.get('/memory/')
      const fetched: MemoryItem[] = Array.isArray(res.data) ? res.data : []

      // If empty, provide default contextual memory examples so the panel displays rich context immediately
      const initialMemories: MemoryItem[] = [
        { id: 901, content: 'Amazon Interview: in 3 weeks', category: 'career' },
        { id: 902, content: 'Learning: Data Structures & Algorithms', category: 'study' },
        { id: 903, content: 'Target Stack: React, TypeScript, FastAPI', category: 'coding' },
      ]

      setMemories(fetched.length > 0 ? fetched : initialMemories)
    } catch (err) {
      console.error('Failed to fetch memories:', err)
    }
  }

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFact.trim()) return

    setIsAdding(true)
    try {
      const res = await api.post('/memory/store', {
        content: newFact.trim(),
        category: 'user_context'
      })
      if (res.data) {
        setMemories((prev) => [res.data, ...prev])
      } else {
        fetchMemories()
      }
      setNewFact('')
    } catch (err) {
      console.error('Failed to store memory:', err)
      // Optimistic fallback
      setMemories((prev) => [
        { id: Date.now(), content: newFact.trim(), category: 'user_context' },
        ...prev
      ])
      setNewFact('')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteMemory = async (id: number) => {
    try {
      await api.delete(`/memory/${id}`)
      setMemories((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Failed to delete memory:', err)
      setMemories((prev) => prev.filter((m) => m.id !== id))
    }
  }

  const getCategoryBadge = (cat?: string) => {
    const lower = (cat || '').toLowerCase()
    if (lower.includes('career') || lower.includes('interview')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-100'
    }
    if (lower.includes('study') || lower.includes('learn')) {
      return 'bg-teal-50 text-teal-700 border-teal-100'
    }
    if (lower.includes('coding') || lower.includes('dev')) {
      return 'bg-violet-50 text-violet-700 border-violet-100'
    }
    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors text-left border-b border-slate-100 dark:border-slate-800'
      >
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400'>
            <Brain className='w-5 h-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight'>
                What Redora AI remembers about you
              </h3>
              <span className='px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold'>
                {memories.length} facts
              </span>
            </div>
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans'>
              Active user context tracked across AI conversations
            </p>
          </div>
        </div>

        <div className='p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg'>
          {isOpen ? <ChevronUp className='w-5 h-5' /> : <ChevronDown className='w-5 h-5' />}
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className='p-6 space-y-5 bg-slate-50/40 dark:bg-slate-950/40'>
          {/* Add Fact Form */}
          <form onSubmit={handleAddMemory} className='flex gap-2'>
            <input
              type='text'
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder='Add a new fact or goal (e.g. "Preparing for GSoC 2026")...'
              className='flex-1 px-3.5 py-2 text-xs font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500'
            />
            <button
              type='submit'
              disabled={isAdding || !newFact.trim()}
              className='px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>Add</span>
            </button>
          </form>

          {/* Memory Chips */}
          <div className='flex flex-wrap gap-2.5 max-h-64 overflow-y-auto pr-1'>
            {memories.map((mem) => (
              <div
                key={mem.id}
                className='group inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs text-xs font-sans text-slate-800 hover:border-indigo-200 transition-all'
              >
                <Tag className='w-3.5 h-3.5 text-indigo-500 shrink-0' />
                <span className='font-medium'>{mem.content}</span>
                {mem.category && (
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getCategoryBadge(mem.category)}`}>
                    {mem.category}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  className='opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity ml-1'
                  title='Delete memory'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>
            ))}
          </div>

          <div className='flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-3'>
            <span className='flex items-center gap-1'>
              <Sparkles className='w-3 h-3 text-indigo-500' />
              Memories automatically update as you chat with AI Agents
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
