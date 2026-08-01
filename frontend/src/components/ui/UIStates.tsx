import React, { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react'

// Toast Notification State
export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

// 1. GLOBAL NETWORK & OFFLINE MONITOR + TOAST SYSTEM
export const NetworkStatusBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  const handleManualRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      if (navigator.onLine) setIsOffline(false)
      setIsRetrying(false)
    }, 1200)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 flex items-center justify-between text-xs font-medium shadow-md animate-down">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>You're offline — changes will sync automatically when connection returns.</span>
        </div>
        <button
          onClick={handleManualRetry}
          disabled={isRetrying}
          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 rounded font-semibold transition-colors flex items-center gap-1 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Checking...' : 'Retry Connection'}</span>
        </button>
      </div>
    </div>
  )
}

// 2. SKELETON LOADING STATE COMPONENT
export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3 animate-pulse">
    <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-4 bg-slate-100 rounded w-full" />
    ))}
  </div>
)

// 3. ACTIONABLE EMPTY STATE COMPONENT
export interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center shadow-sm max-w-lg mx-auto my-4 space-y-3">
    {Icon && (
      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <h3 className="text-lg font-serif font-bold text-slate-900">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-indigo-600/20"
      >
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
)

// 4. FRIENDLY ERROR STATE COMPONENT
export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Redora AI couldn't complete this request",
  message,
  onRetry,
}) => (
  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 shadow-sm flex items-start gap-4 max-w-xl mx-auto my-4">
    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
    <div className="flex-1 space-y-1">
      <h4 className="font-bold text-sm text-rose-900">{title}</h4>
      <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  </div>
)

// 5. TOAST NOTIFICATION CONTAINER
export const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-medium border transition-all animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
