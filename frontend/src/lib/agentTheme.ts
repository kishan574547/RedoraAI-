export interface AgentTheme {
  name: string
  bg: string
  border: string
  text: string
  badge: string
  iconColor: string
  isUser?: boolean
}

export function getAgentTheme(agentName?: string): AgentTheme {
  const norm = (agentName || '').toLowerCase().trim()
  switch (norm) {
    case 'user':
    case 'you':
    case 'me':
      return {
        name: 'You',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-800 dark:text-slate-200',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        iconColor: 'text-slate-600 dark:text-slate-300',
        isUser: true,
      }
    case 'coding':
    case 'coding_agent':
      return {
        name: 'Coding Agent',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-500 dark:text-emerald-400',
        badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
      }
    case 'career':
    case 'career_agent':
      return {
        name: 'Career Agent',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-500 dark:text-blue-400',
        badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
        iconColor: 'text-blue-500 dark:text-blue-400',
      }
    case 'study':
    case 'study_agent':
      return {
        name: 'Study Agent',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-500 dark:text-amber-400',
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        iconColor: 'text-amber-500 dark:text-amber-400',
      }
    case 'finance':
    case 'finance_agent':
      return {
        name: 'Finance Agent',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-500 dark:text-purple-400',
        badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        iconColor: 'text-purple-500 dark:text-purple-400',
      }
    case 'system':
      return {
        name: 'System',
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/30',
        text: 'text-zinc-500 dark:text-zinc-400',
        badge: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
        iconColor: 'text-zinc-500 dark:text-zinc-400',
      }
    case 'productivity':
    case 'productivity_agent':
    default:
      return {
        name: 'Productivity Agent',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        text: 'text-indigo-500 dark:text-indigo-400',
        badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        iconColor: 'text-indigo-500 dark:text-indigo-400',
      }
  }
}

