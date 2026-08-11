export function getAgentTheme(agentName?: string) {
  switch (agentName?.toLowerCase()) {
    case 'coding':
    case 'coding_agent':
      return {
        name: 'Coding Agent',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300',
        iconColor: 'text-emerald-400',
      }
    case 'career':
    case 'career_agent':
      return {
        name: 'Career Agent',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300',
        iconColor: 'text-blue-400',
      }
    case 'study':
    case 'study_agent':
      return {
        name: 'Study Agent',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300',
        iconColor: 'text-amber-400',
      }
    case 'finance':
    case 'finance_agent':
      return {
        name: 'Finance Agent',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        badge: 'bg-purple-500/20 text-purple-300',
        iconColor: 'text-purple-400',
      }
    default:
      return {
        name: 'Productivity Agent',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        badge: 'bg-indigo-500/20 text-indigo-300',
        iconColor: 'text-indigo-400',
      }
  }
}
