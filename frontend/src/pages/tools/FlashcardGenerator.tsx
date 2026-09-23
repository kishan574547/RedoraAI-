import { useState, useRef, useEffect } from 'react'
import {
  BookOpen, Plus, Trash2, Loader2, AlertCircle, ArrowLeft,
  UploadCloud, Sparkles, RotateCcw,
  CheckCircle2, X, Brain
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface Deck {
  id: number
  title: string
  description: string | null
  card_count: number
  due_count: number
}

interface CardData {
  id: number
  front_text: string
  back_text: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  is_due: boolean
}

type View = 'decks' | 'cards' | 'review'

const RATING_LABELS = [
  { quality: 0, label: 'Again', color: 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' },
  { quality: 1, label: 'Hard', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
  { quality: 2, label: 'Good', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
  { quality: 3, label: 'Easy', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' },
]

export default function FlashcardGenerator() {
  const navigate = useNavigate()

  // Navigation
  const [view, setView] = useState<View>('decks')
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)

  // Deck list
  const [decks, setDecks] = useState<Deck[]>([])
  const [decksLoading, setDecksLoading] = useState(true)
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [creatingDeck, setCreatingDeck] = useState(false)

  // Cards
  const [cards, setCards] = useState<CardData[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [addingCard, setAddingCard] = useState(false)

  // Generate from notes
  const [showGenerate, setShowGenerate] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)

  // Review
  const [reviewCards, setReviewCards] = useState<CardData[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [rating, setRating] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors'

  // ── Decks ─────────────────────────────────────────────────────────────────────
  const loadDecks = async () => {
    setDecksLoading(true)
    try {
      const res = await api.get('/tools/flashcards/decks')
      setDecks(res.data)
    } catch { setError('Failed to load decks.') }
    finally { setDecksLoading(false) }
  }

  useEffect(() => { loadDecks() }, [])

  const createDeck = async () => {
    if (!newDeckTitle.trim()) return
    setCreatingDeck(true)
    try {
      const res = await api.post('/tools/flashcards/decks', { title: newDeckTitle.trim() })
      setDecks(prev => [res.data, ...prev])
      setNewDeckTitle('')
    } catch { setError('Failed to create deck.') }
    finally { setCreatingDeck(false) }
  }

  const deleteDeck = async (deckId: number) => {
    if (!confirm('Delete this deck and all its cards?')) return
    try {
      await api.delete(`/tools/flashcards/decks/${deckId}`)
      setDecks(prev => prev.filter(d => d.id !== deckId))
    } catch { setError('Failed to delete deck.') }
  }

  // ── Cards ─────────────────────────────────────────────────────────────────────
  const openDeck = async (deck: Deck) => {
    setActiveDeck(deck)
    setView('cards')
    setCardsLoading(true)
    setError(null)
    try {
      const res = await api.get(`/tools/flashcards/decks/${deck.id}/cards`)
      setCards(res.data)
    } catch { setError('Failed to load cards.') }
    finally { setCardsLoading(false) }
  }

  const addCard = async () => {
    if (!newFront.trim() || !newBack.trim() || !activeDeck) return
    setAddingCard(true)
    try {
      const res = await api.post(`/tools/flashcards/decks/${activeDeck.id}/cards`, {
        front_text: newFront.trim(),
        back_text: newBack.trim()
      })
      setCards(prev => [...prev, { ...res.data, ease_factor: 2.5, interval_days: 1, repetitions: 0, next_review_at: new Date().toISOString().slice(0, 10), is_due: true }])
      setNewFront('')
      setNewBack('')
      setShowAddCard(false)
    } catch { setError('Failed to add card.') }
    finally { setAddingCard(false) }
  }

  const deleteCard = async (cardId: number) => {
    if (!activeDeck) return
    try {
      await api.delete(`/tools/flashcards/decks/${activeDeck.id}/cards/${cardId}`)
      setCards(prev => prev.filter(c => c.id !== cardId))
    } catch { setError('Failed to delete card.') }
  }

  // ── Generate ───────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeDeck) return
    if (!notesText.trim() && !notesFile) { setError('Please provide notes or upload a file.'); return }
    setGenerating(true)
    setError(null)
    try {
      const formData = new FormData()
      if (notesFile) { formData.append('notes_file', notesFile) }
      else { formData.append('notes_text', notesText.trim()) }

      const res = await api.post(`/tools/flashcards/decks/${activeDeck.id}/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // Reload cards
      const cardsRes = await api.get(`/tools/flashcards/decks/${activeDeck.id}/cards`)
      setCards(cardsRes.data)
      setShowGenerate(false)
      setNotesText('')
      setNotesFile(null)
      setError(null)
      alert(`Generated ${res.data.generated_count} flashcards!`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate cards.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Review ────────────────────────────────────────────────────────────────────
  const startReview = () => {
    const due = cards.filter(c => c.is_due)
    if (due.length === 0) { setError('No cards due for review today!'); return }
    setReviewCards(due)
    setReviewIdx(0)
    setFlipped(false)
    setReviewDone(false)
    setView('review')
    setError(null)
  }

  const handleRate = async (quality: number) => {
    if (!activeDeck || rating) return
    const card = reviewCards[reviewIdx]
    setRating(true)
    try {
      await api.post(`/tools/flashcards/decks/${activeDeck.id}/cards/${card.id}/review`, { quality })
      if (reviewIdx + 1 >= reviewCards.length) {
        setReviewDone(true)
      } else {
        setReviewIdx(i => i + 1)
        setFlipped(false)
      }
    } catch { setError('Failed to save rating.') }
    finally { setRating(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Back */}
      <button
        onClick={() => {
          if (view === 'review' || view === 'cards') {
            setView('decks')
            setActiveDeck(null)
            loadDecks()
          } else {
            navigate('/')
          }
        }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{view !== 'decks' ? `Back to ${activeDeck?.title || 'Decks'}` : 'Back to Dashboard'}</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <Brain className="w-3.5 h-3.5" /><span>Study Tool</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
          Flashcard Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
          Create flashcard decks manually or auto-generate from notes. Review with SM-2 spaced repetition.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── DECKS VIEW ── */}
      {view === 'decks' && (
        <div className="space-y-4">
          {/* Create Deck */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Create New Deck</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDeckTitle}
                onChange={e => setNewDeckTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createDeck()}
                placeholder="Deck title e.g. 'Biology Chapter 5'"
                className={inputCls + ' flex-1'}
              />
              <button
                type="button"
                onClick={createDeck}
                disabled={creatingDeck || !newDeckTitle.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all disabled:cursor-not-allowed"
              >
                {creatingDeck ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>

          {/* Deck List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">My Decks</h2>
            {decksLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
            ) : decks.length === 0 ? (
              <div className="text-center py-10 text-slate-600 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">No decks yet. Create one above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map(deck => (
                  <div
                    key={deck.id}
                    onClick={() => openDeck(deck)}
                    className="relative cursor-pointer bg-slate-950 hover:bg-slate-800/50 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-4 transition-all group"
                  >
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteDeck(deck.id) }}
                      className="absolute top-3 right-3 p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <BookOpen className="w-7 h-7 text-amber-400 mb-2" />
                    <h3 className="font-semibold text-slate-200 text-sm truncate pr-6">{deck.title}</h3>
                    {deck.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{deck.description}</p>}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-slate-500">{deck.card_count} cards</span>
                      {deck.due_count > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                          {deck.due_count} due
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {view === 'cards' && activeDeck && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{activeDeck.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{cards.length} cards · {cards.filter(c => c.is_due).length} due today</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setShowGenerate(p => !p); setShowAddCard(false) }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all"
                >
                  <Sparkles className="w-4 h-4" />Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCard(p => !p); setShowGenerate(false) }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" />Add Card
                </button>
                {cards.some(c => c.is_due) && (
                  <button
                    type="button"
                    onClick={startReview}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />Start Review
                  </button>
                )}
              </div>
            </div>

            {/* Generate Form */}
            {showGenerate && (
              <div className="mb-4 p-4 bg-slate-950 border border-amber-500/20 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-amber-400">Auto-Generate from Notes</h3>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  rows={5}
                  placeholder="Paste your study notes here..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                />
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={e => setNotesFile(e.target.files?.[0] || null)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />{notesFile ? notesFile.name : 'Upload file'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 text-sm font-semibold rounded-xl transition-all"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* Add Card Form */}
            {showAddCard && (
              <div className="mb-4 p-4 bg-slate-950 border border-emerald-500/20 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-emerald-400">New Card</h3>
                <input type="text" value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Front (question/cue)" className={inputCls} />
                <input type="text" value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Back (answer)" className={inputCls} onKeyDown={e => e.key === 'Enter' && addCard()} />
                <button type="button" onClick={addCard} disabled={addingCard || !newFront.trim() || !newBack.trim()} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 text-sm font-semibold rounded-xl transition-all">
                  {addingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add Card
                </button>
              </div>
            )}

            {cardsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
            ) : cards.length === 0 ? (
              <div className="text-center py-10 text-slate-600 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">No cards yet. Add manually or auto-generate from notes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map(card => (
                  <div key={card.id} className="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{card.front_text}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{card.back_text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {card.is_due && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs">Due</span>}
                      <span className="text-xs text-slate-600">{card.interval_days}d</span>
                      <button type="button" onClick={() => deleteCard(card.id)} className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW VIEW ── */}
      {view === 'review' && (
        <div className="max-w-2xl mx-auto">
          {reviewDone ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Complete!</h2>
              <p className="text-slate-500 text-sm">You reviewed {reviewCards.length} cards.</p>
              <button
                type="button"
                onClick={() => { setView('cards'); openDeck(activeDeck!) }}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition-all"
              >
                Back to Deck
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Card {reviewIdx + 1} of {reviewCards.length}</span>
                <span className="text-xs">{activeDeck?.title}</span>
              </div>

              {/* Flashcard */}
              <div
                onClick={() => setFlipped(p => !p)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 rounded-2xl p-10 min-h-[260px] flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm group"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  {flipped ? 'Answer' : 'Question — click to reveal'}
                </p>
                <p className="text-lg md:text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                  {flipped ? reviewCards[reviewIdx]?.back_text : reviewCards[reviewIdx]?.front_text}
                </p>
              </div>

              {/* Rating buttons */}
              {flipped && (
                <div className="grid grid-cols-4 gap-3">
                  {RATING_LABELS.map(({ quality, label, color }) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => handleRate(quality)}
                      disabled={rating}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {!flipped && (
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
                >
                  Reveal Answer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
