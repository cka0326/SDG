import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Download,
  Copy,
  Check,
  Code2,
  Database,
  AlertCircle,
  FileJson,
  FileText,
  Shield,
  Lock,
  Terminal,
  Share2,
  X,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  if (obj === null || obj === undefined) return { [prefix]: '' }
  if (typeof obj !== 'object') return { [prefix]: String(obj) }
  if (Array.isArray(obj)) return { [prefix]: JSON.stringify(obj) }
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}_${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, key))
    } else if (Array.isArray(v)) {
      result[key] = JSON.stringify(v)
    } else {
      result[key] = v === null || v === undefined ? '' : String(v)
    }
  }
  return result
}

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return ''
  const flat = data.map((r) => flattenObject(r))
  const headers = [...new Set(flat.flatMap((r) => Object.keys(r)))]
  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v
  const rows = flat.map((r) => headers.map((h) => escape(r[h] ?? '')).join(','))
  return [headers.join(','), ...rows].join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = 'data' | 'code'
type LoadingStage = '' | 'generating' | 'executing'

interface SavedSchema {
  id: string
  name: string
  schema: string
  businessRules: string
}

// ── thinking panel steps ──────────────────────────────────────────────────────

// Each entry: [label, delayMs before this step appears after the previous one]
const THINKING_SEQUENCE: Record<'generating' | 'executing', Array<[string, number]>> = {
  generating: [
    ['Parsing schema structure',                            300],
    ['Extracting field definitions and types',              750],
    ['Reading enum and allowed value constraints',          900],
    ['Identifying required fields and nullability rules',   850],
    ['Detecting date and time relationship rules',         1050],
    ['Analyzing financial and numeric calculation rules',  1200],
    ['Resolving cross-field dependencies',                 1100],
    ['Mapping business rules to generation strategy',       950],
    ['Selecting data generators per field',                 800],
    ['Composing Python generation logic',                  1300],
    ['Validating code structure and output format',         600],
  ],
  executing: [
    ['Compiling Python script',                            400],
    ['Initializing Faker and random libraries',            750],
    ['Running data generation loop',                      1000],
    ['Collecting and serializing records',                  650],
    ['Validating output against schema',                   500],
  ],
}

// ── sub-components ────────────────────────────────────────────────────────────

