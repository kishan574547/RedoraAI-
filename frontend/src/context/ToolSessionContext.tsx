import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface ToolSessionContextType {
  visitedRoutes: Set<string>
  activeBackgroundTools: Set<string>
  markToolActive: (path: string, isActive: boolean) => void
  resetToolSession: (path: string) => void
  resetAllToolSessions: () => void
}

const ToolSessionContext = createContext<ToolSessionContextType | null>(null)

export function ToolSessionProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [visitedRoutes, setVisitedRoutes] = useState<Set<string>>(() => new Set([location.pathname]))
  const [activeBackgroundTools, setActiveBackgroundTools] = useState<Set<string>>(new Set())

  useEffect(() => {
    setVisitedRoutes((prev) => {
      if (!prev.has(location.pathname)) {
        const next = new Set(prev)
        next.add(location.pathname)
        return next
      }
      return prev
    })
    // Notify data listeners (like Tasks, Goals, Dashboard) to refresh when route changes
    window.dispatchEvent(new Event('lifeos_data_updated'))
  }, [location.pathname])

  const markToolActive = (path: string, isActive: boolean) => {
    setActiveBackgroundTools((prev) => {
      const next = new Set(prev)
      if (isActive) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const resetToolSession = (path: string) => {
    setVisitedRoutes((prev) => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
    setActiveBackgroundTools((prev) => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }

  const resetAllToolSessions = () => {
    setVisitedRoutes(new Set([location.pathname]))
    setActiveBackgroundTools(new Set())
  }

  return (
    <ToolSessionContext.Provider
      value={{
        visitedRoutes,
        activeBackgroundTools,
        markToolActive,
        resetToolSession,
        resetAllToolSessions,
      }}
    >
      {children}
    </ToolSessionContext.Provider>
  )
}

export function useToolSession() {
  const context = useContext(ToolSessionContext)
  return context
}
