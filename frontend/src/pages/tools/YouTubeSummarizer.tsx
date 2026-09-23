import { useState } from 'react'
import {
  Youtube, Sparkles, Loader2, AlertCircle, ArrowLeft,
  Clock, List, ExternalLink, Copy, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface KeyPoint {
  timestamp: string
  point: string
}

interface SummaryResult {
  title_guess: string
  overall_summary: string
  key_points: KeyPoint[]
  estimated_read_time: string
  video_id: string
  video_url: string
  transcript_length: number
}

export default function YouTubeSummarizer() {
  const navigate = useNavigate()

  const [url, setUrl] = useState('')
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSummarize = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL.')
      return
    }
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.post('/tools/youtube/summarize', { url: url.trim() })
      setResult(res.data)
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to summarize video.'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    const text = [
      result.title_guess,
      '',
      'Summary:',
      result.overall_summary,
      '',
      'Key Points:',
      ...result.key_points.map(kp => `[${kp.timestamp}] ${kp.point}`)
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /><span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <Youtube className="w-3.5 h-3.5" /><span>Content Tool</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          YouTube Video Summarizer
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Paste any YouTube URL to get a concise AI summary with key points and timestamps — no API key needed.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSummarize()}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
              id="youtube-url-input"
            />
          </div>
          <button
            type="button"
            id="summarize-youtube-btn"
            onClick={handleSummarize}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-400 disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/20 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Summarizing…</>
              : <><Sparkles className="w-4 h-4" />Summarize</>}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span>{error}</span>
              {error.toLowerCase().includes('youtube-transcript-api') && (
                <p className="text-xs text-rose-300 mt-1">
                  Install it on the server: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-200">pip install youtube-transcript-api</code>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-red-400" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-slate-300">Fetching transcript & summarizing…</p>
            <p className="text-xs">This may take 15-30 seconds for longer videos.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <div className="space-y-4">
          {/* Video meta */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{result.title_guess}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{result.estimated_read_time}</span>
                <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" />{result.key_points.length} key points</span>
                <span>{(result.transcript_length / 1000).toFixed(1)}k chars transcribed</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy Summary</>}
              </button>
              <a
                href={result.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />Watch Video
              </a>
            </div>
          </div>

          {/* Overall Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />Overview
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{result.overall_summary}</p>
          </div>

          {/* Key Points */}
          {result.key_points.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <List className="w-4 h-4 text-red-400" />Key Points
              </h3>
              <div className="space-y-3">
                {result.key_points.map((kp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    {kp.timestamp && kp.timestamp !== '—' && (
                      <a
                        href={`https://www.youtube.com/watch?v=${result.video_id}&t=${kp.timestamp.replace(':', 'm')}s`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs font-mono hover:bg-red-500/20 transition-colors"
                      >
                        {kp.timestamp}
                      </a>
                    )}
                    <p className="text-sm text-slate-300 leading-relaxed">{kp.point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
