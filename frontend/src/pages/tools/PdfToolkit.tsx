import React, { useState, useRef, useCallback, Component, ReactNode } from 'react'
import {
  FileText,
  UploadCloud,
  Merge,
  Scissors,
  Minimize2,
  FileCode2,
  FileType,
  AlignLeft,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  RotateCw,
  Stamp,
  Lock,
  UnlockKeyhole,
  ListOrdered,
  Image as ImageIcon,
  GripVertical,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

type ToolTab =
  | 'merge'
  | 'split'
  | 'compress'
  | 'to-word'
  | 'word-to-pdf'
  | 'extract-text'
  | 'rotate'
  | 'watermark'
  | 'protect'
  | 'organize'
  | 'image-to-pdf'

type ProtectMode = 'add' | 'remove'
type OrganizeMode = 'reorder' | 'delete'

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class PdfToolkitErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: any) {
    console.error('PdfToolkit ErrorBoundary caught an error:', error, info)
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

// ─── Tab config ─────────────────────────────────────────────────────────────
const TABS: { id: ToolTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'merge',       label: 'Merge PDFs',      icon: Merge },
  { id: 'split',       label: 'Split PDF',        icon: Scissors },
  { id: 'compress',    label: 'Compress PDF',     icon: Minimize2 },
  { id: 'to-word',     label: 'Convert to Word',  icon: FileCode2 },
  { id: 'word-to-pdf', label: 'Word to PDF',      icon: FileType },
  { id: 'extract-text',label: 'Extract Text',     icon: AlignLeft },
  { id: 'rotate',      label: 'Rotate',           icon: RotateCw },
  { id: 'watermark',   label: 'Watermark',        icon: Stamp },
  { id: 'protect',     label: 'Protect PDF',      icon: Lock },
  { id: 'organize',    label: 'Organize Pages',   icon: ListOrdered },
  { id: 'image-to-pdf',label: 'Image to PDF',     icon: ImageIcon },
]

const TAB_DESCRIPTIONS: Record<ToolTab, string> = {
  merge:        'Combine multiple PDF documents into a single organized PDF file.',
  split:        'Extract specific page ranges (e.g. 1-3, 5) or split all pages into separate files.',
  compress:     'Reduce the file size of your PDF while maintaining optimal visual quality.',
  'to-word':    'Convert your PDF document into an editable Microsoft Word (.docx) document.',
  'word-to-pdf':'Convert your Microsoft Word (.docx) document into a PDF document.',
  'extract-text':'Extract all plain text content page-by-page from your PDF file.',
  rotate:       'Rotate all pages or a specific page range by 90°, 180°, or 270°.',
  watermark:    'Overlay custom text as a watermark on every page of your PDF.',
  protect:      'Add a password to encrypt your PDF, or remove an existing password.',
  organize:     'Reorder pages into any sequence, or delete specific pages from your PDF.',
  'image-to-pdf':'Combine one or more JPEG/PNG images into a single PDF (one image per page).',
}

// Accepts images for image-to-pdf, docx for word-to-pdf, pdf for everything else
const getAccept = (tab: ToolTab) => {
  if (tab === 'word-to-pdf') return '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (tab === 'image-to-pdf') return '.jpg,.jpeg,.png,image/jpeg,image/png'
  return '.pdf,application/pdf'
}

const isMultiFile = (tab: ToolTab) => tab === 'merge' || tab === 'image-to-pdf'

