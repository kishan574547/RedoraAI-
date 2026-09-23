import React, { useState, useRef } from 'react'
import {
  FileText, UploadCloud, Briefcase, Download, Loader2,
  AlertCircle, CheckCircle2, ArrowLeft, Trash2, Copy, Check, Pencil
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function CoverLetterGenerator() {
  const navigate = useNavigate()

  // Inputs
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  // Output
  const [coverLetter, setCoverLetter] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { setError('File exceeds 20MB limit.'); return }
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setError('Please upload a PDF or .docx resume file.')
      return
    }
    setError(null)
    setResumeFile(file)
    setResumeText('')
  }

  const handleGenerate = async () => {
    if (!resumeFile && !resumeText.trim()) {
      setError('Please upload your resume or paste your resume text.')
      return
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 20) {
      setError('Please enter a job description (at least 20 characters).')
      return
    }
    setIsGenerating(true)
    setError(null)
    setCoverLetter('')

    try {
      const formData = new FormData()
      formData.append('job_description', jobDescription.trim())
      if (resumeFile) {
        formData.append('resume_file', resumeFile)
      } else {
        formData.append('resume_text', resumeText.trim())
      }

      const res = await api.post('/tools/cover-letter/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setCoverLetter(res.data.cover_letter || '')
      setIsEditing(false)
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to generate cover letter. Please try again.'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async () => {
    if (!coverLetter.trim()) return
    setIsExporting(true)
    try {
      const formData = new FormData()
      formData.append('cover_letter_text', coverLetter)
      const res = await api.post('/tools/cover-letter/export-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'Cover_Letter.pdf'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 500)
    } catch {
      setError('Failed to export PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter)
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
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <Briefcase className="w-3.5 h-3.5" /><span>Career Tool</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          Cover Letter Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Generate a tailored, professional cover letter in seconds. Upload your resume and paste the job description.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Inputs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your Resume</h2>

          {/* Resume Upload */}
          <div>
            <label className={labelCls}>Upload Resume (PDF or .docx)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-violet-500/50 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-5 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
                id="resume-file-input"
              />
              {resumeFile ? (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-200">{resumeFile.name}</p>
                      <p className="text-xs text-slate-500">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setResumeFile(null) }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-violet-400 mx-auto transition-colors" />
                  <p className="text-sm text-slate-500 group-hover:text-violet-400 transition-colors">Click to upload resume</p>
                  <p className="text-xs text-slate-600">PDF or .docx · Max 20MB</p>
                </div>
              )}
            </div>
          </div>

          {/* OR paste text */}
          {!resumeFile && (
            <div>
              <label className={labelCls}>Or Paste Resume Text</label>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                rows={6}
                placeholder="Paste your resume content here..."
                className={inputCls}
              />
            </div>
          )}

          {/* Job Description */}
          <div>
            <label className={labelCls}>Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={8}
              placeholder="Paste the full job description here..."
              className={inputCls}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button
            type="button"
            id="generate-cover-letter-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-violet-500/20 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating…</span></>
            ) : (
              <><Briefcase className="w-4 h-4" /><span>Generate Cover Letter</span></>
            )}
          </button>
        </div>

        {/* RIGHT — Output */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Generated Cover Letter</h2>
            {coverLetter && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />{isEditing ? 'Done Editing' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export PDF
                </button>
              </div>
            )}
          </div>

          {coverLetter ? (
            isEditing ? (
              <textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                rows={24}
                className={inputCls + ' font-mono text-xs leading-relaxed'}
              />
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-h-[600px] overflow-y-auto text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {coverLetter}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 space-y-3">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Your generated cover letter will appear here.</p>
            </div>
          )}

          {coverLetter && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Cover letter generated! Review, edit if needed, then download as PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
