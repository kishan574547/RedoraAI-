import React, { useState, useRef, Component, ReactNode } from 'react'
import { 
  FileCheck, 
  UploadCloud, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Award, 
  FileText,
  Target,
  Tag,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface RuleItem {
  name: string
  passed: boolean
  details: string
}

interface KeywordResults {
  match_percentage: number | null
  matched_keywords?: string[]
  missing_keywords?: string[]
}

interface AtsCheckResponse {
  overall_score: number
  word_count: number
  raw_text?: string
  rule_based_results: RuleItem[]
  keyword_match_results: KeywordResults
  ai_feedback: string[]
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ResumeAtsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ResumeAts ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Resume ATS Checker Encountered an Error</h2>
          <p className="text-sm text-slate-400">
            {this.state.error?.message || 'A temporary rendering issue occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs transition-all"
          >
            Reset Tool
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function ResumeAtsCheckerContent() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState<string>('')
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AtsCheckResponse | null>(null)

  // Interactive corrections state
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set())
  const [acceptedKeywords, setAcceptedKeywords] = useState<Set<string>>(new Set())
  
  const [customInstruction, setCustomInstruction] = useState<string>('')
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<boolean>(false)

  const [isApplyingCorrections, setIsApplyingCorrections] = useState<boolean>(false)
  const [optimizedResumeText, setOptimizedResumeText] = useState<string | null>(null)
  const [optimizedScore, setOptimizedScore] = useState<number | null>(null)

  const [downloadingDocx, setDownloadingDocx] = useState<boolean>(false)
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    if (file.size > 20 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 20MB limit.`)
      return false
    }
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.doc')) {
      setError('Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).')
      return false
    }
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setError(null)
    setResults(null)
    setOptimizedResumeText(null)
    setAcceptedSuggestions(new Set())
    setAcceptedKeywords(new Set())
    if (validateFile(file)) {
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return
    const file = e.dataTransfer.files[0]
    setError(null)
    setResults(null)
    setOptimizedResumeText(null)
    setAcceptedSuggestions(new Set())
    setAcceptedKeywords(new Set())
    if (validateFile(file)) {
      setSelectedFile(file)
    }
  }

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.setAttribute('download', filename)
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a)
      }
    }, 500)
  }

  const formatErrorMessage = (detail: any): string => {
    if (!detail) return 'Failed to analyze resume. Please check your file.'
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            const fieldName = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : ''
            const msg = item.msg || item.message || 'Invalid input'
            return fieldName ? `Field "${fieldName}": ${msg}` : msg
          }
          return String(item)
        })
        .join('; ')
    }
    if (typeof detail === 'object') {
      const fieldName = Array.isArray(detail.loc) ? detail.loc[detail.loc.length - 1] : ''
      const msg = detail.msg || detail.message || JSON.stringify(detail)
      return fieldName ? `Field "${fieldName}": ${msg}` : msg
    }
    return String(detail)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload a PDF or DOCX resume file first.')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResults(null)
    setOptimizedResumeText(null)
    setAcceptedSuggestions(new Set())
    setAcceptedKeywords(new Set())

    try {
      const formData = new FormData()
      formData.append('resume_file', selectedFile)
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim())
      }

      const res = await api.post('/tools/resume-ats/check', formData)

      setResults(res.data)
    } catch (err: any) {
      console.error('Resume ATS error:', err)
      let detail: any = 'Failed to analyze resume. Please check your file.'
      if (err.response?.data?.detail) {
        detail = err.response.data.detail
      } else if (err.message) {
        detail = err.message
      }
      setError(formatErrorMessage(detail))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCustomAiSuggestion = async () => {
    if (!customInstruction.trim() || !results) return
    setIsGeneratingCustom(true)
    setError(null)

    try {
      const res = await api.post('/tools/resume-ats/custom-suggestion', {
        resume_text: results.raw_text || '',
        custom_instruction: customInstruction.trim(),
        job_description: jobDescription.trim()
      })

      const newSuggestions: string[] = res.data.custom_suggestions || []
      if (newSuggestions.length > 0) {
        setResults((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            ai_feedback: [...newSuggestions, ...prev.ai_feedback]
          }
        })
        setAcceptedSuggestions((prev) => {
          const next = new Set(prev)
          newSuggestions.forEach((s) => next.add(s))
          return next
        })
        setCustomInstruction('')
      }
    } catch (err: any) {
      console.error('Failed to generate custom suggestion:', err)
      setError(formatErrorMessage(err.response?.data?.detail || err.message))
    } finally {
      setIsGeneratingCustom(false)
    }
  }

  const toggleSuggestion = (rec: string) => {
    setAcceptedSuggestions((prev) => {
      const next = new Set(prev)
      if (next.has(rec)) next.delete(rec)
      else next.add(rec)
      return next
    })
  }

  const toggleKeyword = (kw: string) => {
    setAcceptedKeywords((prev) => {
      const next = new Set(prev)
      if (next.has(kw)) next.delete(kw)
      else next.add(kw)
      return next
    })
  }

  const handleApplyCorrections = async () => {
    if (!results) return
    setIsApplyingCorrections(true)
    setError(null)

    try {
      const payload = {
        original_text: results.raw_text || '',
        accepted_suggestions: Array.from(acceptedSuggestions),
        missing_keywords: Array.from(acceptedKeywords)
      }

      const res = await api.post('/tools/resume-ats/apply-corrections', payload)
      setOptimizedResumeText(res.data.optimized_text)
      setOptimizedScore(res.data.reanalyzed_score)
    } catch (err: any) {
      console.error('Failed to apply corrections:', err)
      setError(formatErrorMessage(err.response?.data?.detail || err.message))
    } finally {
      setIsApplyingCorrections(false)
    }
  }

  const handleDownloadDocx = async (textToExport?: string) => {
    const targetText = typeof textToExport === 'string' ? textToExport : (optimizedResumeText || results?.raw_text || '')
    if (!targetText) {
      setError('No resume text available for export.')
      return
    }
    setDownloadingDocx(true)
    try {
      const res = await api.post('/tools/resume-ats/export-docx', { resume_text: targetText }, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, 'Optimized_ATS_Resume.docx')
    } catch (err) {
      setError('Failed to download Word document.')
    } finally {
      setDownloadingDocx(false)
    }
  }

  const handleDownloadPdf = async (textToExport?: string) => {
    const targetText = typeof textToExport === 'string' ? textToExport : (optimizedResumeText || results?.raw_text || '')
    if (!targetText) {
      setError('No resume text available for export.')
      return
    }
    setDownloadingPdf(true)
    try {
      const res = await api.post('/tools/resume-ats/export-pdf', { resume_text: targetText }, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, 'Optimized_ATS_Resume.pdf')
    } catch (err) {
      setError('Failed to download PDF document.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  }

  return (
    <div className="space-y-6 font-sans w-full max-w-full overflow-x-hidden transition-colors duration-200">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-colors duration-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Career Optimizer</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            Resume ATS Checker & Builder
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Evaluate your resume for Applicant Tracking Systems (ATS), type custom instructions for OpenRouter AI Agent, and download an optimized resume document.
          </p>
        </div>
      </div>

      {/* Main Action Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 transition-colors duration-200">
        {/* Upload Zone */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Upload Resume (PDF or DOCX)
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-12 h-12 bg-white dark:bg-slate-900 group-hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-500/30 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mx-auto transition-all">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {selectedFile ? selectedFile.name : 'Click to upload or drag & drop resume file'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF (.pdf) and Word (.docx) formats up to 20MB
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
              <div className="flex items-center space-x-3 truncate">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setResults(null); setOptimizedResumeText(null); }}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Optional Target Job Description */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Target Job Description (Optional for Keyword Matching)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here to check keyword match percentage and identify missing keywords..."
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 leading-relaxed"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Analyze Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedFile}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Resume...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Analyze Resume ATS Score</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {results && (
        <div className="space-y-6">
          {/* Overall Score Badge Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-200">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Overall ATS Match Score</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Based on structural formatting, essential section tags, quantifiable impact metrics, and keyword relevance ({results.word_count} words).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <div className={`px-6 py-3 rounded-2xl border text-center ${getScoreColor(results.overall_score)}`}>
                <div className="text-3xl font-bold">{results.overall_score} <span className="text-sm font-normal">/ 100</span></div>
                <p className="text-[11px] uppercase tracking-wider font-semibold mt-0.5">
                  {results.overall_score >= 80 ? 'ATS Ready' : results.overall_score >= 60 ? 'Needs Improvement' : 'High Risk'}
                </p>
              </div>

              {/* Instant Download Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDocx()}
                  disabled={downloadingDocx}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
                >
                  {downloadingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Download .DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  disabled={downloadingPdf}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-all"
                >
                  {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Download .PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rule-Based Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ATS Structural Checklist</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.rule_based_results.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                    {item.passed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword Match Breakdown (If JD provided) */}
          {results.keyword_match_results?.match_percentage !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <span>Job Description Keyword Match</span>
                </h3>
                <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  {results.keyword_match_results.match_percentage}% Keyword Match
                </span>
              </div>

              {results.keyword_match_results.missing_keywords && results.keyword_match_results.missing_keywords.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-rose-400" />
                    Missing Keywords (Click to Accept & Add to Resume):
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {results.keyword_match_results.missing_keywords.map((kw, idx) => {
                      const isAccepted = acceptedKeywords.has(kw)
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => toggleKeyword(kw)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                            isAccepted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20'
                          }`}
                        >
                          {isAccepted ? '✓ Added:' : '+ Add:'} {kw}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Qualitative Recommendations with Interactive Accept Toggles & Custom AI Prompt Box */}
          {results.ai_feedback && results.ai_feedback.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>AI Recommendations (Click to Accept Corrections)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {acceptedSuggestions.size} / {results.ai_feedback.length} Selected
                </span>
              </div>

              {/* Custom AI Instruction Input Box */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Custom AI Agent Instruction (Type specific request):
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomAiSuggestion() }}
                    placeholder="e.g. 'Make my experience sound more senior', 'Highlight AWS and Python skills', 'Add leadership metrics'..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleCustomAiSuggestion}
                    disabled={isGeneratingCustom || !customInstruction.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-xl text-xs transition-all shrink-0"
                  >
                    {isGeneratingCustom ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Asking AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI Agent</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-3">
                {results.ai_feedback.map((rec, idx) => {
                  const isAccepted = acceptedSuggestions.has(rec)
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSuggestion(rec)}
                      className={`flex items-start justify-between gap-4 p-4 rounded-xl text-xs cursor-pointer border transition-all ${
                        isAccepted
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-100 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5 ${
                          isAccepted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="leading-relaxed">{rec}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSuggestion(rec); }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                          isAccepted
                            ? 'bg-emerald-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isAccepted ? '✓ Accepted' : '+ Accept & Apply'}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Action Button: Apply Selected Corrections */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleApplyCorrections}
                  disabled={isApplyingCorrections || (acceptedSuggestions.size === 0 && acceptedKeywords.size === 0)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/10 disabled:cursor-not-allowed"
                >
                  {isApplyingCorrections ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Optimizing Resume with Accepted Corrections...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Apply ({acceptedSuggestions.size + acceptedKeywords.size}) Corrections & Rewrite Resume</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Optimized ATS Resume Preview & Download Card */}
          {optimizedResumeText && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white">Optimized ATS Resume Ready</h3>
                    <p className="text-xs text-slate-400">
                      All accepted corrections and missing keywords incorporated into ATS layout ({optimizedResumeText.split(/\s+/).length} words).
                    </p>
                  </div>
                </div>

                {optimizedScore && (
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-center">
                    <span className="text-xs font-semibold uppercase tracking-wider block">New ATS Score</span>
                    <span className="text-2xl font-bold">{optimizedScore} / 100</span>
                  </div>
                )}
              </div>

              {/* Editable Optimized Text Area */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Optimized Resume Text Preview (Editable - Live Changes Will Be Exported)
                </label>
                <textarea
                  value={optimizedResumeText}
                  onChange={(e) => setOptimizedResumeText(e.target.value)}
                  rows={14}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 leading-relaxed"
                />
              </div>

              {/* Download Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDocx(optimizedResumeText)}
                  disabled={downloadingDocx}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-semibold rounded-xl text-xs transition-all shadow-md"
                >
                  {downloadingDocx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Word Doc...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Download Optimized Resume (.docx)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(optimizedResumeText)}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 font-semibold rounded-xl text-xs transition-all border border-slate-700"
                >
                  {downloadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>Download Optimized Resume (.pdf)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResumeAtsChecker() {
  return (
    <ResumeAtsErrorBoundary>
      <ResumeAtsCheckerContent />
    </ResumeAtsErrorBoundary>
  )
}