// ─── Main component ──────────────────────────────────────────────────────────
function PdfToolkitContent() {
  const navigate = useNavigate()

  // ── Core state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ToolTab>('merge')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')

  // ── Split ────────────────────────────────────────────────────────────────────
  const [pageRange, setPageRange] = useState('')

  // ── Extract text ─────────────────────────────────────────────────────────────
  const [extractedData, setExtractedData] = useState<{
    total_pages: number; full_text: string; pages: { page: number; text: string }[]
  } | null>(null)
  const [copiedText, setCopiedText] = useState(false)

  // ── Rotate ───────────────────────────────────────────────────────────────────
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90)
  const [rotatePageRange, setRotatePageRange] = useState('')

  // ── Watermark ────────────────────────────────────────────────────────────────
  const [wmText, setWmText] = useState('')
  const [wmOpacity, setWmOpacity] = useState(0.3)
  const [wmPosition, setWmPosition] = useState('diagonal')

  // ── Protect ──────────────────────────────────────────────────────────────────
  const [protectMode, setProtectMode] = useState<ProtectMode>('add')
  const [protectPassword, setProtectPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Organize ─────────────────────────────────────────────────────────────────
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>('reorder')
  // page list: array of page numbers (1-indexed), user can drag-reorder or mark for deletion
  const [pageList, setPageList] = useState<number[]>([])
  const [pagesToDelete, setPagesToDelete] = useState<Set<number>>(new Set())
  const [orgPageCountLoaded, setOrgPageCountLoaded] = useState(false)
  const [orgPageCount, setOrgPageCount] = useState(0)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const clearResults = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
    setExtractedData(null)
    setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])

  const handleTabChange = (tab: ToolTab) => {
    setActiveTab(tab)
    setSelectedFiles([])
    setPageRange('')
    setRotatePageRange('')
    setWmText('')
    setWmOpacity(0.3)
    setWmPosition('diagonal')
    setProtectPassword('')
    setPageList([])
    setPagesToDelete(new Set())
    setOrgPageCountLoaded(false)
    setOrgPageCount(0)
    clearResults()
  }

  const validateFiles = (files: File[], tab: ToolTab): boolean => {
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 20MB maximum limit.`)
        return false
      }
      if (tab === 'word-to-pdf') {
        if (!file.name.toLowerCase().endsWith('.docx') &&
            file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          setError(`File "${file.name}" is not a valid Word (.docx) file.`)
          return false
        }
      } else if (tab === 'image-to-pdf') {
        const name = file.name.toLowerCase()
        if (!name.endsWith('.jpg') && !name.endsWith('.jpeg') && !name.endsWith('.png') &&
            file.type !== 'image/jpeg' && file.type !== 'image/png') {
          setError(`File "${file.name}" is not a valid JPEG or PNG image.`)
          return false
        }
      } else {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          setError(`File "${file.name}" is not a valid PDF file.`)
          return false
        }
      }
    }
    return true
  }

  const loadPageCountForOrganize = async (file: File) => {
    try {
      // Read file as ArrayBuffer and count PDF pages from xref
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const text = new TextDecoder('latin1').decode(bytes)
      // Count /Type /Page (not /Pages) entries as a quick heuristic
      const matches = text.match(/\/Type\s*\/Page[^s]/g)
      const count = matches ? matches.length : 0
      if (count > 0) {
        setOrgPageCount(count)
        setPageList(Array.from({ length: count }, (_, i) => i + 1))
        setOrgPageCountLoaded(true)
      } else {
        setOrgPageCountLoaded(false)
      }
    } catch {
      setOrgPageCountLoaded(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    clearResults()
    if (!validateFiles(incoming, activeTab)) return

    if (isMultiFile(activeTab)) {
      setSelectedFiles(prev => [...prev, ...incoming])
    } else {
      setSelectedFiles(incoming.slice(0, 1))
      if (activeTab === 'organize') {
        setPageList([])
        setPagesToDelete(new Set())
        setOrgPageCountLoaded(false)
        loadPageCountForOrganize(incoming[0])
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!e.dataTransfer.files) return
    const incoming = Array.from(e.dataTransfer.files)
    clearResults()
    if (!validateFiles(incoming, activeTab)) return
    if (isMultiFile(activeTab)) {
      setSelectedFiles(prev => [...prev, ...incoming])
    } else {
      setSelectedFiles(incoming.slice(0, 1))
      if (activeTab === 'organize') {
        setPageList([])
        setPagesToDelete(new Set())
        setOrgPageCountLoaded(false)
        loadPageCountForOrganize(incoming[0])
      }
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
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
    setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a) }, 500)
  }

  const formatErrorMessage = (detail: any): string => {
    if (!detail) return 'Failed to process document. Please check your files and try again.'
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          const f = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : ''
          const m = item.msg || item.message || 'Invalid input'
          return f ? `Field "${f}": ${m}` : m
        }
        return String(item)
      }).join('; ')
    }
    if (typeof detail === 'object') {
      const f = Array.isArray(detail.loc) ? detail.loc[detail.loc.length - 1] : ''
      const m = detail.msg || detail.message || JSON.stringify(detail)
      return f ? `Field "${f}": ${m}` : m
    }
    return String(detail)
  }

  const handleBlobResponse = async (
    response: any,
    mediaType: string,
    filename: string,
    successMsg: string
  ) => {
    const blob = new Blob([response.data], { type: mediaType })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    setDownloadFilename(filename)
    setSuccessMessage(successMsg)
    triggerDownload(url, filename)
  }

  const handleError = async (err: any) => {
    console.error('PDF Tool error:', err)
    let detail: any = 'Failed to process document. Please check your files and try again.'
    if (err.response?.data) {
      if (err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text)
          if (parsed.detail) detail = parsed.detail
        } catch { /* keep default */ }
      } else if (err.response.data.detail) {
        detail = err.response.data.detail
      }
    }
    setError(formatErrorMessage(detail))
  }

  const handleProcess = async () => {
    if (selectedFiles.length === 0) {
      setError(
        activeTab === 'word-to-pdf' ? 'Please upload a Word (.docx) file first.' :
        activeTab === 'image-to-pdf' ? 'Please upload at least one image file.' :
        'Please upload a PDF file first.'
      )
      return
    }
    if (activeTab === 'merge' && selectedFiles.length < 2) {
      setError('Please select at least 2 PDF files to merge.')
      return
    }
    if (activeTab === 'watermark' && !wmText.trim()) {
      setError('Please enter watermark text.')
      return
    }
    if ((activeTab === 'protect') && !protectPassword.trim()) {
      setError('Please enter a password.')
      return
    }
    if (activeTab === 'organize' && organizeMode === 'delete' && pagesToDelete.size === 0) {
      setError('Please select at least one page to delete.')
      return
    }

    setIsProcessing(true)
    clearResults()

    try {
      const formData = new FormData()

      if (activeTab === 'merge') {
        selectedFiles.forEach(f => formData.append('files', f))
        const r = await api.post('/tools/pdf/merge', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', 'merged_document.pdf', 'PDFs merged successfully!')

      } else if (activeTab === 'split') {
        formData.append('file', selectedFiles[0])
        formData.append('page_range', pageRange.trim())
        const r = await api.post('/tools/pdf/split', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        const isZip = !pageRange.trim()
        const fn = isZip ? 'split_pages.zip' : 'split_pages.pdf'
        await handleBlobResponse(r, isZip ? 'application/zip' : 'application/pdf', fn, 'PDF split successfully!')

      } else if (activeTab === 'compress') {
        formData.append('file', selectedFiles[0])
        const r = await api.post('/tools/pdf/compress', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', 'compressed_document.pdf', 'PDF compressed successfully!')

      } else if (activeTab === 'to-word') {
        formData.append('file', selectedFiles[0])
        const r = await api.post('/tools/pdf/to-word', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        const fn = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.docx'
        await handleBlobResponse(r, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fn, 'PDF converted to Word successfully!')

      } else if (activeTab === 'word-to-pdf') {
        formData.append('file', selectedFiles[0])
        const r = await api.post('/tools/pdf/word-to-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        const fn = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.pdf'
        await handleBlobResponse(r, 'application/pdf', fn, 'Word document converted to PDF successfully!')

      } else if (activeTab === 'extract-text') {
        formData.append('file', selectedFiles[0])
        const r = await api.post('/tools/pdf/extract-text', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        setExtractedData(r.data)
        setSuccessMessage('Text extracted successfully!')

      } else if (activeTab === 'rotate') {
        formData.append('file', selectedFiles[0])
        formData.append('angle', String(rotateAngle))
        formData.append('page_range', rotatePageRange.trim())
        const r = await api.post('/tools/pdf/rotate', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '_rotated.pdf', `PDF rotated ${rotateAngle}° successfully!`)

      } else if (activeTab === 'watermark') {
        formData.append('file', selectedFiles[0])
        formData.append('watermark_text', wmText)
        formData.append('opacity', String(wmOpacity))
        formData.append('position', wmPosition)
        const r = await api.post('/tools/pdf/watermark', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '_watermarked.pdf', 'Watermark added successfully!')

      } else if (activeTab === 'protect') {
        formData.append('file', selectedFiles[0])
        formData.append('password', protectPassword)
        const endpoint = protectMode === 'add' ? '/tools/pdf/add-password' : '/tools/pdf/remove-password'
        const suffix = protectMode === 'add' ? '_protected.pdf' : '_unlocked.pdf'
        const msg = protectMode === 'add' ? 'Password added successfully!' : 'Password removed successfully!'
        const r = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', selectedFiles[0].name.replace(/\.[^/.]+$/, '') + suffix, msg)

      } else if (activeTab === 'organize') {
        formData.append('file', selectedFiles[0])
        formData.append('operation', organizeMode)
        if (organizeMode === 'reorder') {
          formData.append('page_data', JSON.stringify(pageList))
        } else {
          formData.append('page_data', JSON.stringify(Array.from(pagesToDelete)))
        }
        const r = await api.post('/tools/pdf/organize', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        const suffix = organizeMode === 'reorder' ? '_reordered.pdf' : '_pages_deleted.pdf'
        const msg = organizeMode === 'reorder' ? 'Pages reordered successfully!' : 'Pages deleted successfully!'
        await handleBlobResponse(r, 'application/pdf', selectedFiles[0].name.replace(/\.[^/.]+$/, '') + suffix, msg)

      } else if (activeTab === 'image-to-pdf') {
        selectedFiles.forEach(f => formData.append('files', f))
        const r = await api.post('/tools/pdf/image-to-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' })
        await handleBlobResponse(r, 'application/pdf', 'images_combined.pdf', 'Images converted to PDF successfully!')
      }
    } catch (err: any) {
      await handleError(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Organize drag handlers ────────────────────────────────────────────────
  const handleDragStart = (index: number) => { dragItem.current = index }
  const handleDragEnter = (index: number) => { dragOver.current = index }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const newList = [...pageList]
    const dragged = newList.splice(dragItem.current, 1)[0]
    newList.splice(dragOver.current, 0, dragged)
    setPageList(newList)
    dragItem.current = null
    dragOver.current = null
  }

  const toggleDeletePage = (pageNum: number) => {
    setPagesToDelete(prev => {
      const next = new Set(prev)
      next.has(pageNum) ? next.delete(pageNum) : next.add(pageNum)
      return next
    })
  }

  // ── Styles helper ─────────────────────────────────────────────────────────
  const tabCls = (id: ToolTab) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 min-h-[44px] ${
      activeTab === id
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs'
        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
    }`

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden transition-colors duration-200">

      {/* Back Nav */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm transition-colors duration-200">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <FileText className="w-3.5 h-3.5" />
          <span>Standalone Utility</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          PDF Toolkit
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Fast, secure, in-memory PDF and document processing — merge, split, compress, convert, rotate, watermark, protect, organize, and more. Zero tracking.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 scrollbar-none w-full">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            id={`tab-${id}`}
            onClick={e => { e.preventDefault(); handleTabChange(id) }}
            className={tabCls(id)}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 transition-colors duration-200">

        {/* Tool Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300">{TAB_DESCRIPTIONS[activeTab]}</p>

        {/* ── Protect PDF: sub-mode toggle ──────────────────────────────────── */}
        {activeTab === 'protect' && (
          <div className="flex gap-2">
            {(['add', 'remove'] as ProtectMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setProtectMode(m); clearResults() }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  protectMode === m
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {m === 'add' ? <Lock className="w-4 h-4" /> : <UnlockKeyhole className="w-4 h-4" />}
                {m === 'add' ? 'Add Password' : 'Remove Password'}
              </button>
            ))}
          </div>
        )}

        {/* ── Organize: sub-mode toggle ─────────────────────────────────────── */}
        {activeTab === 'organize' && (
          <div className="flex gap-2">
            {(['reorder', 'delete'] as OrganizeMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setOrganizeMode(m); setPagesToDelete(new Set()); clearResults() }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  organizeMode === m
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                {m === 'reorder' ? 'Reorder Pages' : 'Delete Pages'}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload Zone ──────────────────────────────────────────────────────── */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAccept(activeTab)}
            multiple={isMultiFile(activeTab)}
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-file-input"
          />
          <div className="w-12 h-12 bg-white dark:bg-slate-900 group-hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-500/30 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mx-auto transition-all">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {activeTab === 'word-to-pdf'
                ? 'Click to upload or drag & drop Word (.docx) files'
                : activeTab === 'image-to-pdf'
                  ? 'Click to upload or drag & drop JPEG / PNG images'
                  : 'Click to upload or drag & drop PDF files'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Maximum file size: 20MB per file</p>
          </div>
        </div>

        {/* ── File List ─────────────────────────────────────────────────────────── */}
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
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); handleRemoveFile(idx) }}
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

        {/* ── Tab-specific extra inputs ─────────────────────────────────────────── */}

        {/* Split: page range */}
        {activeTab === 'split' && selectedFiles.length > 0 && (
          <div>
            <label className={labelCls}>Page Range (Optional)</label>
            <input
              type="text"
              value={pageRange}
              onChange={e => setPageRange(e.target.value)}
              placeholder="e.g. 1-3, 5, 8-10 (Leave blank to split all pages into ZIP)"
              className={inputCls}
            />
          </div>
        )}

        {/* Rotate: angle + optional page range */}
        {activeTab === 'rotate' && selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Rotation Angle</label>
              <div className="flex gap-2">
                {([90, 180, 270] as const).map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setRotateAngle(a)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                      rotateAngle === a
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Page Range (Optional)</label>
              <input
                type="text"
                value={rotatePageRange}
                onChange={e => setRotatePageRange(e.target.value)}
                placeholder="e.g. 1-3, 5 (Leave blank to rotate all pages)"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Watermark: text + opacity + position */}
        {activeTab === 'watermark' && selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Watermark Text</label>
              <input
                type="text"
                value={wmText}
                onChange={e => setWmText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Opacity — {Math.round(wmOpacity * 100)}%</label>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(wmOpacity * 100)}
                onChange={e => setWmOpacity(Number(e.target.value) / 100)}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className={labelCls}>Position</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'diagonal', label: 'Diagonal' },
                  { value: 'center', label: 'Center' },
                  { value: 'top-left', label: 'Top Left' },
                  { value: 'top-right', label: 'Top Right' },
                  { value: 'bottom-left', label: 'Bottom Left' },
                  { value: 'bottom-right', label: 'Bottom Right' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWmPosition(value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      wmPosition === value
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Protect: password input */}
        {activeTab === 'protect' && selectedFiles.length > 0 && (
          <div>
            <label className={labelCls}>
              {protectMode === 'add' ? 'New Password' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={protectPassword}
                onChange={e => setProtectPassword(e.target.value)}
                placeholder={protectMode === 'add' ? 'Enter password to set' : 'Enter current PDF password'}
                className={inputCls + ' pr-12'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}

        {/* Organize: page list */}
        {activeTab === 'organize' && selectedFiles.length > 0 && (
          <div className="space-y-3">
            {!orgPageCountLoaded ? (
              <p className="text-xs text-slate-500 italic">
                Loading page list… (or enter page numbers manually below and submit)
              </p>
            ) : orgPageCount === 0 ? (
              <p className="text-xs text-slate-500 italic">Could not load page previews.</p>
            ) : (
              <>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  {organizeMode === 'reorder'
                    ? `Pages — drag to reorder (${pageList.length} total)`
                    : `Pages — click to mark for deletion (${pagesToDelete.size} selected)`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(organizeMode === 'reorder' ? pageList : Array.from({ length: orgPageCount }, (_, i) => i + 1)).map((pageNum, idx) => (
                    <div
                      key={`${pageNum}-${idx}`}
                      draggable={organizeMode === 'reorder'}
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => organizeMode === 'delete' && toggleDeletePage(pageNum)}
                      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all select-none ${
                        organizeMode === 'delete' && pagesToDelete.has(pageNum)
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 line-through'
                          : organizeMode === 'reorder'
                            ? 'bg-slate-800 border-slate-700 text-slate-300 cursor-grab active:cursor-grabbing hover:border-emerald-500/40'
                            : 'bg-slate-800 border-slate-700 text-slate-300 cursor-pointer hover:border-rose-500/40'
                      }`}
                    >
                      {organizeMode === 'reorder' && <GripVertical className="w-3 h-3 text-slate-500" />}
                      {organizeMode === 'delete' && pagesToDelete.has(pageNum) && <X className="w-3 h-3" />}
                      Page {pageNum}
                    </div>
                  ))}
                </div>
                {organizeMode === 'reorder' && (
                  <p className="text-xs text-slate-500">New order: {pageList.join(' → ')}</p>
                )}
                {organizeMode === 'delete' && pagesToDelete.size > 0 && (
                  <p className="text-xs text-slate-500">
                    Will delete pages: {Array.from(pagesToDelete).sort((a,b)=>a-b).join(', ')}
                  </p>
                )}
              </>
            )}

            {/* Manual fallback for organize when pdf.js isn't available */}
            {!orgPageCountLoaded && organizeMode === 'reorder' && (
              <div>
                <label className={labelCls}>New Page Order (comma-separated, 1-indexed)</label>
                <input
                  type="text"
                  value={pageList.join(',')}
                  onChange={e => {
                    const nums = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                    setPageList(nums)
                  }}
                  placeholder="e.g. 3,1,2,4"
                  className={inputCls}
                />
              </div>
            )}
            {!orgPageCountLoaded && organizeMode === 'delete' && (
              <div>
                <label className={labelCls}>Pages to Delete (comma-separated, 1-indexed)</label>
                <input
                  type="text"
                  value={Array.from(pagesToDelete).sort((a,b)=>a-b).join(',')}
                  onChange={e => {
                    const nums = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                    setPagesToDelete(new Set(nums))
                  }}
                  placeholder="e.g. 2,4"
                  className={inputCls}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Status Alerts ─────────────────────────────────────────────────────── */}
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

        {/* ── Process Button ────────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            id="process-btn"
            onClick={e => { e.preventDefault(); handleProcess() }}
            disabled={isProcessing || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <span>Process</span>
            )}
          </button>
        </div>

        {/* ── Download Result ───────────────────────────────────────────────────── */}
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

        {/* ── Extract Text Display ──────────────────────────────────────────────── */}
        {activeTab === 'extract-text' && extractedData && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Extracted Text ({extractedData.total_pages} Pages)
              </h3>
              <button
                type="button"
                onClick={e => {
                  e.preventDefault()
                  navigator.clipboard.writeText(extractedData.full_text)
                  setCopiedText(true)
                  setTimeout(() => setCopiedText(false), 2000)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copiedText ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Copied!</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy Full Text</span></>}
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
