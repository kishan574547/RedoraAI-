import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  Award,
  TrendingUp,
  Paperclip,
  X,
  Bot,
  History,
  Layers,
  Gauge
} from 'lucide-react'

interface QuestionAnswer {
  question_num: number
  question: string
  user_answer: string | null
}

interface SummaryFeedback {
  strengths: string[]
  improvement_areas: string[]
  readiness_score: string
  readiness_note: string
}

interface PastSession {
  session_id: number
  job_title_preview: string
  persona_role: string
  persona_trait: string
  difficulty_level: string
  interview_type: string
  status: string
  questions_count: number
  readiness_score: string | null
  readiness_note: string | null
  created_at: string
  completed_at: string | null
}

const DIFFICULTY_OPTIONS = [
  { id: 'Junior', label: 'Junior / Easy', desc: 'Foundational questions & guided evaluation' },
  { id: 'Mid-Level', label: 'Mid-Level / Medium', desc: 'Standard technical & scenario depth' },
  { id: 'Senior', label: 'Senior / Hard', desc: 'Probing strategic questions & rigorous evaluation' }
]

const INTERVIEW_TYPE_OPTIONS = [
  { id: 'Technical Round', label: 'Technical Round', desc: 'Deep dive into role skills & tools' },
  { id: 'HR Round', label: 'HR Round', desc: 'Career goals, motivation & culture fit' },
  { id: 'Behavioral Round', label: 'Behavioral Round', desc: 'STAR method situational scenarios' },
  { id: 'Full Interview (Mixed)', label: 'Full Interview', desc: 'Balanced mix of technical & behavioral' }
]

