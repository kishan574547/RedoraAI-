// CONSISTENT AGENT COLOR SYSTEM ACROSS WHOLE APP
// Career Agent = Blue
// Study Agent = Purple
// Productivity Agent = Orange
// Coding Agent = Green
// Memory / Default Agent = Indigo

export interface AgentTheme {
  name: string
  agentKey: string
  badge: string
  badgeBg: string
  badgeText: string
  border: string
  iconColor: string
  dotBg: string
  bgSoft: string
}

export const getAgentTheme = (agentName: string = ''): AgentTheme => {
  const name = agentName.toLowerCase()

  if (name.includes('career')) {
    return {
      name: 'Career Agent',
      agentKey: 'career',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      border: 'border-blue-200',
      iconColor: 'text-blue-600',
      dotBg: 'bg-blue-500',
      bgSoft: 'bg-blue-50/70',
    }
  }

  if (name.includes('study')) {
    return {
      name: 'Study Agent',
      agentKey: 'study',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      border: 'border-purple-200',
      iconColor: 'text-purple-600',
      dotBg: 'bg-purple-500',
      bgSoft: 'bg-purple-50/70',
    }
  }

  if (name.includes('productivity')) {
    return {
      name: 'Productivity Agent',
      agentKey: 'productivity',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-800',
      border: 'border-orange-200',
      iconColor: 'text-orange-600',
      dotBg: 'bg-orange-500',
      bgSoft: 'bg-orange-50/70',
    }
  }

  if (name.includes('coding')) {
    return {
      name: 'Coding Agent',
      agentKey: 'coding',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      dotBg: 'bg-emerald-500',
      bgSoft: 'bg-emerald-50/70',
    }
  }

  if (name.includes('finance')) {
    return {
      name: 'Finance Agent',
      agentKey: 'finance',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      dotBg: 'bg-emerald-500',
      bgSoft: 'bg-emerald-50/70',
    }
  }

  if (name.includes('memory')) {
    return {
      name: 'Memory Agent',
      agentKey: 'memory',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      border: 'border-indigo-200',
      iconColor: 'text-indigo-600',
      dotBg: 'bg-indigo-500',
      bgSoft: 'bg-indigo-50/70',
    }
  }

  return {
    name: agentName ? `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} Agent` : 'AI Agent',
    agentKey: agentName || 'ai',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    border: 'border-indigo-200',
    iconColor: 'text-indigo-600',
    dotBg: 'bg-indigo-500',
    bgSoft: 'bg-indigo-50/70',
  }
}
