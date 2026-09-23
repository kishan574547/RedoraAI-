import React from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import Chat from '../../pages/Chat'
import Tasks from '../../pages/Tasks'
import Goals from '../../pages/Goals'
import FullActivity from '../../pages/FullActivity'
import PdfToolkit from '../../pages/tools/PdfToolkit'
import GpaCalculator from '../../pages/tools/GpaCalculator'
import CodeSandbox from '../../pages/tools/CodeSandbox'
import ResumeAtsChecker from '../../pages/tools/ResumeAtsChecker'
import KaggleExplorer from '../../pages/tools/KaggleExplorer'
import SpeakingPractice from '../../pages/tools/SpeakingPractice'
import MockInterview from '../../pages/tools/MockInterview'
import CoverLetterGenerator from '../../pages/tools/CoverLetterGenerator'
import LinkedInOptimizer from '../../pages/tools/LinkedInOptimizer'
import FlashcardGenerator from '../../pages/tools/FlashcardGenerator'
import QuizGenerator from '../../pages/tools/QuizGenerator'
import YouTubeSummarizer from '../../pages/tools/YouTubeSummarizer'
import Settings from '../../pages/Settings'
import AppLayout from './AppLayout'
import { QuickWidget } from '../ui/QuickWidget'
import { useToolSession } from '../../context/ToolSessionContext'

export function PersistentAppShell() {
  const location = useLocation()
  const pathname = location.pathname
  const toolSession = useToolSession()
  const visitedRoutes = toolSession?.visitedRoutes || new Set([pathname])

  const routesMap: Record<string, React.ReactElement> = {
    '/': <Dashboard />,
    '/chat': <Chat />,
    '/tasks': <Tasks />,
    '/goals': <Goals />,
    '/activity': <FullActivity />,
    '/tools/speaking': <SpeakingPractice />,
    '/tools/mock-interview': <MockInterview />,
    '/tools/pdf': <PdfToolkit />,
    '/tools/gpa': <GpaCalculator />,
    '/tools/sandbox': <CodeSandbox />,
    '/tools/resume-ats': <ResumeAtsChecker />,
    '/tools/cover-letter': <CoverLetterGenerator />,
    '/tools/linkedin': <LinkedInOptimizer />,
    '/tools/flashcards': <FlashcardGenerator />,
    '/tools/quiz': <QuizGenerator />,
    '/tools/youtube': <YouTubeSummarizer />,
    '/tools/kaggle': <KaggleExplorer />,
    '/settings': <Settings />,
  }

  const validPaths = Object.keys(routesMap)
  if (!validPaths.includes(pathname)) {
    return <Navigate to="/" replace />
  }

  return (
    <AppLayout>
      <div className="w-full relative min-h-full">
        {validPaths.map((path) => {
          if (!visitedRoutes.has(path)) return null
          const isCurrent = pathname === path
          return (
            <div
              key={path}
              id={`keepalive-route-${path.replace(/[/]/g, '_')}`}
              style={{ display: isCurrent ? 'block' : 'none' }}
              className="w-full"
            >
              {routesMap[path]}
            </div>
          )
        })}
      </div>
      <QuickWidget />
    </AppLayout>
  )
}
