import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Flame, Compass } from 'lucide-react'

interface LifeStateCardProps {
  completedTasksCount: number
  totalTasksCount: number
  activeGoalsCount: number
  totalGoalsCount: number
  habitsStreak: number
  topPriorityGoal: string
  dueTasksCount?: number
  topSuggestion?: string
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
}: LifeStateCardProps) {
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0
  const todayStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  
  let workloadBalance = 'Balanced'
  let workloadColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (totalTasksCount > 10) {
    workloadBalance = 'High Workload'
    workloadColor = 'bg-amber-100 text-amber-800 border-amber-200'
  } else if (totalTasksCount === 0) {
    workloadBalance = 'No Tasks'
    workloadColor = 'bg-indigo-100 text-indigo-800 border-indigo-200'
  }

  let momentumStatus = 'Strong Momentum'
  let MomentumIcon = TrendingUp
  let momentumColor = 'text-emerald-400'
  let momentumDesc = `Habit streak is active at ${habitsStreak} days. Task execution rate is consistent.`

  if (totalTasksCount === 0 && activeGoalsCount === 0) {
    momentumStatus = 'Ready for Action'
    MomentumIcon = Compass
    momentumColor = 'text-indigo-400'
    momentumDesc = `No active tasks or goals remaining. Add a new task or goal to begin tracking.`
  } else if (completionRate < 50) {
    momentumStatus = 'Slipping — Needs Focus'
    MomentumIcon = AlertTriangle
    momentumColor = 'text-rose-400'
    momentumDesc = `Task completion rate is at ${completionRate}%. Prioritize completing pending items.`
  }

  return (
    <div className='bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 space-y-6 font-sans relative overflow-hidden transition-colors duration-200'>
      {/* Top Banner */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0'>
            <Compass className='w-5 h-5 animate-pulse' />
          </div>
          <div className='min-w-0'>
            <h2 className='text-base sm:text-lg font-serif font-bold text-white flex flex-wrap items-center gap-2'>
              <span>State of Your Life</span>
              <span className='text-[10px] sm:text-xs font-sans uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-semibold'>
                AI Live Synthesis
              </span>
            </h2>
            <p className='text-xs text-indigo-200/80 mt-0.5'>Executive Digest • {todayStr}</p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-wrap shrink-0'>
          <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${workloadColor}`}>
            {workloadBalance}
          </span>
          <span className='inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full'>
            <Flame className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
            <span>{habitsStreak}d Streak</span>
          </span>
        </div>
      </div>

      {/* Synthesis 3-Column Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-xs'>
        {/* Column 1: Workload & Completion */}
        <div className='bg-indigo-950/60 p-4 rounded-2xl border border-indigo-500/20 space-y-2'>
          <div className='text-indigo-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5'>
            <ShieldCheck className='w-4 h-4 text-emerald-400' />
            <span>Workload Balance</span>
          </div>
          <div className='text-2xl font-serif font-bold text-white'>{completionRate}% Completion Rate</div>
          <p className='text-indigo-200/80 text-[11px] leading-relaxed'>
            {completedTasksCount} of {totalTasksCount} roadmap tasks completed across {activeGoalsCount} active goals.
          </p>
        </div>

        {/* Column 2: Momentum Tracking */}
        <div className='bg-indigo-950/60 p-4 rounded-2xl border border-indigo-500/20 space-y-2'>
          <div className='text-indigo-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5'>
            <MomentumIcon className={`w-4 h-4 ${momentumColor}`} />
            <span>Momentum Analysis</span>
          </div>
          <div className={`text-xl font-serif font-bold ${momentumColor}`}>{momentumStatus}</div>
          <p className='text-indigo-200/80 text-[11px] leading-relaxed'>
            {momentumDesc}
          </p>
        </div>

        {/* Column 3: Where Attention is Needed */}
        <div className='bg-indigo-950/60 p-4 rounded-2xl border border-indigo-500/20 space-y-2'>
          <div className='text-indigo-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5'>
            <Sparkles className='w-4 h-4 text-amber-400' />
            <span>Attention Needed Right Now</span>
          </div>
          <div className='text-sm font-bold text-white line-clamp-1'>
            {topPriorityGoal ? `🎯 ${topPriorityGoal}` : '✨ All Goals Completed'}
          </div>
          <p className='text-indigo-200/80 text-[11px] leading-relaxed'>
            {topPriorityGoal
              ? 'Prioritize completing tasks associated with your primary goal for optimal progression.'
              : 'No active goals requiring immediate attention. Create a goal to track priorities!'}
          </p>
        </div>
      </div>

      {/* Slim Secondary Digest Row */}
      <div className='pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs'>
        <div className='flex items-center gap-4 flex-wrap text-indigo-200/90 text-[11px]'>
          <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20'>
            <span className='font-semibold text-white'>Due Today:</span> {dueTasksCount} Tasks
          </span>
          <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20'>
            <span className='font-semibold text-white'>Primary Goal:</span> {topPriorityGoal || 'None'}
          </span>
          {topSuggestion && (
            <span className='inline-flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-500/20 truncate max-w-md'>
              <span className='font-semibold text-white'>Today's Focus:</span> <span className='truncate'>{topSuggestion}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
