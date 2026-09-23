import { useState } from 'react'
import {
  Linkedin, Sparkles, Loader2, AlertCircle, ArrowLeft,
  CheckCircle2, Copy, Check, ChevronDown, ChevronUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface OptimizeResult {
  optimized_headline: string
  optimized_about: string
  optimized_summary: string
  key_improvements: string[]
  keywords_added: string[]
  reasoning: string
}

function SectionCard({ title, before, after }: { title: string; before: string; after: string }) {
  const [showBefore, setShowBefore] = useState(false)
  const [copied, setCopied] = useState(false)

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBefore(p => !p)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showBefore ? <><ChevronUp className="w-3.5 h-3.5" />Hide original</> : <><ChevronDown className="w-3.5 h-3.5" />Show original</>}
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(after); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors"
          >
            {copied ? <><Check className="w-3 h-3 text-emerald-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>

      {showBefore && before && (
        <div className="px-4 py-3 border-b border-slate-800 bg-rose-500/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1">Original</p>
          <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{before}</p>
        </div>
      )}

      <div className="px-4 py-3 bg-emerald-500/5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Optimized</p>
        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{after}</p>
      </div>
    </div>
  )
}

export default function LinkedInOptimizer() {
  const navigate = useNavigate()

  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [industry, setIndustry] = useState('')

  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  const handleOptimize = async () => {
    if (!headline.trim() && !about.trim()) {
      setError('Please provide at least your current headline or About section.')
      return
    }
    if (!targetRole.trim()) {
      setError('Please enter your target role.')
      return
    }
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.post('/tools/linkedin/optimize', {
        current_headline: headline.trim(),
        current_about: about.trim(),
        target_role: targetRole.trim(),
        industry: industry.trim()
      })
      setResult(res.data)
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to optimize profile.'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setIsLoading(false)
    }
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
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <Linkedin className="w-3.5 h-3.5" /><span>Career Tool</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          LinkedIn Profile Optimizer
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Paste your LinkedIn sections and target role — get AI-optimized headline, About, and summary with keyword-rich rewrites.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Inputs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Target Role *</label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Industry (optional)</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g. FinTech, SaaS"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Current Headline</label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. Software Engineer | React | Node.js"
              className={inputCls}
              maxLength={220}
            />
            <p className="text-xs text-slate-600 mt-1">{headline.length}/220 characters</p>
          </div>

          <div>
            <label className={labelCls}>Current About / Summary</label>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              rows={10}
              placeholder="Paste your LinkedIn About section here..."
              className={inputCls}
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button
            type="button"
            id="optimize-linkedin-btn"
            onClick={handleOptimize}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Optimizing…</>
              : <><Sparkles className="w-4 h-4" />Optimize Profile</>}
          </button>
        </div>

        {/* RIGHT — Results */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Optimized Profile</h2>

          {!result && !isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 space-y-3">
              <Linkedin className="w-10 h-10 opacity-30" />
              <p className="text-sm">Optimized sections will appear here.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm">Analyzing and rewriting your profile…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.optimized_headline && (
                <SectionCard title="Headline" before={headline} after={result.optimized_headline} />
              )}
              {result.optimized_about && (
                <SectionCard title="About Section" before={about} after={result.optimized_about} />
              )}
              {result.optimized_summary && (
                <SectionCard title="Summary (Card)" before="" after={result.optimized_summary} />
              )}

              {result.key_improvements?.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Improvements</p>
                  <ul className="space-y-1">
                    {result.key_improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keywords_added?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.keywords_added.map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {result.reasoning && (
                <p className="text-xs text-slate-500 italic border-t border-slate-800 pt-3">{result.reasoning}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