export default function MockInterview() {
  // Navigation tab: 'new' | 'history'
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  // Screen view state: 'start' | 'interview' | 'summary'
  const [viewState, setViewState] = useState<'start' | 'interview' | 'summary'>('start')

  // Form / Selection state
  const [jobDescriptionText, setJobDescriptionText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [difficultyLevel, setDifficultyLevel] = useState('Mid-Level')
  const [interviewType, setInterviewType] = useState('Full Interview (Mixed)')
  const [isStarting, setIsStarting] = useState(false)

  // Active Session state
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [personaRole, setPersonaRole] = useState('Hiring Manager')
  const [personaTrait, setPersonaTrait] = useState('Professional & Structured')
  const [currentQuestionNum, setCurrentQuestionNum] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(7)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null)

  // User Answer Input & Speech
  const [answerInput, setAnswerInput] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // End Summary state
  const [summaryFeedback, setSummaryFeedback] = useState<SummaryFeedback | null>(null)
  const [qaHistory, setQaHistory] = useState<QuestionAnswer[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // History List state
  const [historyList, setHistoryList] = useState<PastSession[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch History on Tab click
  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch('/api/v1/tools/mock-interview/history', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data.sessions || [])
      }
    } catch (err) {
      console.error('[MockInterview] Failed to fetch history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

  // View past session summary
  const handleSelectPastSession = async (pastSessionId: number) => {
    setErrorMsg(null)
    try {
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch(`/api/v1/tools/mock-interview/${pastSessionId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (!res.ok) throw new Error('Failed to load past session details')
      const data = await res.json()

      setSessionId(data.session_id)
      setPersonaRole(data.persona_role)
      setPersonaTrait(data.persona_trait)
      setDifficultyLevel(data.difficulty_level || 'Mid-Level')
      setInterviewType(data.interview_type || 'Full Interview (Mixed)')
      setSummaryFeedback(data.summary_feedback)
      setQaHistory(data.questions_and_answers || [])
      setActiveTab('new')
      setViewState('summary')
    } catch (err: any) {
      setErrorMsg(err.message || 'Trouble loading past session')
    }
  }

  // Speech Recognition setup & toggle
  const toggleSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (_) {}
      }
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRec()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (e: any) => {
        if (e.results && e.results[0] && e.results[0][0]) {
          const transcript = e.results[0][0].transcript
          setAnswerInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognition.start()
    } catch (_) {
      setIsListening(false)
    }
  }

  // TTS helper to read interviewer question aloud
  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return
    try {
      window.speechSynthesis.cancel()
      const cleanText = text.replace(/[*#_`>]/g, '').trim()
      const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 400))
      utterance.lang = 'en-US'
      const voices = window.speechSynthesis.getVoices()
      const engVoice = voices.find((v) => v.lang.startsWith('en'))
      if (engVoice) utterance.voice = engVoice
      window.speechSynthesis.speak(utterance)
    } catch (_) {}
  }

  // File Select Handler
  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
      setErrorMsg('Accepted formats: PDF, DOCX, TXT.')
      return
    }
    setErrorMsg(null)
    setSelectedFile(file)
  }

  // Start Session handler
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobDescriptionText.trim() && !selectedFile) {
      setErrorMsg('Please enter a job description or upload a document to proceed.')
      return
    }

    setErrorMsg(null)
    setIsStarting(true)

    try {
      const formData = new FormData()
      if (jobDescriptionText.trim()) {
        formData.append('job_description', jobDescriptionText.trim())
      }
      formData.append('difficulty_level', difficultyLevel)
      formData.append('interview_type', interviewType)
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const token = localStorage.getItem('access_token') || ''
      const res = await fetch('/api/v1/tools/mock-interview/start', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${errText || 'Failed to start session'}`)
      }

      const data = await res.json()
      setSessionId(data.session_id)
      setPersonaRole(data.persona_role)
      setPersonaTrait(data.persona_trait)
      setDifficultyLevel(data.difficulty_level || difficultyLevel)
      setInterviewType(data.interview_type || interviewType)
      setCurrentQuestion(data.first_question)
      setCurrentQuestionNum(1)
      setTotalQuestions(data.total_questions || 7)
      setAcknowledgment(null)
      setAnswerInput('')
      setViewState('interview')
      speakQuestion(data.first_question)
    } catch (err: any) {
      console.error('[MockInterview] Failed to start interview:', err)
      setErrorMsg(err.message || 'Trouble starting interview session — please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  // Submit Answer handler
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answerInput.trim() || !sessionId || isSubmittingAnswer) return

    const userText = answerInput.trim()
    setAnswerInput('')
    setIsSubmittingAnswer(true)
    setErrorMsg(null)

    try {
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch('/api/v1/tools/mock-interview/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: sessionId,
          answer_text: userText
        })
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${errText || 'Failed to submit answer'}`)
      }

      const data = await res.json()

      if (data.is_complete) {
        setSummaryFeedback(data.summary_feedback)
        setQaHistory(data.questions_and_answers || [])
        setViewState('summary')
      } else {
        setAcknowledgment(data.acknowledgment || null)
        setCurrentQuestionNum(data.current_question_num)
        setCurrentQuestion(data.next_question)
        speakQuestion(data.next_question)
      }
    } catch (err: any) {
      console.error('[MockInterview] Answer submission failed:', err)
      setErrorMsg(err.message || 'Trouble processing answer — please try again.')
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  return (
    <div className="flex flex-col space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* TOP NAVBAR HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/chat"
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors shrink-0"
            title="Back to Tools"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              AI Mock Interview Simulator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Roleplay real job interviews with dynamic AI personas derived from your target job description
            </p>
          </div>
        </div>

        {/* TAB CONTROLS & NEW INTERVIEW ACTION */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('new')
              if (viewState === 'summary') setViewState('start')
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'new'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice Room</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Session History</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT BANNER */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: PRACTICE ROOM */}
      {activeTab === 'new' && (
        <>
          {/* VIEW 1: START SCREEN */}
          {viewState === 'start' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Setup Interview Parameters</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configure Target Role & Options</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste the target job description or upload a document, select your target seniority level and interview type focus.
                </p>
              </div>

              <form onSubmit={handleStartInterview} className="space-y-6">
                {/* Job Description Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Job Description Text:
                  </label>
                  <textarea
                    value={jobDescriptionText}
                    onChange={(e) => setJobDescriptionText(e.target.value)}
                    placeholder="Paste job title, key responsibilities, and required qualifications here... (e.g. Senior Frontend Developer with React, TypeScript, and state management experience)"
                    className="w-full h-36 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Hidden File Picker & Attachment Chip */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <span>{selectedFile ? selectedFile.name : 'Upload Job Specification File (PDF/DOCX)'}</span>
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>

                {/* DIFFICULTY LEVEL SELECTOR */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    <span>Select Difficulty / Seniority Level:</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDifficultyLevel(opt.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          difficultyLevel === opt.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* INTERVIEW TYPE SELECTOR */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Select Interview Type / Round Focus:</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {INTERVIEW_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setInterviewType(opt.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          interviewType === opt.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Action Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isStarting || (!jobDescriptionText.trim() && !selectedFile)}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                  >
                    {isStarting ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-white" />
                        <span>Initializing Session & AI Interviewer...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Mock Interview</span>
                        <Briefcase className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 2: ACTIVE INTERVIEW SCREEN */}
          {viewState === 'interview' && (
            <div className="space-y-6">
              {/* Persona Header Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md border border-indigo-400/30 shrink-0">
                    <UserCheck className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white">AI Interviewer</h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        {difficultyLevel}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                        {interviewType}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 font-medium">{personaRole} • {personaTrait}</p>
                  </div>
                </div>

                {/* Progress Badge */}
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Progress</span>
                  <span className="text-sm font-bold text-indigo-300 bg-slate-900/60 px-3 py-1 rounded-full border border-indigo-500/20">
                    Question {currentQuestionNum} of {totalQuestions}
                  </span>
                </div>
              </div>

              {/* Current Question Display Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
                {acknowledgment && (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{acknowledgment}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span>Question #{currentQuestionNum}:</span>
                  </span>
                  <p className="text-lg font-serif font-bold text-slate-900 dark:text-white leading-relaxed">
                    "{currentQuestion}"
                  </p>
                </div>

                {/* Answer Input Area */}
                <form onSubmit={handleSubmitAnswer} className="pt-4 space-y-3">
                  <div className="relative">
                    <textarea
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder={isListening ? 'Listening to your spoken response...' : 'Type or speak your answer clearly here...'}
                      rows={4}
                      className={`w-full p-4 pr-12 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                        isListening ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-50/20' : 'border-slate-200 dark:border-slate-800'
                      }`}
                      disabled={isSubmittingAnswer}
                    />

                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-3 top-3 p-2 rounded-xl transition-colors ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                      title={isListening ? 'Stop Listening' : 'Tap to Record Spoken Answer'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Tip: Use the microphone to practice vocal confidence, or type your answer above.
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmittingAnswer || !answerInput.trim()}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0"
                    >
                      {isSubmittingAnswer ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Answer</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW 3: END SUMMARY SCREEN */}
          {viewState === 'summary' && summaryFeedback && (
            <div className="space-y-6">
              {/* Executive Score & Readiness Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mock Interview Results Summary</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>AI Interviewer ({personaRole})</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                          {difficultyLevel}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                          {interviewType}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-5 py-2.5 rounded-2xl text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Readiness Score</span>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summaryFeedback.readiness_score}</span>
                  </div>
                </div>

                {/* Executive Summary Note */}
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Executive Performance Summary ({difficultyLevel} Standard)
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {summaryFeedback.readiness_note}
                  </p>
                </div>

                {/* Strengths vs Improvement Areas Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths List */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Key Candidate Strengths</span>
                    </div>
                    <ul className="space-y-2">
                      {summaryFeedback.strengths.map((str, i) => (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span>Recommended Action Areas</span>
                    </div>
                    <ul className="space-y-2">
                      {summaryFeedback.improvement_areas.map((imp, i) => (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Complete Q&A Transcript Review */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Full Q&A Interview Transcript ({qaHistory.length} Questions)
                  </h3>
                  <div className="space-y-3">
                    {qaHistory.map((item, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-indigo-500 font-mono">Q{item.question_num}:</span>
                          <span>{item.question}</span>
                        </div>
                        <div className="pl-4 border-l-2 border-indigo-500 text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap">
                          {item.user_answer || '(No answer recorded)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setViewState('start')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    Practice Another Mock Interview
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: SESSION HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Past Mock Interview Sessions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review your past performance summaries, questions, and readiness scores</p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your past interview sessions...</div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <History className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No past interview sessions found. Start your first session above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyList.map((item) => (
                <div
                  key={item.session_id}
                  onClick={() => handleSelectPastSession(item.session_id)}
                  className="bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.persona_role}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                        {item.difficulty_level}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                        {item.interview_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.job_title_preview}
                    </p>

                    <div className="text-[11px] text-slate-400">
                      Date: {new Date(item.created_at).toLocaleDateString()} • {item.questions_count} Questions
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {item.readiness_score ? `Score: ${item.readiness_score}` : 'In Progress'}
                    </div>
                    <span className="text-[11px] text-indigo-500 group-hover:underline font-medium block mt-1">
                      View Full Summary & Transcript →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
