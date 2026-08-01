import { useState, useEffect, Component, ReactNode } from 'react'
import { 
  Code2, 
  Play, 
  Terminal, 
  Loader2, 
  AlertCircle, 
  Copy, 
  Check, 
  RotateCcw,
  FileText,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

interface Runtime {
  language: string
  version: string
  aliases: string[]
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class CodeSandboxErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('CodeSandbox ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Code Sandbox Encountered an Error</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {this.state.error?.message || 'A temporary rendering issue occurred in Code Sandbox.'}
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

const DEFAULT_SNIPPETS: Record<string, string> = {
  python: `# Python 3 Code Sandbox\ndef greet(name):\n    return f"Hello, {name}! Welcome to Redora AI Sandbox."\n\nprint(greet("Developer"))\n`,
  java: `// Java Sandbox\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java Sandbox!");\n    }\n}\n`,
  'c++': `// C++ Sandbox\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++ Sandbox!" << endl;\n    return 0;\n}\n`,
  cpp: `// C++ Sandbox\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++ Sandbox!" << endl;\n    return 0;\n}\n`,
  c: `// C Sandbox\n#include <stdio.h>\n\nint main() {\n    printf("Hello from C Sandbox!\\n");\n    return 0;\n}\n`
}

function CodeSandboxContent() {
  const navigate = useNavigate()
  const [runtimes, setRuntimes] = useState<Runtime[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Python')
  const [selectedVersion, setSelectedVersion] = useState<string>('3.8.1')
  const [code, setCode] = useState<string>(DEFAULT_SNIPPETS['python'])
  const [stdin, setStdin] = useState<string>('')
  
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isLoadingRuntimes, setIsLoadingRuntimes] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  const [output, setOutput] = useState<{
    stdout: string
    stderr: string
    exit_code: number | null
  } | null>(null)

  const [copiedOutput, setCopiedOutput] = useState<boolean>(false)

  useEffect(() => {
    fetchRuntimes()
  }, [])

  const fetchRuntimes = async () => {
    try {
      setIsLoadingRuntimes(true)
      const res = await api.get('/tools/sandbox/runtimes')
      const list: Runtime[] = res.data.runtimes || []
      setRuntimes(list)
      if (list.length > 0) {
        const py = list.find((r) => r.language.toLowerCase() === 'python') || list[0]
        setSelectedLanguage(py.language)
        setSelectedVersion(py.version)
      }
    } catch (err) {
      console.error('Failed to load runtimes:', err)
      // Fallback runtimes list: Python, Java, C++, C
      setRuntimes([
        { language: 'Python', version: '3.8.1', aliases: ['py'] },
        { language: 'C++', version: 'GCC 9.2.0', aliases: ['cpp'] },
        { language: 'C', version: 'GCC 9.2.0', aliases: [] },
        { language: 'Java', version: 'OpenJDK 13.0.1', aliases: [] }
      ])
    } finally {
      setIsLoadingRuntimes(false)
    }
  }

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang)
    const runtime = runtimes.find((r) => r.language === lang)
    if (runtime) {
      setSelectedVersion(runtime.version)
    }
    const sample = DEFAULT_SNIPPETS[lang.toLowerCase()] || `// ${lang} Code Sandbox\n`
    setCode(sample)
    setError(null)
    setOutput(null)
  }

  const formatErrorMessage = (detail: any): string => {
    if (!detail) return 'Execution failed. Please try again.'
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

  const handleRunCode = async () => {
    if (!code.trim()) {
      setError('Please enter source code to execute.')
      return
    }

    setIsRunning(true)
    setError(null)
    setOutput(null)

    try {
      const payload = {
        language: selectedLanguage,
        version: selectedVersion,
        code: code,
        stdin: stdin
      }

      const res = await api.post('/tools/sandbox/run', payload)
      setOutput({
        stdout: res.data.stdout || '',
        stderr: res.data.stderr || '',
        exit_code: res.data.exit_code ?? 0
      })
    } catch (err: any) {
      console.error('Code sandbox error:', err)
      let detail: any = 'Execution failed. Please check your code.'
      if (err.response?.data?.detail) {
        detail = err.response.data.detail
      } else if (err.message) {
        detail = err.message
      }
      setError(formatErrorMessage(detail))
    } finally {
      setIsRunning(false)
    }
  }

  const handleCopyOutput = () => {
    if (!output) return
    const text = [
      output.stdout ? `--- STDOUT ---\n${output.stdout}` : '',
      output.stderr ? `--- STDERR ---\n${output.stderr}` : ''
    ].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopiedOutput(true)
    setTimeout(() => setCopiedOutput(false), 2000)
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
            <Code2 className="w-3.5 h-3.5" />
            <span>Multi-Language Sandbox</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            Code Execution Sandbox
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Compile and run Python, JavaScript, C++, Java, Go, Rust, and TypeScript code isolated in secure execution containers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Main Sandbox Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 transition-colors duration-200">
        {/* Controls Toolbar: Language & Version Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="space-y-1 w-full sm:w-auto">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Programming Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isLoadingRuntimes || isRunning}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500/50 w-full sm:w-56 capitalize min-h-[44px]"
              >
                {runtimes.map((r) => (
                  <option key={r.language} value={r.language}>
                    {r.language} ({r.version})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                const sample = DEFAULT_SNIPPETS[selectedLanguage.toLowerCase()] || ''
                setCode(sample)
                setError(null)
                setOutput(null)
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
              title="Reset code template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Code</span>
            </button>

            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning || isLoadingRuntimes}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Source Code
            </span>
            <span className="text-slate-500 font-mono text-[11px] capitalize">
              {selectedLanguage} v{selectedVersion}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write or paste your code here..."
              rows={12}
              spellCheck={false}
              className="w-full bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none leading-relaxed resize-y border-none"
            />
          </div>
        </div>

        {/* Optional Stdin Input Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Standard Input (stdin) - Optional
          </label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Input data to pass to standard input (stdin)..."
            rows={2}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Output Terminal Panel */}
        {output && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Execution Output</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                    output.exit_code === 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  Exit Code: {output.exit_code ?? 0}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyOutput}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copiedOutput ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Output</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Window */}
            <div className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 font-mono text-xs space-y-3 max-h-96 overflow-y-auto">
              {/* Stdout */}
              {output.stdout && (
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase block mb-1">Standard Output:</span>
                  <pre className="text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap leading-relaxed">{output.stdout}</pre>
                </div>
              )}

              {/* Stderr */}
              {output.stderr && (
                <div>
                  <span className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold uppercase block mb-1">Standard Error:</span>
                  <pre className="text-rose-700 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">{output.stderr}</pre>
                </div>
              )}

              {!output.stdout && !output.stderr && (
                <p className="text-slate-500 dark:text-slate-400 italic">Code executed cleanly with no output.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CodeSandbox() {
  return (
    <CodeSandboxErrorBoundary>
      <CodeSandboxContent />
    </CodeSandboxErrorBoundary>
  )
}
