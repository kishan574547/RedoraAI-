import React, { useState, useRef, Component, ReactNode } from 'react'
import { 
  FileText, 
  UploadCloud, 
  Merge, 
  Scissors, 
  Minimize2, 
  FileCode2, 
  AlignLeft, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Copy,
  Check,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

type ToolTab = 'merge' | 'split' | 'compress' | 'to-word' | 'extract-text'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class PdfToolkitErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('PdfToolkit ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">PDF Toolkit Encountered an Error</h2>
          <p className="text-sm text-slate-400">
            {this.state.error?.message || 'A temporary rendering issue occurred in PDF Toolkit.'}
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

function PdfToolkitContent() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ToolTab>('merge')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [pageRange, setPageRange] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Extract text result state
  const [extractedData, setExtractedData] = useState<{ total_pages: number; full_text: string; pages: { page: number; text: string }[] } | null>(null)
  const [copiedText, setCopiedText] = useState(false)

  // Download link result state
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTabChange = (tab: ToolTab) => {
    setActiveTab(tab)
    setSelectedFiles([])
    setPageRange('')
    setError(null)
    setSuccessMessage(null)
    setExtractedData(null)
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }
  }

  const validateFiles = (files: File[]): boolean => {
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 20MB maximum limit.`)
        return false
      }
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setError(`File "${file.name}" is not a valid PDF file.`)
        return false
      }
    }
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    setError(null)
    setSuccessMessage(null)
    setExtractedData(null)
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }

    if (!validateFiles(incoming)) return

    if (activeTab === 'merge') {
      setSelectedFiles((prev) => [...prev, ...incoming])
    } else {
      setSelectedFiles(incoming.slice(0, 1))
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!e.dataTransfer.files) return
    const incoming = Array.from(e.dataTransfer.files)
    setError(null)
    setSuccessMessage(null)
    setExtractedData(null)

    if (!validateFiles(incoming)) return

    if (activeTab === 'merge') {
      setSelectedFiles((prev) => [...prev, ...incoming])
    } else {
      setSelectedFiles(incoming.slice(0, 1))
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
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
    if (!detail) return 'Failed to process PDF. Please check your files and try again.'
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

  const handleProcess = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !selectedFiles[0]) {
      setError('Please upload a PDF file first.')
      return
    }

    if (activeTab === 'merge' && selectedFiles.length < 2) {
      setError('Please select at least 2 PDF files to merge.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccessMessage(null)
    setExtractedData(null)
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }

    try {
      const formData = new FormData()

      if (activeTab === 'merge') {
        selectedFiles.forEach((file) => formData.append('files', file))
        const response = await api.post('/tools/pdf/merge', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadFilename('merged_document.pdf')
        setSuccessMessage('PDF files merged successfully!')
        triggerDownload(url, 'merged_document.pdf')
      } else if (activeTab === 'split') {
        formData.append('file', selectedFiles[0])
        formData.append('page_range', pageRange.trim())
        const response = await api.post('/tools/pdf/split', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        })
        const isZip = !pageRange.trim()
        const filename = isZip ? 'split_pages.zip' : 'split_pages.pdf'
        const blob = new Blob([response.data], { type: isZip ? 'application/zip' : 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadFilename(filename)
        setSuccessMessage('PDF split successfully!')
        triggerDownload(url, filename)
      } else if (activeTab === 'compress') {
        formData.append('file', selectedFiles[0])
        const response = await api.post('/tools/pdf/compress', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadFilename('compressed_document.pdf')
        setSuccessMessage('PDF compressed successfully!')
        triggerDownload(url, 'compressed_document.pdf')
      } else if (activeTab === 'to-word') {
        formData.append('file', selectedFiles[0])
        const response = await api.post('/tools/pdf/to-word', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        })
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        const name = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.docx'
        setDownloadFilename(name)
        setSuccessMessage('PDF converted to Word (.docx) successfully!')
        triggerDownload(url, name)
      } else if (activeTab === 'extract-text') {
        formData.append('file', selectedFiles[0])
        const response = await api.post('/tools/pdf/extract-text', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setExtractedData(response.data)
        setSuccessMessage('Text extracted successfully!')
      }
    } catch (err: any) {
      console.error('PDF Tool error:', err)
      let detail: any = 'Failed to process PDF. Please check your files and try again.'
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          try {
            const errorText = await err.response.data.text()
            const parsed = JSON.parse(errorText)
            if (parsed.detail) detail = parsed.detail
          } catch (e) {
            // keep default
          }
        } else if (err.response.data.detail) {
          detail = err.response.data.detail
        }
      }
      setError(formatErrorMessage(detail))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopyText = () => {
    if (!extractedData) return
    navigator.clipboard.writeText(extractedData.full_text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden transition-colors duration-200">
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
            <FileText className="w-3.5 h-3.5" />
            <span>Standalone Utility</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            PDF Toolkit
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Fast, secure, in-memory PDF processing. Merge, split, compress, convert, or extract text with zero tracking.
          </p>
        </div>
        <div className="shrink-0 self-start md:self-center">
          <ThemeToggle />
        </div>
      </div>

      {/* Tabs Navigation (Horizontally Scrollable on Mobile) */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 scrollbar-none w-full">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTabChange('merge'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 min-h-[44px] ${
            activeTab === 'merge'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Merge className="w-4 h-4" />
          <span>Merge PDFs</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTabChange('split'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 min-h-[44px] ${
            activeTab === 'split'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Split PDF</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTabChange('compress'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 min-h-[44px] ${
            activeTab === 'compress'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Minimize2 className="w-4 h-4" />
          <span>Compress PDF</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTabChange('to-word'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 min-h-[44px] ${
            activeTab === 'to-word'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Convert to Word</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTabChange('extract-text'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'extract-text'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <AlignLeft className="w-4 h-4" />
          <span>Extract Text</span>
        </button>
      </div>

      {/* Main Action Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 transition-colors duration-200">
        {/* Tool Description */}
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {activeTab === 'merge' && 'Combine multiple PDF documents into a single organized PDF file.'}
          {activeTab === 'split' && 'Extract specific page ranges (e.g. 1-3, 5) or split all pages into separate files.'}
          {activeTab === 'compress' && 'Reduce the file size of your PDF while maintaining optimal visual quality.'}
          {activeTab === 'to-word' && 'Convert your PDF document into an editable Microsoft Word (.docx) document.'}
          {activeTab === 'extract-text' && 'Extract all plain text content page-by-page from your PDF file.'}
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple={activeTab === 'merge'}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-12 h-12 bg-white dark:bg-slate-900 group-hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-500/30 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mx-auto transition-all">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Click to upload or drag & drop PDF files
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Maximum file size: 20MB per file
            </p>
          </div>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleRemoveFile(idx); }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra inputs for Split tool */}
        {activeTab === 'split' && selectedFiles.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Page Range (Optional)
            </label>
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-3, 5, 8-10 (Leave blank to split all pages into ZIP)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        )}

        {/* Status Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Process Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleProcess(); }}
            disabled={isProcessing || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing PDF...</span>
              </>
            ) : (
              <span>Process PDF</span>
            )}
          </button>
        </div>

        {/* Download Result Link */}
        {downloadUrl && (
          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Your processed file is ready</p>
                <p className="text-xs text-slate-500">{downloadFilename}</p>
              </div>
            </div>
            <a
              href={downloadUrl}
              download={downloadFilename}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Result</span>
            </a>
          </div>
        )}

        {/* Text Extraction Results Display */}
        {activeTab === 'extract-text' && extractedData && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Extracted Text ({extractedData.total_pages} Pages)
              </h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleCopyText(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {extractedData.full_text || 'No readable text content found in PDF.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PdfToolkit() {
  return (
    <PdfToolkitErrorBoundary>
      <PdfToolkitContent />
    </PdfToolkitErrorBoundary>
  )
}


