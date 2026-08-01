import React from 'react'
import { Calendar, CheckCircle2, Circle, Clock, Printer } from 'lucide-react'

export interface RoadmapMilestone {
  id: string
  title: string
  date: string
  status: 'completed' | 'in_progress' | 'upcoming'
  category?: string
}

interface GoalRoadmapTimelineProps {
  goalTitle: string
  goalDescription?: string
  targetDate?: string
  milestones: RoadmapMilestone[]
}

export const GoalRoadmapTimeline: React.FC<GoalRoadmapTimelineProps> = ({
  goalTitle,
  goalDescription,
  targetDate,
  milestones,
}) => {
  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 print:shadow-none print:border-none print:p-0 transition-colors duration-200">
      {/* Roadmap Header & PDF Print Action */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100">{goalTitle} — Visual Roadmap</h2>
          </div>
          {goalDescription && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{goalDescription}</p>}
          {targetDate && (
            <p className="text-xs text-indigo-600 font-semibold mt-1">
              Target Completion: {new Date(targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        <button
          onClick={handlePrintPDF}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors print:hidden shrink-0"
          title="Export Roadmap as PDF"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Export / Print PDF</span>
        </button>
      </div>

      {/* Horizontal Gantt / Milestone Timeline */}
      <div className="relative pt-4 pb-2 overflow-x-auto">
        <div className="flex items-start justify-between min-w-[600px] relative">
          {/* Connecting Timeline Line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 rounded z-0" />

          {milestones.map((ms, idx) => {
            const isDone = ms.status === 'completed'
            const isCurrent = ms.status === 'in_progress'

            return (
              <div key={ms.id || idx} className="relative z-10 flex flex-col items-center text-center max-w-[140px] px-2">
                {/* Status Dot */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-all ${
                    isDone
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                      : isCurrent
                      ? 'border-indigo-600 text-indigo-600 ring-4 ring-indigo-100 bg-indigo-50'
                      : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </div>

                {/* Milestone Info */}
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Phase {idx + 1}
                  </span>
                  <h4 className={`text-xs font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-800'} line-clamp-2`}>
                    {ms.title}
                  </h4>
                  <p className="text-[11px] text-slate-400">{ms.date}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