function ThinkingPanel({ stage }: { stage: 'generating' | 'executing' }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const sequence = THINKING_SEQUENCE[stage]

  useEffect(() => {
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    let cumulative = 120
    sequence.forEach(([, delay], i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), cumulative))
      cumulative += delay
    })
    return () => timers.forEach(clearTimeout)
  }, [stage, sequence])

  return (
    <div className="flex-1 flex items-start p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {stage === 'generating' ? 'Synthesizing code' : 'Executing script'}
          </span>
        </div>
        <div className="space-y-3">
          {sequence.slice(0, visibleCount).map(([step], i) => {
            const done = i < visibleCount - 1
            const current = i === visibleCount - 1
            return (
              <div
                key={step}
                className={`flex items-center gap-3 transition-opacity duration-300 ${done ? 'opacity-35' : 'opacity-100'}`}
              >
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {done ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-[1.5px] border-blue-600 border-t-transparent animate-spin" />
                  )}
                </div>
                <span className={`text-sm ${done ? 'text-slate-400' : 'text-slate-700'}`}>
                  {step}
                  {current && (
                    <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-slate-600 align-middle animate-pulse" />
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
    >
      {children}
    </button>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
    >
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

// ── main component ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'datagen:saved-schemas'

export default function App() {
  const [schema, setSchema] = useState('')
  const [businessRules, setBusinessRules] = useState('')
  const [recordCount, setRecordCount] = useState(10)
  const [generatedData, setGeneratedData] = useState<Record<string, unknown>[] | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('data')
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('')
  const [error, setError] = useState<string | null>(null)

  // saved schemas
  const [savedSchemas, setSavedSchemas] = useState<SavedSchema[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSchemas))
  }, [savedSchemas])

  const isLoading = loadingStage !== ''

  const handleLoadSchema = useCallback((saved: SavedSchema) => {
    setSchema(saved.schema)
    setBusinessRules(saved.businessRules)
    setGeneratedData(null)
    setGeneratedCode(null)
    setError(null)
  }, [])

  const handleSaveSchema = () => {
    const name = saveName.trim()
    if (!name) return
    setSavedSchemas((prev) => [
      { id: Date.now().toString(), name, schema, businessRules },
      ...prev,
    ])
    setSaveName('')
    setIsSaving(false)
  }

  const handleDeleteSchema = (id: string) => {
    setSavedSchemas((prev) => prev.filter((s) => s.id !== id))
  }

  const handleGenerateData = async () => {
    setError(null)
    setGeneratedData(null)
    setGeneratedCode(null)

    try {
      setLoadingStage('generating')
      const codeRes = await axios.post('/api/generate-code', {
        schema,
        business_rules: businessRules,
        record_count: recordCount,
      })
      const code: string = codeRes.data.code
      setGeneratedCode(code)

      setLoadingStage('executing')
      const dataRes = await axios.post('/api/execute', { code })
      setGeneratedData(dataRes.data.data)
      setActiveTab('data')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoadingStage('')
    }
  }

  const handleGenerateCode = async () => {
    setError(null)
    setGeneratedCode(null)

    try {
      setLoadingStage('generating')
      const res = await axios.post('/api/generate-code', {
        schema,
        business_rules: businessRules,
        record_count: recordCount,
      })
      setGeneratedCode(res.data.code)
      setActiveTab('code')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoadingStage('')
    }
  }

  const hasOutput = generatedData !== null || generatedCode !== null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── header ── */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-slate-900 font-bold text-xl tracking-tight">Datagen</span>
            <div className="h-5 w-px bg-slate-200" />
            <div className="hidden sm:flex items-center gap-2">
              {['Synthetic Data', 'Schema-Aware', 'Claude-Powered', 'Python Export'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <img src="/exl-logo.png" alt="EXL" className="h-6 w-auto" />
        </div>
      </header>

      {/* ── main ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_3fr] gap-5 items-start">

          {/* ── LEFT PANEL ── */}
          <div className="bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Schema Configuration
              </h2>
            </div>

            <div className="p-5 flex flex-col gap-5">

              {/* saved schemas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-400">Saved Schemas</p>
                  {!isSaving && (
                    <button
                      onClick={() => setIsSaving(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      + Save Current
                    </button>
                  )}
                </div>

                {/* inline save form */}
                {isSaving && (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      autoFocus
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSchema()
                        if (e.key === 'Escape') {
                          setIsSaving(false)
                          setSaveName('')
                        }
                      }}
                      placeholder="Schema name…"
                      className="flex-1 text-xs h-7 px-2.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
                    />
                    <button
                      onClick={handleSaveSchema}
                      disabled={!saveName.trim()}
                      className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-2.5 h-7 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsSaving(false)
                        setSaveName('')
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1 h-7 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* saved schema pills */}
                {savedSchemas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {savedSchemas.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center rounded border border-slate-200 overflow-hidden"
                      >
                        <button
                          onClick={() => handleLoadSchema(s)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          {s.name}
                        </button>
                        <button
                          onClick={() => handleDeleteSchema(s.id)}
                          className="px-1.5 py-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 border-l border-slate-200 transition-colors"
                          title="Remove"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isSaving && (
                    <p className="text-xs text-slate-400 italic">
                      No saved schemas yet — paste a schema below and click Save Current.
                    </p>
                  )
                )}
              </div>

              {/* schema editor */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Schema / Structure</p>
                <textarea
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  spellCheck={false}
                  className="w-full h-60 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-300 rounded-md p-3.5 border border-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 scrollbar-thin"
                  placeholder="Paste your JSON Schema or a sample JSON record here…"
                />
              </div>

              {/* business rules */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Business Rules</p>
                <textarea
                  value={businessRules}
                  onChange={(e) => setBusinessRules(e.target.value)}
                  className="w-full h-28 text-xs leading-relaxed bg-white text-slate-700 rounded-md p-3.5 border border-slate-200 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 scrollbar-thin"
                  placeholder="Describe field relationships, value ranges, and business logic…"
                />
              </div>

              {/* record count */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">
                  Records —{' '}
                  <span className="text-slate-700 font-semibold">{recordCount}</span>
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={recordCount}
                    onChange={(e) => setRecordCount(Number(e.target.value))}
                    className="flex-1 h-1 accent-blue-600 cursor-pointer"
                  />
                  <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                    <button
                      onClick={() => setRecordCount((v) => Math.max(1, v - 1))}
                      className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-50 border-r border-slate-200 text-sm leading-none"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={recordCount}
                      onChange={(e) =>
                        setRecordCount(Math.max(1, Math.min(100, Number(e.target.value))))
                      }
                      className="w-10 h-7 text-center text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={() => setRecordCount((v) => Math.min(100, v + 1))}
                      className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-50 border-l border-slate-200 text-sm leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* action buttons */}
              <div className="flex gap-2.5 pt-0.5">
                <button
                  onClick={handleGenerateData}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm py-2.5 px-4 rounded transition-colors"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Database size={14} />
                  )}
                  Generate Data
                </button>
                <button
                  onClick={handleGenerateCode}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-blue-600 font-medium text-sm py-2.5 px-4 rounded border border-blue-600 transition-colors"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  ) : (
                    <Code2 size={14} />
                  )}
                  Get Code
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div
            className="bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden min-h-[560px]"
            style={{ height: 'calc(100vh - 10rem)' }}
          >
            {/* tab bar + action buttons */}
            <div className="px-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex">
                {(['data', 'code'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'data' ? <Database size={12} /> : <Code2 size={12} />}
                    {tab === 'data' ? 'Data' : 'Code'}
                    {tab === 'data' && generatedData && (
                      <span className="ml-1 bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded font-medium">
                        {generatedData.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* contextual action buttons */}
              <div className="flex items-center gap-1.5 py-2">
                {!isLoading && activeTab === 'data' && generatedData && (
                  <>
                    <CopyButton
                      text={JSON.stringify(generatedData, null, 2)}
                      label="Copy JSON"
                    />
                    <ActionButton
                      onClick={() =>
                        downloadBlob(
                          JSON.stringify(generatedData, null, 2),
                          'synthetic_data.json',
                          'application/json'
                        )
                      }
                    >
                      <FileJson size={11} />
                      JSON
                    </ActionButton>
                    <ActionButton
                      onClick={() =>
                        downloadBlob(toCSV(generatedData), 'synthetic_data.csv', 'text/csv')
                      }
                    >
                      <Download size={11} />
                      CSV
                    </ActionButton>
                  </>
                )}
                {!isLoading && activeTab === 'code' && generatedCode && (
                  <>
                    <CopyButton text={generatedCode} label="Copy Code" />
                    <ActionButton
                      onClick={() =>
                        downloadBlob(generatedCode, 'generator.py', 'text/x-python')
                      }
                    >
                      <FileText size={11} />
                      Download .py
                    </ActionButton>
                  </>
                )}
              </div>
            </div>

            {/* content area */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

              {/* thinking mode */}
              {loadingStage !== '' && (
                <ThinkingPanel stage={loadingStage} />
              )}

              {/* error */}
              {!isLoading && error && (
                <div className="m-5 rounded border border-red-200 bg-red-50 p-4 flex-shrink-0">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-red-700 mb-1">Generation failed</p>
                      <pre className="text-xs text-red-600 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                        {error}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* empty state */}
              {!isLoading && !error && !hasOutput && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                    <Database size={20} className="text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-medium text-sm mb-1">No output yet</p>
                  <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                    Paste a schema and click{' '}
                    <span className="text-blue-600 font-medium">Generate Data</span> to produce
                    synthetic records.
                  </p>
                </div>
              )}

              {/* data tab */}
              {!isLoading && !error && hasOutput && activeTab === 'data' && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                  {generatedData ? (
                    <SyntaxHighlighter
                      language="json"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '11.5px',
                        lineHeight: '1.6',
                        minHeight: '100%',
                        background: '#0f172a',
                      }}
                      showLineNumbers
                      lineNumberStyle={{ color: '#475569', fontSize: '10px', minWidth: '2.5em' }}
                    >
                      {JSON.stringify(generatedData, null, 2)}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                      <div>
                        <p className="text-slate-500 text-sm mb-3">
                          Code generated — click{' '}
                          <strong className="font-semibold">Generate Data</strong> to execute it.
                        </p>
                        <button
                          onClick={handleGenerateData}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3.5 rounded transition-colors"
                        >
                          <Database size={12} />
                          Generate Data
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* code tab */}
              {!isLoading && !error && hasOutput && activeTab === 'code' && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                  {generatedCode ? (
                    <SyntaxHighlighter
                      language="python"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '11.5px',
                        lineHeight: '1.7',
                        minHeight: '100%',
                        background: '#0f172a',
                      }}
                      showLineNumbers
                      lineNumberStyle={{ color: '#475569', fontSize: '10px', minWidth: '2.5em' }}
                    >
                      {generatedCode}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                      <p className="text-slate-400 text-sm">
                        Click <strong className="text-slate-600">Get Code</strong> to generate the
                        Python script.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── feature strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Share2,
              title: 'AI-Inferred Relationships',
              text: 'Dates, totals, and derived fields stay consistent',
            },
            {
              icon: Shield,
              title: 'Insurance-Native',
              text: 'Real policy numbers, ICD-10, CPT, VINs, and NPI formats',
            },
            {
              icon: Lock,
              title: 'Fully Synthetic',
              text: 'Zero real PII — safe for CI, staging, and demos',
            },
            {
              icon: Terminal,
              title: 'Portable Python',
              text: 'Download the generator script to run independently',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-start gap-3"
            >
              <f.icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">{f.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── footer ── */}
      <footer className="border-t border-slate-200 bg-white py-3.5 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Datagen · AI-powered synthetic insurance data          </span>
          <img src="/exl-logo.png" alt="EXL" className="h-4 w-auto opacity-60" />
        </div>
      </footer>
    </div>
  )
}
