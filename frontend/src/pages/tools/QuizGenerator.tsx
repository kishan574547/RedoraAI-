import { useState, useRef } from 'react'
import {
  HelpCircle, Sparkles, Loader2, AlertCircle, ArrowLeft,
  UploadCloud, CheckCircle2, XCircle, Trophy, RotateCcw, FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface QuizQuestion {
  question: string
  options: { A: string; B: string; C: string; D: string }
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

type QuizState = 'setup' | 'quiz' | 'results'

export default function QuizGenerator() {
  const navigate = useNavigate()

  // Setup
  const [topic, setTopic] = useState('')
  const [notesText, setNotesText] = useState('')
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [numQuestions, setNumQuestions] = useState(10)

  // Quiz data
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizTopic, setQuizTopic] = useState('')

  // Quiz runtime
  const [state, setState] = useState<QuizState>('setup')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>([])

  // UI
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  const handleGenerate = async () => {
    if (!topic.trim() && !notesText.trim() && !notesFile) {
      setError('Please enter a topic, paste notes, or upload a file.')
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('topic', topic.trim())
      formData.append('notes_text', notesText.trim())
      formData.append('num_questions', String(numQuestions))
      if (notesFile) formData.append('notes_file', notesFile)

      const res = await api.post('/tools/quiz/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setQuestions(res.data.questions)
      setQuizTopic(res.data.topic)
      setCurrentIdx(0)
      setSelectedAnswer(null)
      setAnswered(false)
      setScore(0)
      setAnswers(new Array(res.data.questions.length).fill(null))
      setState('quiz')
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to generate quiz.'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectAnswer = (option: string) => {
    if (answered) return
    setSelectedAnswer(option)
    setAnswered(true)
    const isCorrect = option === questions[currentIdx].correct_answer
    if (isCorrect) setScore(s => s + 1)
    const newAnswers = [...answers]
    newAnswers[currentIdx] = option
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setState('results')
    } else {
      setCurrentIdx(i => i + 1)
      setSelectedAnswer(null)
      setAnswered(false)
    }
  }

  const resetQuiz = () => {
    setState('setup')
    setQuestions([])
    setTopic('')
    setNotesText('')
    setNotesFile(null)
    setError(null)
  }

  const optionStyle = (opt: string) => {
    if (!answered) {
      return 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-slate-100 cursor-pointer'
    }
    const correct = questions[currentIdx]?.correct_answer
    if (opt === correct) return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
    if (opt === selectedAnswer && opt !== correct) return 'bg-rose-500/10 border-rose-500/30 text-rose-300'
    return 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
  }

  const scorePercentage = Math.round((score / questions.length) * 100)
  const scoreColor = scorePercentage >= 80 ? 'text-emerald-400' : scorePercentage >= 50 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Back */}
      <button
        onClick={() => state !== 'setup' ? setState('setup') : navigate('/')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{state !== 'setup' ? 'Back to Setup' : 'Back to Dashboard'}</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <HelpCircle className="w-3.5 h-3.5" /><span>Study Tool</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          AI Quiz Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Generate a multiple-choice quiz from any topic, pasted notes, or uploaded document. Get instant feedback on each answer.
        </p>
      </div>

      {/* ── SETUP ── */}
      {state === 'setup' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 max-w-2xl">
          <div>
            <label className={labelCls}>Topic (or leave blank if using notes)</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. World War II, React Hooks, Photosynthesis"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Paste Notes (optional)</label>
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              rows={6}
              placeholder="Paste your study notes here to generate topic-specific questions..."
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Upload Document (optional)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500/40 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={e => setNotesFile(e.target.files?.[0] || null)}
                className="hidden"
                id="quiz-file-input"
              />
              {notesFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                  <FileText className="w-4 h-4 text-indigo-400" />{notesFile.name}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <UploadCloud className="w-4 h-4" />Upload PDF, .docx, or .txt
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Number of Questions: {numQuestions}</label>
            <input
              type="range"
              min={3}
              max={30}
              value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>3</span><span>30</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button
            type="button"
            id="generate-quiz-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Quiz…</>
              : <><Sparkles className="w-4 h-4" />Generate Quiz</>}
          </button>
        </div>
      )}

      {/* ── QUIZ ── */}
      {state === 'quiz' && questions.length > 0 && (
        <div className="max-w-2xl space-y-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span className="text-xs font-medium text-emerald-400">Score: {score}/{currentIdx + (answered ? 1 : 0)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentIdx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {questions[currentIdx].question}
            </h2>

            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectAnswer(opt)}
                  disabled={answered}
                  className={`w-full flex items-center gap-3 p-3.5 border rounded-xl text-sm text-left transition-all ${optionStyle(opt)}`}
                >
                  <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                    {opt}
                  </span>
                  <span>{questions[currentIdx].options[opt]}</span>
                  {answered && opt === questions[currentIdx].correct_answer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                  )}
                  {answered && opt === selectedAnswer && opt !== questions[currentIdx].correct_answer && (
                    <XCircle className="w-4 h-4 text-rose-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {answered && questions[currentIdx].explanation && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 leading-relaxed">
                <span className="font-semibold text-indigo-400">Explanation: </span>
                {questions[currentIdx].explanation}
              </div>
            )}

            {answered && (
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl text-sm transition-all"
              >
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {state === 'results' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
            <Trophy className="w-14 h-14 mx-auto text-amber-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz Complete!</h2>
            <p className="text-slate-500 text-sm">{quizTopic}</p>
            <div className={`text-5xl font-bold ${scoreColor}`}>
              {score}/{questions.length}
            </div>
            <p className="text-slate-500">{scorePercentage}% correct</p>
            <p className="text-sm text-slate-400">
              {scorePercentage >= 80 ? '🎉 Excellent work!' : scorePercentage >= 60 ? '👍 Good effort!' : '📚 Keep studying!'}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setCurrentIdx(0); setSelectedAnswer(null); setAnswered(false); setScore(0); setAnswers(new Array(questions.length).fill(null)); setState('quiz') }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />Retry
              </button>
              <button
                type="button"
                onClick={resetQuiz}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl text-sm transition-all"
              >
                New Quiz
              </button>
            </div>
          </div>

          {/* Answer Review */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Answer Review</h3>
            {questions.map((q, i) => (
              <div key={i} className={`p-3.5 rounded-xl border text-sm ${answers[i] === q.correct_answer ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-start gap-2">
                  {answers[i] === q.correct_answer
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-slate-300 font-medium">{q.question}</p>
                    {answers[i] !== q.correct_answer && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your answer: <span className="text-rose-400">{answers[i]} — {q.options[answers[i] as 'A'|'B'|'C'|'D']}</span>
                        {' '}· Correct: <span className="text-emerald-400">{q.correct_answer} — {q.options[q.correct_answer]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
