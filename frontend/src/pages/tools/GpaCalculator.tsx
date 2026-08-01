import { useState, useEffect, useMemo } from 'react'
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  History, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

interface SubjectRow {
  id: string
  name: string
  credits: number
  gradePoint: number
}

interface SavedGpaRecord {
  id: number
  semester_label: string
  calculated_gpa: number
  total_credits: number
  scale: number
  subjects: { name: string; credits: number; grade_point: number }[]
  created_at: string
}

export default function GpaCalculator() {
  const navigate = useNavigate()
  const [scale, setScale] = useState<number>(4.0)
  const [semesterLabel, setSemesterLabel] = useState<string>('Semester 1')
  const [subjects, setSubjects] = useState<SubjectRow[]>([
    { id: '1', name: 'Data Structures', credits: 4, gradePoint: 9 },
    { id: '2', name: 'Database Systems', credits: 3, gradePoint: 8 },
    { id: '3', name: 'Mathematics', credits: 4, gradePoint: 10 },
  ])

  // Saved records & CGPA state
  const [historyRecords, setHistoryRecords] = useState<SavedGpaRecord[]>([])
  const [overallCgpa, setOverallCgpa] = useState<number>(0.0)
  const [totalCumulativeCredits, setTotalCumulativeCredits] = useState<number>(0.0)
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const res = await api.get('/tools/gpa/history')
      setHistoryRecords(res.data.records || [])
      setOverallCgpa(res.data.overall_cgpa || 0.0)
      setTotalCumulativeCredits(res.data.total_credits || 0.0)
    } catch (err: any) {
      console.error('Failed to fetch GPA history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Calculate live running GPA
  const liveCalc = useMemo(() => {
    let totalCreds = 0
    let totalPoints = 0

    subjects.forEach((s) => {
      const c = Number(s.credits) || 0
      const g = Math.min(Math.max(0, Number(s.gradePoint) || 0), scale)
      if (c > 0) {
        totalCreds += c
        totalPoints += c * g
      }
    })

    const gpa = totalCreds > 0 ? Number((totalPoints / totalCreds).toFixed(2)) : 0.0
    return { gpa, totalCreds }
  }, [subjects, scale])

  const handleAddSubject = () => {
    const nextId = String(Date.now())
    setSubjects((prev) => [
      ...prev,
      { id: nextId, name: `Subject ${prev.length + 1}`, credits: 3, gradePoint: scale === 4.0 ? 3.5 : 8.0 }
    ])
  }

  const handleRemoveSubject = (id: string) => {
    if (subjects.length <= 1) {
      setError('You must keep at least one subject row.')
      return
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSubjectChange = (id: string, field: keyof SubjectRow, value: any) => {
    setError(null)
    setSuccessMessage(null)
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value }
        }
        return s
      })
    )
  }

  const handleSaveSemester = async () => {
    if (liveCalc.totalCreds <= 0) {
      setError('Please add credits for your subjects before saving.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const payload = {
        semester_label: semesterLabel.trim() || 'Semester',
        scale: scale,
        subjects: subjects.map((s) => ({
          name: s.name.trim() || 'Subject',
          credits: Number(s.credits) || 0,
          grade_point: Number(s.gradePoint) || 0
        }))
      }

      await api.post('/tools/gpa/save', payload)
      setSuccessMessage(`Successfully saved "${semesterLabel}" record!`)
      fetchHistory()
    } catch (err: any) {
      console.error('Failed to save GPA:', err)
      const detail = err.response?.data?.detail || 'Failed to save GPA record.'
      setError(detail)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRecord = async (recordId: number) => {
    try {
      setError(null)
      await api.delete(`/tools/gpa/${recordId}`)
      setSuccessMessage('Semester record deleted.')
      fetchHistory()
    } catch (err: any) {
      console.error('Failed to delete GPA record:', err)
      setError('Failed to delete record.')
    }
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
            <Calculator className="w-3.5 h-3.5" />
            <span>Academic Toolkit</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            GPA & CGPA Calculator
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Calculate your semester GPA live, track cumulative CGPA across semesters, and save records for future reference.
          </p>
        </div>

        {/* CGPA Summary Badge & Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shrink-0 flex items-center gap-4 transition-colors duration-200">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overall CGPA</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {overallCgpa.toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ {scale}</span>
              </div>
              <p className="text-xs text-slate-500">{totalCumulativeCredits} Total Credits Saved</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 transition-colors duration-200">
        {/* Controls: Scale & Semester Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1 w-full sm:w-auto">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Semester Title
            </label>
            <input
              type="text"
              value={semesterLabel}
              onChange={(e) => setSemesterLabel(e.target.value)}
              placeholder="e.g. Semester 1 or Fall 2024"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 w-full sm:w-64"
            />
          </div>

          <div className="space-y-1 w-full sm:w-auto">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Grading Scale
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScale(10.0)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scale === 10.0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                10-Point Scale
              </button>
              <button
                type="button"
                onClick={() => setScale(4.0)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scale === 4.0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                4-Point Scale
              </button>
            </div>
          </div>
        </div>

        {/* Live Running GPA Card */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Calculated GPA</p>
              <p className="text-xs text-slate-500">{liveCalc.totalCreds} Total Semester Credits</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {liveCalc.gpa.toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ {scale.toFixed(1)}</span>
          </div>
        </div>

        {/* Subjects Input List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Subjects & Marks
            </h3>
            <button
              type="button"
              onClick={handleAddSubject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Add Subject</span>
            </button>
          </div>

          <div className="space-y-2">
            {subjects.map((sub, index) => (
              <div
                key={sub.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl items-center transition-colors duration-200"
              >
                {/* Subject Name */}
                <div className="sm:col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1 sm:hidden">Subject Name</label>
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => handleSubjectChange(sub.id, 'name', e.target.value)}
                    placeholder={`Subject ${index + 1}`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Credits */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1 sm:hidden">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={sub.credits}
                    onChange={(e) => handleSubjectChange(sub.id, 'credits', parseFloat(e.target.value) || 0)}
                    placeholder="Credits"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Grade Point */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1 sm:hidden">Grade Point</label>
                  <input
                    type="number"
                    min="0"
                    max={scale}
                    step="0.1"
                    value={sub.gradePoint}
                    onChange={(e) => handleSubjectChange(sub.id, 'gradePoint', parseFloat(e.target.value) || 0)}
                    placeholder={`0-${scale}`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Remove button */}
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(sub.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg transition-colors"
                    title="Remove subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSemester}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Record...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save This Semester</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved History Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Saved Semester History</span>
          </h2>
          <span className="text-xs text-slate-500">{historyRecords.length} Saved Records</span>
        </div>

        {isLoadingHistory ? (
          <div className="text-center py-8 text-slate-500 text-sm">Loading history records...</div>
        ) : historyRecords.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
            No saved semester records yet. Fill in your subjects above and click "Save This Semester".
          </div>
        ) : (
          <div className="space-y-3">
            {historyRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id
              return (
                <div
                  key={record.id}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{record.semester_label}</h3>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-full font-medium">
                          {record.total_credits} Credits
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full font-medium">
                          {record.scale}-Pt Scale
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Saved on {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {record.calculated_gpa.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Toggle subject details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subjects Table */}
                  {isExpanded && record.subjects && record.subjects.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Details</p>
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 pb-1">
                        <span className="col-span-6">Subject</span>
                        <span className="col-span-3 text-center">Credits</span>
                        <span className="col-span-3 text-right">Grade Point</span>
                      </div>
                      {record.subjects.map((sub, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 text-xs text-slate-300 py-1 border-t border-slate-900">
                          <span className="col-span-6 truncate">{sub.name}</span>
                          <span className="col-span-3 text-center">{sub.credits}</span>
                          <span className="col-span-3 text-right text-emerald-400 font-semibold">{sub.grade_point}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
