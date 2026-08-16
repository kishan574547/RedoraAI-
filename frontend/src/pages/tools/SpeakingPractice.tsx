import React, { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  MessageSquare,
  BookOpen,
  AlertCircle,
  ArrowLeft,
  Send,
  Coffee,
  Globe,
  Briefcase,
  MessageCircle,
  Square,
  Clock,
  Award,
  CheckCircle2
} from 'lucide-react'
import { Link } from 'react-router-dom'

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'
export type TopicCategory = 'free' | 'daily' | 'travel' | 'work'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
  suggestions?: any[]
  practiceQuestions?: any[]
}

interface TopicOption {
  id: TopicCategory
  title: string
  desc: string
  icon: any
  prompt: string
}

const TOPICS: TopicOption[] = [
  {
    id: 'free',
    title: 'Free Talk',
    desc: 'Casual conversation & open English discussion',
    icon: MessageCircle,
    prompt: "Let's chat freely! Tell me about your day, your hobbies, or anything on your mind today."
  },
  {
    id: 'daily',
    title: 'Daily Life',
    desc: 'Ordering food, shopping & daily routines',
    icon: Coffee,
    prompt: "Welcome to Daily Life practice! Imagine you are ordering coffee at a cafe or describing your morning routine. What would you like to practice?"
  },
  {
    id: 'travel',
    title: 'Travel & Culture',
    desc: 'Airports, hotels & asking directions',
    icon: Globe,
    prompt: "Travel Mode active! Pretend you just landed at an international airport or are asking for directions to a museum. How can I help you?"
  },
  {
    id: 'work',
    title: 'Work & Interviews',
    desc: 'Job interview prep & professional English',
    icon: Briefcase,
    prompt: "Professional Mode active! Practice your 60-second elevator pitch or answer behavioral interview questions like 'Tell me about yourself'."
  }
]

