import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  LogOut,
  CheckCircle2,
  Target,
  ArrowRight,
  Plus,
  Search,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Mic,
  MicOff,
  Paperclip,
  FileText,
  AlertCircle
} from 'lucide-react'
import { SuggestionsList, SuggestionItem } from '../components/ui/SuggestionsList'
import { CalendarConfirmModal } from '../components/ui/CalendarConfirmModal'
import { getAgentTheme } from '../lib/agentTheme'
import api from '../lib/api'


interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  agent_used?: string
  tasks_created?: any[]
  goals_created?: any[]
  suggestions_created?: SuggestionItem[]
  created_at: string
  session_id?: number
}

interface ChatSession {
  id: number
  title: string
  last_agent_used?: string
  created_at: string
  updated_at: string
}

interface SessionDocument {
  id: number
  session_id: number
  filename: string
  file_type: string
  uploaded_at: string
}

function formatMessageContent(content: string): string {
  if (!content) return ''
  let text = content.trim()

  if (text.includes('"response_text"')) {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const jsonCandidate = cleaned.substring(start, end + 1)
        const parsed = JSON.parse(jsonCandidate)
        if (parsed && typeof parsed.response_text === 'string') {
          return parsed.response_text
        }
      }
    } catch (e) {
      const match = text.match(/"response_text"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"(?:tasks|goals|resources|practice_questions|suggestions)"|\s*})/)
      if (match && match[1]) {
        return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      }
    }
  }

  if (text.startsWith('```json') && text.endsWith('```')) {
    const lines = text.split('\n')
    lines.shift()
    lines.pop()
    text = lines.join('\n').trim()
  }

  return text
}

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatCalendarTask, setChatCalendarTask] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleConfirmChatSchedule = async (startTime: string, durationMinutes: number) => {
    if (!chatCalendarTask) return
    try {
      const res = await api.post(`/tasks/${chatCalendarTask.id}/sync-calendar?start_time=${startTime}&duration=${durationMinutes}`)
      if (res.data?.calendar_launch_url) {
        window.open(res.data.calendar_launch_url, '_blank')
      }
      window.dispatchEvent(new Event('lifeos_data_updated'))
    } catch (err) {
      console.error('Failed to schedule calendar event:', err)
    } finally {
      setChatCalendarTask(null)
    }
  }

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  // Sidebar toggle (default closed on mobile < 1024px, open on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true))

  // Menu and rename states
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Fetch all chat sessions
  const fetchSessions = async (selectFirst: boolean = false) => {
    try {
      const response = await api.get('/chat-sessions/')
      const fetchedSessions: ChatSession[] = response.data || []
      setSessions(fetchedSessions)

      if (selectFirst && fetchedSessions.length > 0 && !activeSessionId) {
        setActiveSessionId(fetchedSessions[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error)
    }
  }

  // Fetch messages for active session
  const fetchSessionMessages = async (sessionId: number) => {
    setIsLoadingHistory(true)
    try {
      const response = await api.get(`/chat-sessions/${sessionId}/messages`)
      setMessages(response.data || [])
    } catch (error) {
      console.error('Failed to fetch session messages:', error)
      setMessages([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const response = await api.get('/chat-sessions/')
        const fetchedSessions: ChatSession[] = response.data || []
        setSessions(fetchedSessions)

        if (fetchedSessions.length > 0) {
          setActiveSessionId(fetchedSessions[0].id)
          await fetchSessionMessages(fetchedSessions[0].id)
        } else {
          setIsLoadingHistory(false)
        }
      } catch (error) {
        console.error('Error during initial chat session load:', error)
        setIsLoadingHistory(false)
      }
    }
    init()
  }, [])

  // Switch active session
  useEffect(() => {
    if (activeSessionId !== null) {
      fetchSessionMessages(activeSessionId)
      fetchSessionDocuments(activeSessionId)
    } else {
      setSessionDocuments([])
    }
  }, [activeSessionId])

  // Debounced search for chat sessions (matching titles & message content)
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        if (!searchQuery.trim()) {
          const response = await api.get('/chat-sessions/')
          setSessions(response.data || [])
        } else {
          const response = await api.get(`/chat-sessions/search?q=${encodeURIComponent(searchQuery.trim())}`)
          setSessions(response.data || [])
        }
      } catch (error) {
        console.error('Error searching chat sessions:', error)
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    scrollToBottom()
  }, [messages])


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Create new session
  const handleNewChat = async () => {
    try {
      const response = await api.post('/chat-sessions/', { title: 'New Chat' })
      const newSession: ChatSession = response.data
      setSessions((prev) => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setMessages([])
    } catch (error) {
      console.error('Failed to create new chat session:', error)
    }
  }
  
  // Attachment states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ready'>('idle')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState<boolean>(false)
  const [sessionDocuments, setSessionDocuments] = useState<SessionDocument[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch attached documents for active session
  const fetchSessionDocuments = async (sessionId: number) => {
    try {
      const response = await api.get(`/chat-sessions/${sessionId}/documents`)
      setSessionDocuments(response.data || [])
    } catch (error) {
      console.error('Failed to fetch session documents:', error)
      setSessionDocuments([])
    }
  }

  // File selection and validation handler
  const handleFileSelect = (file: File | undefined) => {
    setIsPlusMenuOpen(false)
    if (!file) return

    const filename = file.name
    const ext = filename.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['pdf', 'docx', 'doc', 'txt', 'jpg', 'jpeg', 'png']

    if (!ext || !allowedExtensions.includes(ext)) {
      setFileError('Unsupported file type. Accepted formats: PDF, DOCX, TXT, JPG, PNG.')
      setSelectedFile(null)
      setUploadStatus('idle')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setFileError('File size exceeds maximum limit of 15MB.')
      setSelectedFile(null)
      setUploadStatus('idle')
      return
    }

    setFileError(null)
    setSelectedFile(file)
    setUploadStatus('uploading')

    setTimeout(() => {
      setUploadStatus('ready')
    }, 350)
  }

  // Rename session
  const handleRenameSession = async (sessionId: number) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null)
      return
    }
    try {
      const response = await api.patch(`/chat-sessions/${sessionId}`, { title: editingTitle.trim() })
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: response.data.title } : s))
      )
    } catch (error) {
      console.error('Failed to rename chat session:', error)
    } finally {
      setEditingSessionId(null)
      setEditingTitle('')
      setMenuOpenId(null)
    }
  }

  // Delete session
  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpenId(null)
    if (!window.confirm('Are you sure you want to delete this chat session?')) return

    try {
      await api.delete(`/chat-sessions/${sessionId}`)
      const updated = sessions.filter((s) => s.id !== sessionId)
      setSessions(updated)
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id)
        } else {
          setActiveSessionId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error)
    }
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || isLoading) return

    const userMessageText = input.trim() || (selectedFile ? `Analyzing attached document: ${selectedFile.name}` : '')
    const fileToUpload = selectedFile
    setInput('')
    setSelectedFile(null)
    setUploadStatus('idle')
    setFileError(null)
    setIsLoading(true)

    const tempUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: fileToUpload ? `${userMessageText}\n📎 [Attached: ${fileToUpload.name}]` : userMessageText,
      created_at: new Date().toISOString(),
      session_id: activeSessionId || undefined
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const formData = new FormData()
      if (userMessageText) {
        formData.append('message', userMessageText)
      }
      if (activeSessionId) {
        formData.append('session_id', String(activeSessionId))
      }
      if (fileToUpload) {
        formData.append('file', fileToUpload)
      }

      const response = await api.post('/chat/message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { response: assistantResponse, agent_used, tasks_created, goals_created, suggestions_created } = response.data

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: assistantResponse,
        agent_used,
        tasks_created,
        goals_created,
        suggestions_created,
        created_at: new Date().toISOString(),
        session_id: activeSessionId || undefined
      }

      setMessages((prev) => [...prev, assistantMessage])
      window.dispatchEvent(new Event('lifeos_data_updated'))
      await fetchSessions(false)
      if (activeSessionId) {
        await fetchSessionDocuments(activeSessionId)
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      const detail = error.response?.data?.detail || 'Failed to upload or parse file. Please try again.'
      setFileError(detail)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  // Format relative time (e.g., "2h ago", "10m ago", "3d ago")
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Group chat sessions by date category (Today, Yesterday, Previous 7 Days, Older)
  const groupSessionsByDate = (sessionList: ChatSession[]) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
    const sevenDaysAgoStart = todayStart - 6 * 24 * 60 * 60 * 1000

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    }

    sessionList.forEach((session) => {
      const sessionTime = new Date(session.updated_at || session.created_at).getTime()
      if (sessionTime >= todayStart) {
        groups.Today.push(session)
      } else if (sessionTime >= yesterdayStart) {
        groups.Yesterday.push(session)
      } else if (sessionTime >= sevenDaysAgoStart) {
        groups['Previous 7 Days'].push(session)
      } else {
        groups.Older.push(session)
      }
    })

    return groups
  }

  const groupedSessions = groupSessionsByDate(sessions)

  return (
    <div className='flex h-[calc(100vh-6rem)] min-h-[500px] bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative w-full max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200'>
      {/* Mobile Backdrop Overlay when Sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className='lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40'
        />
      )}

      {/* LEFT SIDEBAR (Fixed Drawer on Mobile/Tablet, Column on Desktop) */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-all duration-300 z-50 lg:z-20 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'
        }`}
      >
        {/* Top Header / New Chat */}
        <div className='p-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => navigate('/')}
              className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px]'
            >
              <ArrowLeft className='w-3.5 h-3.5' /> Dashboard
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className='text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
              title='Close Sidebar'
            >
              <PanelLeftClose className='w-4 h-4' />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className='w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2'
          >
            <Plus className='w-4 h-4' />
            <span>New Chat</span>
          </button>

          {/* Search Bar */}
          <div className='relative'>
            <Search className='w-4 h-4 absolute left-3 top-2.5 text-slate-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search chats...'
              className='w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
            />
          </div>
        </div>

        {/* Scrollable Chat Sessions List grouped by date */}
        <div className='flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800'>
          {Object.entries(groupedSessions).map(([groupTitle, groupItems]) => {
            if (groupItems.length === 0) return null
            return (
              <div key={groupTitle} className='space-y-1.5'>
                <div className='px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider'>
                  {groupTitle}
                </div>
                {groupItems.map((session) => {
                  const isActive = activeSessionId === session.id
                  const isEditing = editingSessionId === session.id

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!isEditing) setActiveSessionId(session.id)
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className='flex items-center gap-2.5 min-w-0 flex-1 pr-2'>
                        <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        {isEditing ? (
                          <div className='flex items-center gap-1 w-full' onClick={(e) => e.stopPropagation()}>
                            <input
                              type='text'
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSession(session.id)
                                if (e.key === 'Escape') setEditingSessionId(null)
                              }}
                              autoFocus
                              className='w-full px-2 py-0.5 bg-white dark:bg-slate-950 border border-indigo-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none'
                            />
                            <button
                              onClick={() => handleRenameSession(session.id)}
                              className='text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 p-0.5'
                            >
                              <Check className='w-3.5 h-3.5' />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className='text-slate-400 hover:text-slate-600 p-0.5'
                            >
                              <X className='w-3.5 h-3.5' />
                            </button>
                          </div>
                        ) : (
                          <div className='truncate flex-1 flex flex-col'>
                            <span className='truncate text-slate-800 dark:text-slate-200'>{session.title}</span>
                            <span className='text-[10px] text-slate-400 font-normal'>
                              {formatRelativeTime(session.updated_at || session.created_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Dropdown Options ("...") */}
                      {!isEditing && (
                        <div className='relative shrink-0' onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === session.id ? null : session.id)}
                            className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all ${
                              menuOpenId === session.id ? 'opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : ''
                            }`}
                          >
                            <MoreVertical className='w-3.5 h-3.5' />
                          </button>

                          {menuOpenId === session.id && (
                            <div className='absolute right-0 top-6 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-30 py-1 text-xs'>
                              <button
                                onClick={() => {
                                  setEditingSessionId(session.id)
                                  setEditingTitle(session.title)
                                  setMenuOpenId(null)
                                }}
                                className='w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2'
                              >
                                <Edit2 className='w-3.5 h-3.5 text-slate-400' />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className='w-full px-3 py-1.5 text-left text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 flex items-center gap-2'
                              >
                                <Trash2 className='w-3.5 h-3.5 text-rose-500 dark:text-rose-400' />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* User Footer */}
        <div className='p-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between'>
          <div className='flex items-center gap-2 px-2'>
            <div className='w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white'>
              AI
            </div>
            <span className='text-xs font-medium text-slate-700 dark:text-slate-300'>Redora AI Workspace</span>
          </div>
          <button
            onClick={handleLogout}
            className='p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors'
            title='Sign Out'
          >
            <LogOut className='w-4 h-4' />
          </button>
        </div>
      </aside>

      {/* MAIN CHAT PANEL */}
      <div className='flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-200'>
        {/* Header */}
        <header className='bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors duration-200'>
          <div className='flex items-center gap-3'>
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                title='Open Sidebar'
              >
                <PanelLeftOpen className='w-5 h-5' />
              </button>
            )}
            <h1 className='text-lg font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate max-w-md'>
              <Bot className='w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0' />
              <span className='truncate'>
                {sessions.find((s) => s.id === activeSessionId)?.title || 'AI Agents Chat'}
              </span>
            </h1>

            {sessionDocuments.length > 0 && (
              <div className='flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-xs shadow-2xs' title={sessionDocuments.map(d => d.filename).join(', ')}>
                <FileText className='w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0' />
                <span className='truncate'>
                  {sessionDocuments[sessionDocuments.length - 1].filename}
                  {sessionDocuments.length > 1 ? ` (+${sessionDocuments.length - 1})` : ''}
                </span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate('/tasks')}
              className='text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors min-h-[38px]'
            >
              Tasks
            </button>
            <button
              onClick={() => navigate('/goals')}
              className='text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors min-h-[38px]'
            >
              Goals
            </button>
          </div>
        </header>

        {/* Messages Scroll Area */}
        <main className='flex-1 overflow-y-auto px-6 py-8'>
          <div className='max-w-4xl mx-auto space-y-6'>
            {isLoadingHistory ? (
              <div className='flex items-center justify-center py-20 text-slate-500 gap-2 font-medium text-sm'>
                <Sparkles className='w-5 h-5 animate-spin text-indigo-600' />
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className='text-center py-16 bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm max-w-lg mx-auto'>
                <div className='w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4'>
                  <Sparkles className='w-6 h-6' />
                </div>
                <h2 className='text-xl font-serif font-bold text-slate-900 mb-2'>
                  Start a Conversation with AI Agents
                </h2>
                <p className='text-slate-500 text-sm leading-relaxed mb-6'>
                  Ask for a study roadmap, interview prep steps, coding plan, or expense log. Your agents will automatically record real tasks, goals, and budget insights!
                </p>
                <div className='flex flex-wrap justify-center gap-2'>
                  <button
                    onClick={() => setInput('Get Placed in Product Company')}
                    className='text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-2 rounded-xl text-slate-700 transition-colors border border-slate-200/60'
                  >
                    🚀 Multi-Agent Goal: Product Company Placement
                  </button>
                  <button
                    onClick={() => setInput('Log an expense of $45 for grocery shopping today')}
                    className='text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 px-3 py-2 rounded-xl text-slate-700 transition-colors border border-slate-200/60'
                  >
                    💰 Log $45 Expense (Finance Agent)
                  </button>
                  <button
                    onClick={() => setInput('How is my Data Structures & Algorithms practice going today?')}
                    className='text-xs bg-slate-100 hover:bg-purple-50 hover:text-purple-600 px-3 py-2 rounded-xl text-slate-700 transition-colors border border-slate-200/60'
                  >
                    🔄 Progress Check-in (DSA Prep)
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={
                      'max-w-2xl rounded-2xl p-5 shadow-sm space-y-2 ' +
                      (message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none')
                    }
                  >
                    {message.agent_used && message.role === 'assistant' && (() => {
                      const theme = getAgentTheme(message.agent_used)
                      return (
                        <div className='flex items-center gap-2 mb-2 flex-wrap'>
                          <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badge}`}>
                            <Bot className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                            <span>{theme.name}</span>
                          </div>
                          {message.content.includes('Multi-Agent') && (
                            <span className='inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full shadow-xs'>
                              ✨ Cross-Agent Thread
                            </span>
                          )}
                        </div>
                      )
                    })()}

                    <div className='whitespace-pre-wrap leading-relaxed text-sm'>{formatMessageContent(message.content)}</div>

                    {/* Inline Action Confirmation Chips */}
                    {message.role === 'assistant' &&
                      ((message.tasks_created && message.tasks_created.length > 0) ||
                        (message.goals_created && message.goals_created.length > 0)) && (
                        <div className='mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs'>
                          {message.tasks_created && message.tasks_created.length > 0 && (
                            <>
                              <button
                                onClick={() => navigate('/tasks')}
                                className='inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold transition-all shadow-sm'
                                title='Click to view added tasks'
                              >
                                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                                <span>✓ Added {message.tasks_created.length} Task(s)</span>
                              </button>
                              <button
                                onClick={() => setChatCalendarTask(message.tasks_created![0])}
                                className='inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-semibold transition-all shadow-sm'
                                title='Ask user to confirm and schedule task in Google Calendar'
                              >
                                <span>📆 Schedule in Google Calendar</span>
                              </button>
                            </>
                          )}
                          {message.goals_created && message.goals_created.length > 0 && (
                            <button
                              onClick={() => navigate('/goals')}
                              className='inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-full text-xs font-semibold transition-all shadow-sm'
                              title='Click to view added goals'
                            >
                              <Target className='w-3.5 h-3.5 text-teal-600' />
                              <span>✓ Added to your Goals</span>
                            </button>
                          )}
                        </div>
                      )}

                    {/* Render Proactive Suggestions if present */}
                    {message.role === 'assistant' && message.suggestions_created && message.suggestions_created.length > 0 && (
                      <div className='mt-3 pt-3 border-t border-slate-100'>
                        <SuggestionsList suggestions={message.suggestions_created} compact={true} />
                      </div>
                    )}

                    {/* Return to Dashboard link button */}
                    {message.role === 'assistant' && (
                      <div className='mt-2 pt-2 border-t border-slate-100 flex justify-end'>
                        <button
                          onClick={() => navigate('/')}
                          className='inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl transition-all'
                        >
                          <span>View Updated Activity Feed on Dashboard</span>
                          <ArrowRight className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    )}

                    <div
                      className={
                        'text-[11px] pt-1 text-right ' +
                        (message.role === 'user' ? 'text-indigo-200' : 'text-slate-400')
                      }
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className='flex justify-start'>
                <div className='bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border border-indigo-500/30 rounded-2xl rounded-bl-none p-5 shadow-lg max-w-xl space-y-3'>
                  <div className='flex items-center justify-between text-xs font-semibold text-indigo-300 uppercase tracking-wider'>
                    <span className='flex items-center gap-2'>
                      <Sparkles className='w-4 h-4 text-indigo-400 animate-spin' />
                      Processing Request
                    </span>
                    <span className='animate-pulse'>Executing...</span>
                  </div>

                  <p className='text-xs text-indigo-200/80 leading-relaxed'>
                    Redora AI Agent is evaluating your input, executing requested tool actions, and updating your workspace...
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Dynamic Progress Check-in Chips */}
        <div className='bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200/60 dark:border-slate-800 px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none transition-colors duration-200'>
          <span className='text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0'>
            🤖 Agent Check-ins:
          </span>
          <button
            onClick={() => setInput("How's my DSA practice going today? Give me a quick progress check-in!")}
            className='text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap transition-colors shadow-xs'
          >
            🔄 How's my DSA practice going today?
          </button>
          <button
            onClick={() => setInput("Review my current budget and monthly savings goals.")}
            className='text-xs bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap transition-colors shadow-xs'
          >
            💳 Review budget & savings goals
          </button>
          <button
            onClick={() => setInput("Check in on my placement preparation progress.")}
            className='text-xs bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-300 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap transition-colors shadow-xs'
          >
            🎯 Check placement prep progress
          </button>
        </div>

        {/* Input Footer */}
        <footer className='bg-white border-t border-slate-200/80 px-6 py-4 sticky bottom-0 z-10 space-y-2.5'>
          {/* Hidden File Picker Input */}
          <input
            type='file'
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            accept='.pdf,.docx,.doc,.txt,.jpg,.jpeg,.png'
            className='hidden'
          />

          {/* Selected File Chip */}
          {selectedFile && (
            <div className='max-w-4xl mx-auto flex items-center justify-between bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs text-indigo-900 shadow-2xs'>
              <div className='flex items-center gap-2 truncate'>
                <FileText className='w-4 h-4 text-indigo-600 shrink-0' />
                <span className='font-semibold truncate max-w-sm'>{selectedFile.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  uploadStatus === 'uploading' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Ready'}
                </span>
              </div>
              <button
                type='button'
                onClick={() => {
                  setSelectedFile(null)
                  setUploadStatus('idle')
                }}
                className='text-indigo-400 hover:text-indigo-700 p-1 hover:bg-indigo-100 rounded-md transition-colors'
                title='Remove file'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
          )}

          {/* Inline Error Message Banner */}
          {fileError && (
            <div className='max-w-4xl mx-auto flex items-center justify-between bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl text-xs text-rose-700 font-medium shadow-2xs'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 text-rose-500 shrink-0' />
                <span>{fileError}</span>
              </div>
              <button
                type='button'
                onClick={() => setFileError(null)}
                className='text-rose-400 hover:text-rose-700 p-1 hover:bg-rose-100 rounded-md transition-colors'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
          )}

          {/* Input Controls Bar */}
          <div className='max-w-4xl mx-auto'>
            <form onSubmit={handleSendMessage} className='flex gap-2.5 items-center'>
              {/* Plus Button with Dropdown Menu */}
              <div className='relative shrink-0'>
                <button
                  type='button'
                  onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                  className='p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center justify-center'
                  title='Add files or photos'
                >
                  <Plus className='w-4 h-4' />
                </button>

                {isPlusMenuOpen && (
                  <div className='absolute left-0 bottom-14 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs'>
                    <button
                      type='button'
                      onClick={() => {
                        setIsPlusMenuOpen(false)
                        fileInputRef.current?.click()
                      }}
                      className='w-full px-3.5 py-2 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 font-medium transition-colors'
                    >
                      <Paperclip className='w-4 h-4 text-indigo-500' />
                      <span>Add files or photos</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Main Input Textfield */}
              <div className='relative flex-1'>
                <input
                  type='text'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? 'Listening to voice...' : 'Ask a question or upload a document/photo...'}
                  className={`w-full pl-4 pr-10 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400 transition-colors ${
                    isListening ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-50/30' : 'border-slate-300'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type='button'
                  onClick={toggleVoiceInput}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                  }`}
                  title={isListening ? 'Stop Listening' : 'Voice Input (Click & Speak)'}
                >
                  {isListening ? <MicOff className='w-4 h-4' /> : <Mic className='w-4 h-4' />}
                </button>
              </div>

              {/* Send Button */}
              <button
                type='submit'
                disabled={isLoading || (!input.trim() && !selectedFile)}
                className='bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 shrink-0'
              >
                <span>Send</span>
                <Send className='w-4 h-4' />
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* Calendar Confirmation Modal for Chat Tasks */}
      {chatCalendarTask && (
        <CalendarConfirmModal
          isOpen={!!chatCalendarTask}
          taskTitle={chatCalendarTask.title}
          dueDate={chatCalendarTask.due_date}
          onClose={() => setChatCalendarTask(null)}
          onConfirm={handleConfirmChatSchedule}
        />
      )}
    </div>
  )

}
