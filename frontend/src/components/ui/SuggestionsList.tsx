import { useState } from 'react'
import { 
  BookOpen, 
  HelpCircle, 
  Lightbulb, 
  Wrench, 
  ArrowRight, 
  X, 
  ExternalLink,
  Sparkles
} from 'lucide-react'
import api from '../../lib/api'

export interface SuggestionItem {
  id: number
  agent_name: string
  type: string // "resource" | "practice_question" | "tip" | "tool" | "next_step"
  title: string
  description?: string
  link?: string
  dismissed?: boolean
}

interface SuggestionsListProps {
  suggestions: SuggestionItem[]
  title?: string
  onDismiss?: (id: number) => void
  compact?: boolean
  initialLimit?: number
}

export function SuggestionsList({ suggestions, title = 'Proactive AI Suggestions', onDismiss, compact = false, initialLimit = 4 }: SuggestionsListProps) {
  const [items, setItems] = useState<SuggestionItem[]>(suggestions)
  const [showAll, setShowAll] = useState(false)

  const handleDismiss = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.patch(`/suggestions/${id}`, { dismissed: true })
      setItems((prev) => prev.filter((item) => item.id !== id))
      if (onDismiss) onDismiss(id)
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'resource':
        return {
          label: 'Resource',
          icon: BookOpen,
          style: 'bg-blue-50 text-blue-700 border-blue-200'
        }
      case 'practice_question':
        return {
          label: 'Practice Q&A',
          icon: HelpCircle,
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }
      case 'tip':
        return {
          label: 'Pro Tip',
          icon: Lightbulb,
          style: 'bg-amber-50 text-amber-700 border-amber-200'
        }
      case 'tool':
        return {
          label: 'Tool',
          icon: Wrench,
          style: 'bg-purple-50 text-purple-700 border-purple-200'
        }
      default:
        return {
          label: 'Next Step',
          icon: ArrowRight,
          style: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }
    }
  }

  const activeItems = items.filter((i) => !i.dismissed)

  if (activeItems.length === 0) return null

  const displayedItems = initialLimit && !showAll ? activeItems.slice(0, initialLimit) : activeItems
  const hasMore = initialLimit ? activeItems.length > initialLimit : false

  return (
    <div className='space-y-3'>
      {title && (
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500'>
            <Sparkles className='w-3.5 h-3.5 text-indigo-600' />
            <span>{title}</span>
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className='text-xs text-indigo-600 font-semibold hover:text-indigo-700'
            >
              {showAll ? 'Show less' : `Show more (${activeItems.length - initialLimit} more)`}
            </button>
          )}
        </div>
      )}

      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
        {displayedItems.map((item) => {
          const typeBadge = getTypeBadge(item.type)
          const Icon = typeBadge.icon

          return (
            <div
              key={item.id}
              className='relative p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-all flex flex-col justify-between space-y-2 text-xs group'
            >
              <div className='flex items-start justify-between gap-2'>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${typeBadge.style}`}>
                  <Icon className='w-3 h-3' />
                  <span>{typeBadge.label}</span>
                </span>
                <button
                  onClick={(e) => handleDismiss(item.id, e)}
                  className='text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded'
                  title='Dismiss'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>

              <div>
                <h4 className='font-bold text-slate-900 group-hover:text-indigo-600 transition-colors'>{item.title}</h4>
                {item.description && <p className='text-slate-600 mt-1 line-clamp-2 leading-relaxed'>{item.description}</p>}
              </div>

              {item.link && (
                <a
                  href={item.link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 text-[11px] pt-1'
                >
                  <span>View Resource</span>
                  <ExternalLink className='w-3 h-3' />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