// Helper to clean raw LLM output or markdown formatting for speech synthesis and clean display
const extractCleanSpeechText = (rawText: string): string => {
  if (!rawText) return ""
  let text = rawText
  if (text.includes('"response_text"')) {
    try {
      const cleanedJson = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      const start = cleanedJson.indexOf('{')
      const end = cleanedJson.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(cleanedJson.substring(start, end + 1))
        if (parsed.response_text && typeof parsed.response_text === 'string') {
          text = parsed.response_text
        }
      }
    } catch (_) {}
  }
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~`]/g, '')
    .trim()
}

export default function SpeakingPractice() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory>('free')
  const [isHandsFree, setIsHandsFree] = useState<boolean>(false)
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false)
  const [micVolume, setMicVolume] = useState<number>(0)
  const [speechCadence, setSpeechCadence] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [textInput, setTextInput] = useState<string>('')
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false)

  // Session Statistics
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now())
  const [sessionDuration, setSessionDuration] = useState<number>(0)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: TOPICS[0].prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  const [transcript, setTranscript] = useState('')

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Speech Recognition & State refs to avoid stale closures
  const recognitionRef = useRef<any>(null)
  const latestTranscriptRef = useRef<string>('')
  const isListeningRef = useRef<boolean>(false)
  const isProcessingRef = useRef<boolean>(false)
  const cadenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMounted = useRef<boolean>(true)
  const isHandsFreeRef = useRef<boolean>(false)

  // Sync ref with state
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree
  }, [isHandsFree])

  // Timer for session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionStartTime])

  // Pre-load speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }, [])

  // Setup Web Speech API (SpeechRecognition)
  useEffect(() => {
    isComponentMounted.current = true

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        isListeningRef.current = true
        setAssistantState('listening')
        setErrorMsg(null)
      }

      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript)
          latestTranscriptRef.current = currentTranscript
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        stopMicAnalyser()
        isListeningRef.current = false
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setErrorMsg(`Microphone error: ${event.error}. Please try again.`)
        }
        if (!isProcessingRef.current) {
          setAssistantState('idle')
        }
      }

      recognition.onend = () => {
        stopMicAnalyser()
        const textToProcess = latestTranscriptRef.current.trim()
        isListeningRef.current = false

        if (textToProcess && !isProcessingRef.current) {
          // Automatically submit captured user speech when user stops speaking!
          processUserSpeech(textToProcess)
        } else if (!isProcessingRef.current) {
          setAssistantState('idle')
        }
      }

      recognitionRef.current = recognition
    } else {
      setErrorMsg('Web Speech API is not supported in this browser. You can still use the text input below to practice!')
    }

    return () => {
      isComponentMounted.current = false
      stopMicAnalyser()
      stopSpeakingCadence()
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Web Audio API: Live Mic Volume Tracking (getByteFrequencyData)
  const startMicAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioCtx()
      audioCtxRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        if (!analyserRef.current || !isComponentMounted.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        const normalized = Math.min(1, average / 60) // Normalize volume 0 to 1
        setMicVolume(normalized)
        animFrameRef.current = requestAnimationFrame(updateVolume)
      }

      updateVolume()
    } catch (err) {
      console.warn('Unable to start Audio Analyser:', err)
    }
  }

  const stopMicAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setMicVolume(0)
  }

  // Rhythmic cadence animation generator for Speaking state
  const startSpeakingCadence = () => {
    stopSpeakingCadence()
    cadenceIntervalRef.current = setInterval(() => {
      if (!isComponentMounted.current) return
      // Rhythmic pulse simulating speech cadence
      setSpeechCadence(0.35 + Math.random() * 0.6)
    }, 180)
  }

  const stopSpeakingCadence = () => {
    if (cadenceIntervalRef.current) {
      clearInterval(cadenceIntervalRef.current)
      cadenceIntervalRef.current = null
    }
    setSpeechCadence(0)
  }

  // Speech Synthesis (Read AI response aloud)
  const speakText = (text: string) => {
    const cleanText = extractCleanSpeechText(text)

    if (isAudioMuted || !('speechSynthesis' in window)) {
      setAssistantState('idle')
      isProcessingRef.current = false
      if (isHandsFreeRef.current) {
        setTimeout(() => triggerMicListening(), 1000)
      }
      return
    }

    try {
      window.speechSynthesis.cancel() // Stop prior speech

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = 0.95
      utterance.pitch = 1.0

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices()
      const englishVoice =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))) ||
        voices.find((v) => v.lang.startsWith('en'))
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      let hasFinished = false
      const finishSpeaking = () => {
        if (hasFinished) return
        hasFinished = true
        if (isComponentMounted.current) {
          stopSpeakingCadence()
          setAssistantState('idle')
          isProcessingRef.current = false

          // Hands-free continuous loop: auto-trigger mic for next turn after AI finishes speaking
          if (isHandsFreeRef.current) {
            setTimeout(() => {
              if (isComponentMounted.current && !isListeningRef.current && !isProcessingRef.current) {
                triggerMicListening()
              }
            }, 1200)
          }
        }
      }

      utterance.onstart = () => {
        if (isComponentMounted.current) {
          setAssistantState('speaking')
          startSpeakingCadence()
        }
      }

      utterance.onend = finishSpeaking
      utterance.onerror = finishSpeaking

      // Safety timeout: if speech synthesis gets stuck, force finish after estimated speech duration
      const estimatedDurationMs = Math.max(4000, cleanText.length * 80)
      setTimeout(finishSpeaking, estimatedDurationMs)

      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.warn("SpeechSynthesis error:", err)
      setAssistantState('idle')
      isProcessingRef.current = false
    }
  }

  // Trigger Microphone listening
  const triggerMicListening = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    stopSpeakingCadence()
    setTranscript('')
    latestTranscriptRef.current = ''
    isProcessingRef.current = false
    startMicAnalyser()

    try {
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
    } catch (err) {
      console.warn('Recognition start exception:', err)
      setAssistantState('idle')
    }
  }

  // Handle User Mic Toggle
  const handleMicToggle = () => {
    if (assistantState === 'listening' || isListeningRef.current) {
      // User manually stopped listening
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      stopMicAnalyser()
      const textToProcess = latestTranscriptRef.current.trim()
      if (textToProcess && !isProcessingRef.current) {
        processUserSpeech(textToProcess)
      } else {
        setAssistantState('idle')
      }
    } else {
      triggerMicListening()
    }
  }

  // Topic Selection Handler
  const handleSelectTopic = (topicId: TopicCategory) => {
    setSelectedTopic(topicId)
    const topicObj = TOPICS.find((t) => t.id === topicId) || TOPICS[0]
    
    // Add topic switch announcement to transcript
    const assistantMsg: Message = {
      id: `topic-${Date.now()}`,
      role: 'assistant',
      text: topicObj.prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages((prev) => [...prev, assistantMsg])
    speakText(topicObj.prompt)
  }

  // Text Input Submission Fallback
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isProcessingRef.current) return
    const textToSend = textInput.trim()
    setTextInput('')
    processUserSpeech(textToSend)
  }

  // Send user speech / text to Speaking Practice Backend Agent
  const processUserSpeech = async (userText: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setAssistantState('thinking')
    setErrorMsg(null)

    const userMsgId = `user-${Date.now()}`
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: userText,
      timestamp
    }

    setMessages((prev) => [...prev, newMsg])
    setTranscript('')
    latestTranscriptRef.current = ''

    try {
      const token = localStorage.getItem('access_token') || ''
      const currentTopicObj = TOPICS.find((t) => t.id === selectedTopic)
      const topicName = currentTopicObj ? currentTopicObj.title : 'Free Talk'

      const res = await fetch('/api/v1/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `[English Speaking Practice - Topic: ${topicName}]: ${userText}`
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()
      const rawReply = data.response || "Great effort! Keep practicing your vocal clarity and pacing."
      const cleanReply = extractCleanSpeechText(rawReply)

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || [],
        practiceQuestions: data.practice_questions || []
      }

      setMessages((prev) => [...prev, assistantMsg])
      speakText(cleanReply)
    } catch (err: any) {
      console.error('Error contacting speaking agent:', err)
      setErrorMsg("Having trouble responding right now, please try again.")
      setAssistantState('idle')
      isProcessingRef.current = false
    }
  }

  // End Practice Session & Open Summary Modal
  const handleEndPractice = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    stopMicAnalyser()
    stopSpeakingCadence()
    setAssistantState('idle')
    isProcessingRef.current = false
    setShowSummaryModal(true)
  }

  // Format MM:SS duration
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Compute dynamic scale and glow values for Orb avatar
  const getOrbStyle = () => {
    let baseScale = 1
    let glowRadius = 30
    let glowOpacity = 0.4
    let ringScale = 1

    if (assistantState === 'listening') {
      baseScale = 1 + micVolume * 0.45
      glowRadius = 30 + micVolume * 70
      glowOpacity = 0.5 + micVolume * 0.5
      ringScale = 1 + micVolume * 0.6
    } else if (assistantState === 'speaking') {
      baseScale = 1 + speechCadence * 0.3
      glowRadius = 35 + speechCadence * 50
      glowOpacity = 0.6 + speechCadence * 0.4
      ringScale = 1 + speechCadence * 0.4
    } else if (assistantState === 'thinking') {
      baseScale = 1.05
      glowRadius = 45
      glowOpacity = 0.7
    }

    return {
      orbStyle: {
        transform: `scale(${baseScale})`,
        boxShadow: `0 0 ${glowRadius}px ${glowRadius / 2}px rgba(99, 102, 241, ${glowOpacity})`
      },
      ringStyle: {
        transform: `scale(${ringScale})`,
        opacity: Math.min(1, glowOpacity + 0.2)
      }
    }
  }

  const { orbStyle, ringStyle } = getOrbStyle()
  const userExchangesCount = messages.filter((m) => m.role === 'user').length

  return (
    <div className="flex flex-col space-y-6 max-w-5xl mx-auto pb-16">
      {/* TOP HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/chat"
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors shrink-0"
            title="Back to Chat"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              English Speaking Practice
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time voice AI coach with volume analysis, speech synthesis & topic feedback
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {/* Hands-Free Toggle */}
          <button
            onClick={() => setIsHandsFree(!isHandsFree)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isHandsFree
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
            title="Toggle Hands-Free Continuous Loop"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isHandsFree ? 'animate-spin' : ''}`} />
            <span>Hands-Free: {isHandsFree ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mute Audio Toggle */}
          <button
            onClick={() => {
              setIsAudioMuted(!isAudioMuted)
              if (!isAudioMuted && window.speechSynthesis) {
                window.speechSynthesis.cancel()
              }
            }}
            className={`p-2 rounded-xl border transition-all ${
              isAudioMuted
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20'
            }`}
            title={isAudioMuted ? 'Unmute Speech Synthesis' : 'Mute Speech Synthesis'}
          >
            {isAudioMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>

          {/* End Practice Button */}
          <button
            onClick={handleEndPractice}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-semibold transition-all"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOPIC SELECTOR TABS */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          Select Practice Topic Context
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOPICS.map((topic) => {
            const Icon = topic.icon
            const isSelected = selectedTopic === topic.id
            return (
              <button
                key={topic.id}
                onClick={() => handleSelectTopic(topic.id)}
                className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? 'bg-indigo-600/10 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-medium shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{topic.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{topic.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN AI AVATAR & VISUAL INDICATOR CARD */}
      <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-3xl shadow-2xl overflow-hidden min-h-[380px]">
        {/* Background Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

        {/* Dynamic Concentric Ripple Rings */}
        <div
          className="absolute w-72 h-72 rounded-full border border-indigo-500/20 transition-all duration-150 pointer-events-none"
          style={ringStyle}
        />
        <div
          className="absolute w-96 h-96 rounded-full border border-purple-500/10 transition-all duration-300 pointer-events-none"
          style={ringStyle}
        />

        {/* CENTRAL AI AVATAR ORB */}
        <div className="relative z-10 my-6 flex items-center justify-center">
          {/* Thinking Rotating Outer Aura Ring */}
          {assistantState === 'thinking' && (
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-spin blur-md opacity-80" />
          )}

          {/* Main SVG/CSS Circular Orb */}
          <div
            className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none ${
              assistantState === 'idle' ? 'animate-pulse' : ''
            }`}
            style={orbStyle}
            onClick={handleMicToggle}
          >
            {/* Core Gradient Sphere */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-700 via-purple-600 to-cyan-400 p-[3px] shadow-inner">
              <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
                {/* Internal Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent" />

                {/* SVG Icon Centerpiece */}
                {assistantState === 'thinking' ? (
                  <RefreshCw className="h-14 w-14 text-cyan-300 animate-spin" />
                ) : assistantState === 'speaking' ? (
                  <Volume2 className="h-14 w-14 text-purple-300 animate-pulse" />
                ) : assistantState === 'listening' ? (
                  <Mic className="h-14 w-14 text-indigo-300 scale-110" />
                ) : (
                  <Sparkles className="h-14 w-14 text-indigo-400 opacity-90" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STATE LABEL */}
        <div className="relative z-10 flex items-center space-x-2.5 mt-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-md">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              assistantState === 'listening'
                ? 'bg-rose-500 animate-ping'
                : assistantState === 'speaking'
                ? 'bg-purple-400 animate-pulse'
                : assistantState === 'thinking'
                ? 'bg-cyan-400 animate-spin'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-sm font-semibold tracking-wide text-slate-200">
            {assistantState === 'listening'
              ? 'Listening...'
              : assistantState === 'thinking'
              ? 'Thinking...'
              : assistantState === 'speaking'
              ? 'Speaking...'
              : 'Tap to speak'}
          </span>
        </div>

        {/* Live Transcript Preview during listening */}
        {assistantState === 'listening' && (
          <div className="relative z-10 mt-4 max-w-lg text-center px-4 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-sm italic animate-fade-in">
            "{transcript || 'Start speaking clearly into your microphone...'}"
          </div>
        )}

        {/* MIC BUTTON INTEGRATION & TEXT INPUT FALLBACK */}
        <div className="relative z-10 mt-6 flex flex-col items-center space-y-4 w-full max-w-lg">
          <button
            onClick={handleMicToggle}
            className={`flex items-center space-x-3 px-8 py-4 rounded-full font-semibold text-sm transition-all duration-300 shadow-xl min-h-[52px] ${
              assistantState === 'listening'
                ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-rose-500/30 scale-105 animate-pulse'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white hover:opacity-95 shadow-indigo-500/30 hover:scale-105'
            }`}
          >
            {assistantState === 'listening' ? (
              <>
                <MicOff className="h-5 w-5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span>{isHandsFree ? 'Start Hands-Free Session' : 'Tap Mic to Speak'}</span>
              </>
            )}
          </button>

          {/* Text Input Fallback Bar */}
          <form onSubmit={handleTextSubmit} className="flex items-center space-x-2 w-full">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a message to practice..."
              disabled={assistantState === 'thinking'}
              className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-full px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || assistantState === 'thinking'}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-full transition-colors"
              title="Send text message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* CONVERSATION TRANSCRIPT & AI FEEDBACK SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            Practice Session Transcript & AI Feedback
          </h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {messages.length} exchanges
          </span>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-2 p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 ml-8'
                  : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 mr-8'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  {msg.role === 'user' ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">You (Spoken)</span>
                  ) : (
                    <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Redora AI Speech Coach
                    </span>
                  )}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {msg.text}
              </div>

              {/* Suggestions / Practice Questions if provided */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> Pronunciation & Fluency Advice
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.suggestions.map((sug: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-indigo-500/20 p-2.5 rounded-xl text-xs space-y-1"
                      >
                        <div className="font-semibold text-indigo-600 dark:text-indigo-300">{sug.title}</div>
                        <div className="text-slate-600 dark:text-slate-400">{sug.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SESSION SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Practice Session Summary</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Great work on improving your spoken English!</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>Duration</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatTime(sessionDuration)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <span>Exchanges</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {userExchangesCount} turns
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4 rounded-2xl space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> AI Fluency & Practice Feedback
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {userExchangesCount >= 3
                  ? "Excellent practice session! Your responses demonstrated good sentence variation. Continue practicing smooth transition connectives."
                  : "Good start! Aim for 5+ spoken turns per session to build vocal memory and natural phrasing."}
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setShowSummaryModal(false)
                  setSessionStartTime(Date.now())
                  setSessionDuration(0)
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Start New Session
              </button>
              <Link
                to="/chat"
                className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors text-center"
              >
                Back to Tools
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
