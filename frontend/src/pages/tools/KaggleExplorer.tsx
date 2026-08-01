import React, { useState, useEffect } from 'react'
import { 
  Database, 
  Search, 
  XCircle, 
  ExternalLink, 
  Download, 
  Trophy, 
  Sparkles, 
  Loader2, 
  ArrowLeft,
  FileCode,
  Star
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

interface KaggleDataset {
  ref: string
  title: string
  ownerName: string
  size: string | number
  downloadCount: number
  voteCount: number
  usabilityRating: number
  lastUpdated: string
  url: string
}

interface KaggleCompetition {
  ref: string
  title: string
  organizationName: string
  category: string
  reward: string
  deadline: string
  url: string
}

export default function KaggleExplorer() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'datasets' | 'competitions'>('datasets')
  
  // Search & Results State
  const [searchQuery, setSearchQuery] = useState<string>('python')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const [datasets, setDatasets] = useState<KaggleDataset[]>([])
  const [competitions, setCompetitions] = useState<KaggleCompetition[]>([])

  useEffect(() => {
    handleSearch()
  }, [activeTab])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (activeTab === 'datasets') {
        const res = await api.get(`/tools/kaggle/datasets/search?search=${encodeURIComponent(searchQuery || 'python')}`)
        setDatasets(res.data || [])
      } else {
        const res = await api.get(`/tools/kaggle/competitions/list?search=${encodeURIComponent(searchQuery || 'python')}`)
        setCompetitions(res.data || [])
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch results from Kaggle API.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-600 dark:text-cyan-400">
                <Database className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">Kaggle Hub</h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore public datasets, machine learning models, and competitive data science challenges.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl self-start transition-colors duration-200">
          <button
            onClick={() => setActiveTab('datasets')}
            className={`flex items-center space-x-2 py-2 px-5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'datasets'
                ? 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Datasets</span>
          </button>
          <button
            onClick={() => setActiveTab('competitions')}
            className={`flex items-center space-x-2 py-2 px-5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'competitions'
                ? 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Competitions</span>
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search Kaggle ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-500 dark:text-rose-400 flex items-center space-x-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Feed - Grid Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <span className="text-xs">Fetching Kaggle results...</span>
        </div>
      ) : activeTab === 'datasets' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {datasets.map((ds, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md group">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <a
                    href={ds.url ? ds.url : `https://www.kaggle.com/datasets/${ds.ref}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Open on Kaggle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {ds.title || ds.ref}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    By <span className="text-slate-700 dark:text-slate-400">{ds.ownerName || ds.ref?.split('/')[0] || 'Kaggle User'}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1.5" title="Downloads">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ds.downloadCount || 0}</span>
                  </span>
                  <span className="flex items-center space-x-1.5" title="Upvotes">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span>{ds.voteCount || 0}</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                  {ds.size ? `${ds.size}` : 'Dataset'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {competitions.map((comp, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md group">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-amber-500 dark:text-amber-400 group-hover:border-amber-500/30 transition-colors">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <a
                    href={comp.url ? comp.url : `https://www.kaggle.com/c/${comp.ref}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Open on Kaggle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                    {comp.title || comp.ref}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {comp.organizationName || 'Kaggle Competition'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{comp.reward || 'Prize Pool'}</span>
                </span>
                <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                  {comp.category || 'Featured'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
