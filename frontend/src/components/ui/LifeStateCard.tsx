import { Sparkles, ShieldCheck, Flame, Compass } from 'lucide-react'

interface LifeStateCardProps {
  completedTasksCount: number
  totalTasksCount: number
  activeGoalsCount: number
  totalGoalsCount: number
  habitsStreak: number
  topPriorityGoal: string
  dueTasksCount?: number
  topSuggestion?: string
  currentNextTaskTitle?: string
  pendingTasksCount?: number
}

export function LifeStateCard({
  completedTasksCount,
  totalTasksCount,
  activeGoalsCount,
  totalGoalsCount: _totalGoalsCount,
  habitsStreak,
  topPriorityGoal,
  dueTasksCount = 0,
  topSuggestion = '',
  currentNextTaskTitle = '',
  pendingTasksCount = 0,
}: LifeStateCardProps) {
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0
  const todayStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })

  // Construct a clear plain-language status sentence for auto-advance queue
  let statusSentence = "All caught up! 🎉 Great job completing your tasks."
  if (totalTasksCount === 0 && activeGoalsCount === 0) {
    statusSentence = "Welcome! You don't have any active goals yet. Ask Redora AI to build a study or career roadmap for you."
  } else if (pendingTasksCount === 0) {
    statusSentence = "All caught up! 🎉 All tasks are completed. Create a new task or goal to keep building momentum."
  } else if (currentNextTaskTitle) {
    if (topPriorityGoal) {
      statusSentence = `Next Up: '${currentNextTaskTitle}' for '${topPriorityGoal}'. (${completedTasksCount} of ${totalTasksCount} tasks done).`
    } else {
      statusSentence = `Next Up: '${currentNextTaskTitle}' — ${completedTasksCount} of ${totalTasksCount} tasks completed.`
    }
  } else if (topPriorityGoal) {
    statusSentence = `Focus Goal: '${topPriorityGoal}' — ${completedTasksCount} of ${totalTasksCount} tasks completed.`
  }

  return (
    <div className='bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 space-y-5 font-sans relative overflow-hidden transition-colors duration-200'>
      {/* Top Header */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0'>
            <Compass className='w-5 h-5 animate-pulse' />
          </div>
          <div className='min-w-0'>
            <h2 className='text-base sm:text-lg font-serif font-bold text-white flex flex-wrap items-center gap-2'>
              <span>Your Overview</span>
              <span className='text-[10px] sm:text-xs font-sans uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-semibold'>
                Daily Summary
              </span>
            </h2>
            <p className='text-xs text-indigo-200/80 mt-0.5'>{todayStr}</p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-wrap shrink-0'>
          <span className='inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full'>
            <Flame className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
            <span>{habitsStreak} Day Streak</span>
          </span>
        </div>
      </div>

      {/* 2-Column Simplified Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-xs'>
        {/* Column 1: Progress */}
        <div className='bg-indigo-950/60 p-4.5 rounded-2xl border border-indigo-500/20 space-y-2 flex flex-col justify-between'>
          <div className='text-indigo-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5'>
            <ShieldCheck className='w-4 h-4 text-emerald-400' />
            <span>Progress</span>
          </div>
          <div className='text-2xl font-serif font-bold text-white'>{completionRate}% Completed</div>
          <p className='text-indigo-200/80 text-[11px] leading-relaxed'>
            {completedTasksCount} of {totalTasksCount} tasks finished across {activeGoalsCount} active goal{activeGoalsCount === 1 ? '' : 's'}.
          </p>
        </div>

        {/* Column 2 & 3 Merged: Auto-Advancing Status & Priority */}
        <div className='md:col-span-2 bg-indigo-950/60 p-4.5 rounded-2xl border border-indigo-500/20 flex flex-col justify-between space-y-2'>
          <div className='text-indigo-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5'>
            <Sparkles className='w-4 h-4 text-amber-400' />
            <span>Current Status & Priority</span>
          </div>
          <div className='text-sm sm:text-base font-medium text-white leading-relaxed'>
            {statusSentence}
          </div>
          {topSuggestion && (
            <p className='text-indigo-200/80 text-[11px] pt-1.5 border-t border-indigo-500/20 truncate'>
              <span className='font-semibold text-white'>Suggested Next Step:</span> {topSuggestion}
            </p>
          )}
        </div>
      </div>

      {/* Slim Summary Row */}
      <div className='pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs'>
        <div className='flex items-center gap-3 flex-wrap text-indigo-200/90 text-[11px]'>
          <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20'>
            <span className='font-semibold text-white'>Current Focus:</span> {currentNextTaskTitle || 'All caught up! 🎉'}
          </span>
          <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20'>
            <span className='font-semibold text-white'>Tasks Due Today:</span> {dueTasksCount}
          </span>
          <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20'>
            <span className='font-semibold text-white'>Main Goal:</span> {topPriorityGoal || 'None set'}
          </span>
        </div>
      </div>
    </div>
  )
}
