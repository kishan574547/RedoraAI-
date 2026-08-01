import React from 'react'
import { Sun, CheckSquare, Target, Lightbulb, ArrowRight, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DailyDigestProps {
  dueTasksCount: number
  activeGoalTitle?: string
  goalProgressPercent?: number
  topSuggestion?: string
}

export const DailyDigestCard: React.FC<DailyDigestProps> = ({
  dueTasksCount,
  activeGoalTitle,
  goalProgressPercent = 0,
  topSuggestion,
}) => {
  const navigate = useNavigate()
  const todayStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  const goalTitleDisplay = activeGoalTitle ? `${activeGoalTitle} (${goalProgressPercent}%)` : 'No Active Goal'
  const suggestionDisplay = topSuggestion || 'All clear! Add tasks or goals to receive AI recommendations.'

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 dark:from-indigo-950 dark:via-slate-900 dark:to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/30 relative overflow-hidden space-y-4 transition-colors duration-200">
      {/* Background Accent glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-400/10 border border-amber-400/20 rounded-lg text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-white leading-none">Morning Executive Digest</h3>
            <p className="text-[11px] text-indigo-300/80 font-sans mt-0.5">{todayStr} • Productivity Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
          <Bot className="w-3 h-3 text-indigo-400" />
          <span>Productivity Agent</span>
        </div>
      </div>

      {/* Highlight Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-500/20 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Due Today</div>
            <div className="text-base font-bold text-white">{dueTasksCount} Tasks</div>
          </div>
        </div>

        <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-500/20 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold truncate">Primary Goal</div>
            <div className="text-xs font-bold text-white truncate">{goalTitleDisplay}</div>
          </div>
        </div>

        <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-500/20 flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-300 shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Today's Focus</div>
            <div className="text-xs text-indigo-200 truncate">{suggestionDisplay}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-indigo-300/80 text-[11px]">
          Your agents are actively monitoring deadlines & habits.
        </span>
        <button
          onClick={() => navigate('/chat')}
          className="inline-flex items-center gap-1.5 font-semibold text-indigo-300 hover:text-white transition-colors"
        >
          <span>Ask Productivity Agent</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
