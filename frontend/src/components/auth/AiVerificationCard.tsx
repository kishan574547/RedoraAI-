import React, { useState, useRef, useEffect } from 'react'
import { Check, RefreshCw, Sun, Moon, ArrowLeft, ShieldCheck } from 'lucide-react'

interface AiVerificationCardProps {
  email: string
  onVerify: (code: string) => Promise<boolean | void>
  onResend: () => void
  cooldown: number
  loading: boolean
  error: string | null
  onBack: () => void
  title?: string
  subtitle?: string
}

export default function AiVerificationCard({
  email,
  onVerify,
  onResend,
  cooldown,
  loading,
  error,
  onBack,
  title = "Let's verify your code",
  subtitle
}: AiVerificationCardProps) {
  const defaultSubtitle = subtitle || `We've sent a 6-digit code to ${email || 'your email'}. It'll auto-verify once entered.`

  const DIGIT_COUNT = 6
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''))
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [animState, setAnimState] = useState<'input' | 'verifying' | 'verified'>('input')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Keep track of internal verifying transition state
  useEffect(() => {
    if (loading) {
      setAnimState('verifying')
    } else if (error) {
      setAnimState('input')
    }
  }, [loading, error])

  // Focus current digit input
  useEffect(() => {
    if (animState === 'input' && inputRefs.current[focusedIndex]) {
      inputRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex, animState])

  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '')

    if (!cleanVal) {
      const newDigits = [...digits]
      newDigits[index] = ''
      setDigits(newDigits)
      return
    }

    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, DIGIT_COUNT).split('')
      const newDigits = [...digits]
      pastedDigits.forEach((d, i) => {
        if (i < DIGIT_COUNT) newDigits[i] = d
      })
      setDigits(newDigits)

      const nextFocus = Math.min(pastedDigits.length, DIGIT_COUNT - 1)
      setFocusedIndex(nextFocus)

      if (newDigits.every(d => d !== '')) {
        const fullCode = newDigits.join('')
        triggerVerification(fullCode)
      }
      return
    }

    const newDigits = [...digits]
    newDigits[index] = cleanVal
    setDigits(newDigits)

    if (index < DIGIT_COUNT - 1) {
      setFocusedIndex(index + 1)
    }

    if (newDigits.every(d => d !== '')) {
      const fullCode = newDigits.join('')
      triggerVerification(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        setFocusedIndex(index - 1)
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setFocusedIndex(index - 1)
    } else if (e.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
      setFocusedIndex(index + 1)
    }
  }

  const triggerVerification = async (code: string) => {
    setAnimState('verifying')
    const startTime = Date.now()

    try {
      const res = await onVerify(code)
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 1800 - elapsedTime)

      setTimeout(() => {
        if (res !== false) {
          setAnimState('verified')
        } else {
          setAnimState('input')
        }
      }, remainingTime)
    } catch {
      setAnimState('input')
    }
  }

  const displayDigits = digits.filter(d => d).length >= 4 
    ? digits.filter(d => d).slice(0, 4) 
    : ['3', '1', '4', '2']

  return (
    <div className={`w-full max-w-[420px] transition-all duration-300 rounded-2xl p-8 border shadow-2xl backdrop-blur-xl relative overflow-hidden ${
      isDarkMode 
        ? 'bg-slate-800/95 border-slate-700/80 text-slate-100 shadow-slate-950/80' 
        : 'bg-white border-slate-200 text-slate-900 shadow-xl'
    }`}>
      {/* Background Subtle Ambient Glow */}
      <div className={`absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
        isDarkMode ? 'bg-indigo-600/15' : 'bg-indigo-500/10'
      }`} />
      <div className={`absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
        isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-500/10'
      }`} />

      {/* Top Notch Pill Handle */}
      <div className={`w-10 h-1 rounded-full mx-auto mb-6 ${
        isDarkMode ? 'bg-slate-600/60' : 'bg-slate-300'
      }`} />

      {/* Header Bar with Theme Toggle */}
      <div className="flex items-center justify-between absolute top-6 right-6">
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
            isDarkMode 
              ? 'bg-slate-700/80 border-slate-600 text-slate-300 hover:text-white hover:border-slate-500' 
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Toggle preview mode"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* ---------------- STATE 1: CODE INPUT STATE ---------------- */}
      {animState === 'input' && (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <h2 className={`text-2xl font-bold tracking-tight mb-2 font-sans ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {title}
          </h2>
          <p className={`text-xs mb-8 max-w-[300px] leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {defaultSubtitle}
          </p>

          {/* Error Banner */}
          {error && (
            <div className="w-full mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {digits.map((digit, idx) => {
              const isFocused = focusedIndex === idx
              const hasValue = digit !== ''
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setFocusedIndex(idx)
                    inputRefs.current[idx]?.focus()
                  }}
                  className={`w-11 h-14 rounded-xl border flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                    isFocused
                      ? isDarkMode
                        ? 'border-indigo-500 bg-slate-900 shadow-[0_0_16px_rgba(99,102,241,0.45)] scale-105'
                        : 'border-indigo-600 bg-indigo-50/60 shadow-[0_0_12px_rgba(79,70,229,0.3)] scale-105'
                      : hasValue
                      ? isDarkMode
                        ? 'border-slate-600 bg-slate-900 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900 font-semibold'
                      : isDarkMode
                      ? 'border-slate-700 bg-slate-900/80 text-slate-500'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <input
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={DIGIT_COUNT}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onFocus={() => setFocusedIndex(idx)}
                    className="absolute inset-0 w-full h-full opacity-0 text-center font-mono text-xl font-bold caret-transparent"
                  />
                  {digit ? (
                    <span className={`font-mono text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {digit}
                    </span>
                  ) : isFocused ? (
                    <span className={`w-0.5 h-6 rounded-full animate-pulse ${
                      isDarkMode ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-indigo-600 shadow-[0_0_6px_#4f46e5]'
                    }`} />
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Resend Link */}
          <div className={`text-xs mb-6 flex items-center justify-center gap-1.5 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span>Didn't receive the code?</span>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={onResend}
              className={`font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${
                isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {cooldown > 0 && <RefreshCw className="w-3 h-3 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
            </button>
          </div>

          {/* Back Button */}
          <button
            type="button"
            onClick={onBack}
            className={`text-xs flex items-center justify-center gap-1.5 transition-colors pt-2 border-t w-full ${
              isDarkMode 
                ? 'text-slate-400 hover:text-white border-slate-700/60' 
                : 'text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
        </div>
      )}

      {/* ---------------- STATE 2: VERIFYING ANIMATED RADAR ORBIT ---------------- */}
      {animState === 'verifying' && (
        <div className="flex flex-col items-center text-center animate-fade-in py-2">
          <h2 className={`text-2xl font-bold tracking-tight mb-1 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Verifying...
          </h2>
          <p className={`text-xs mb-6 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Processing security authentication
          </p>

          {/* Animated Orbital Radar Circular Container */}
          <div className="relative w-48 h-48 my-4 flex items-center justify-center">
            {/* Outer Dashed Rotating Ring - Smooth Controlled 18s Rotation */}
            <div className={`absolute inset-0 border border-dashed rounded-full animate-[spin_18s_linear_infinite] ${
              isDarkMode ? 'border-indigo-500/50' : 'border-indigo-600/50'
            }`} />
            {/* Inner Pulsing Ring */}
            <div className={`absolute inset-4 border rounded-full animate-ping opacity-30 ${
              isDarkMode ? 'border-indigo-500/30' : 'border-indigo-600/30'
            }`} />
            
            {/* 4 Orbital Digit Cards revolving around circle - Smooth 14s Rotation */}
            <div className="absolute inset-0 animate-[spin_14s_linear_infinite]">
              {displayDigits.map((val, i) => {
                const positions = [
                  'top-2 left-1/2 -translate-x-1/2',
                  'bottom-2 left-1/2 -translate-x-1/2',
                  'left-2 top-1/2 -translate-y-1/2',
                  'right-2 top-1/2 -translate-y-1/2'
                ]
                return (
                  <div
                    key={i}
                    className={`absolute ${positions[i]} w-11 h-11 border shadow-lg rounded-xl flex items-center justify-center font-mono text-lg font-bold transition-all ${
                      isDarkMode
                        ? 'bg-slate-900 border-indigo-500/70 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white'
                        : 'bg-white border-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.3)] text-indigo-900'
                    }`}
                  >
                    <span className="animate-[spin_14s_linear_infinite_reverse]">
                      {val}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Glowing Core Dot */}
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              isDarkMode ? 'bg-indigo-500 shadow-[0_0_12px_#6366f1]' : 'bg-indigo-600 shadow-[0_0_8px_#4f46e5]'
            }`} />
          </div>

          <div className={`text-xs mt-6 flex items-center justify-center gap-1.5 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span>Didn't receive the code?</span>
            <span className={`font-semibold opacity-60 ${
              isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
            }`}>Resend</span>
          </div>
        </div>
      )}

      {/* ---------------- STATE 3 & 4: CLEAN MINIMAL SUCCESS CHECKMARK ---------------- */}
      {animState === 'verified' && (
        <div className="flex flex-col items-center text-center animate-fade-in py-2">
          <h2 className={`text-2xl font-bold tracking-tight mb-1 ${
            isDarkMode 
              ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
              : 'text-emerald-600 font-bold'
          }`}>
            Verified Successfully
          </h2>
          <p className={`text-xs mb-6 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Your identity has been verified.
          </p>

          {/* Clean Emerald Checkmark Circle Container */}
          <div className="relative w-48 h-48 my-4 flex items-center justify-center">
            {/* Emerald Dashed Outer Circle */}
            <div className="absolute inset-0 border border-dashed border-emerald-500/50 rounded-full animate-[spin_24s_linear_infinite]" />
            <div className="absolute inset-4 border border-emerald-500/25 rounded-full" />

            {/* Glowing Center Emerald Checkmark Tile */}
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.6)] transform scale-110 transition-transform duration-500 z-10">
              <Check className="w-9 h-9 text-white stroke-[3.5]" />
            </div>
          </div>

          {/* Verified and Secure Bottom Badge */}
          <div className={`flex items-center justify-center gap-2 font-medium text-xs mt-6 pt-2 border-t w-full animate-fade-in ${
            isDarkMode 
              ? 'text-emerald-400 border-slate-700/60' 
              : 'text-emerald-600 border-slate-200'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verified and Secure</span>
          </div>
        </div>
      )}
    </div>
  )
}
