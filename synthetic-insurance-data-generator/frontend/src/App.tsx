import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { api, GenerateResponse, GenerationMode, OutputFormat, Sample } from './api/client';
import './styles.css';

const starterSchema = JSON.stringify({
  type: 'object',
  required: ['policyNumber', 'effectiveDate', 'expirationDate', 'state', 'premium'],
  properties: {
    policyNumber: { type: 'string' },
    effectiveDate: { type: 'string', format: 'date' },
    expirationDate: { type: 'string', format: 'date' },
    state: { type: 'string' },
    premium: { type: 'number', minimum: 0 },
  },
}, null, 2);

export default function App() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [schemaText, setSchemaText] = useState(starterSchema);
  const [rulesText, setRulesText] = useState('effectiveDate must be before expirationDate. premium should be positive. state should be a valid US state code.');
  const [count, setCount] = useState(10);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json');
  const [mode, setMode] = useState<GenerationMode>('both');
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [tab, setTab] = useState<'code' | 'data' | 'validation' | 'plan'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.samples().then(setSamples).catch((err) => setError(String(err))); }, []);
  const requestBody = useMemo(() => ({ schema_text: schemaText, rules_text: rulesText, count, output_format: outputFormat, mode }), [schemaText, rulesText, count, outputFormat, mode]);

  async function run(selectedMode = mode) {
    setLoading(true); setError(''); setMode(selectedMode);
    try {
      const response = selectedMode === 'code' ? await api.generateCode({ ...requestBody, mode: 'code' }) : await api.generateData({ ...requestBody, mode: selectedMode });
      setResult(response); setTab(selectedMode === 'code' ? 'code' : 'data');
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  function loadSample(id: string) {
    const sample = samples.find((item) => item.id === id);
    if (!sample) return;
    setSchemaText(JSON.stringify(sample.schema, null, 2));
    setRulesText(`${sample.description}\n\nRules: ${sample.rules}`);
    setResult(null);
  }

  function downloadCode() {
    if (!result?.code) return;
    const blob = new Blob([result.code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'generate_data.py'; anchor.click(); URL.revokeObjectURL(url);
  }

  return <main>
    <header className="hero">
      <div><p className="eyebrow"><Sparkles size={16}/> AI-assisted POC</p><h1>Synthetic Insurance Test Data Generator</h1><p>Paste JSON Schema, OpenAPI request schemas, or example payloads; describe insurance rules; generate safe Python generators and ZIP packages of fake API test payloads.</p></div>
      <div className="guardrail"><ShieldCheck/><strong>Synthetic-only guardrail</strong><span>Do not paste production records. Generated names, contacts, policy numbers, claim numbers, VINs, and addresses are fake.</span></div>
    </header>

    <section className="grid">
      <div className="panel editor">
        <label>Load demo sample</label><select onChange={(e) => loadSample(e.target.value)} defaultValue=""><option value="" disabled>Choose a sample template</option>{samples.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label>Schema / OpenAPI / example JSON</label><textarea className="schema" value={schemaText} onChange={(e) => setSchemaText(e.target.value)} spellCheck={false}/>
        <label>Field meanings and business rules</label><textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
      </div>
      <div className="panel controls">
        <h2>Generation controls</h2>
        <label>Record count</label><input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Number(e.target.value))}/>
        <label>Output format</label><select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}><option value="json">JSON</option><option value="jsonl">JSONL</option><option value="csv">CSV where possible</option></select>
        <label>Generation mode</label><select value={mode} onChange={(e) => setMode(e.target.value as GenerationMode)}><option value="code">Generate Python Code</option><option value="data">Generate Data ZIP</option><option value="both">Generate Both</option></select>
        <button onClick={() => run('code')} disabled={loading}>Generate Python Code</button>
        <button onClick={() => run('data')} disabled={loading}>Generate Data ZIP</button>
        <button className="primary" onClick={() => run('both')} disabled={loading}>{loading ? 'Generating…' : 'Generate Both'}</button>
        {result?.download_url && <a className="download" href={result.download_url}><Download size={16}/> Download ZIP</a>}
        {result?.code && <button className="secondary" onClick={downloadCode}><Download size={16}/> Download generate_data.py</button>}
        <div className="notice"><AlertTriangle size={18}/><span>This POC validates generated records where possible, but users must review outputs before testing regulated workflows.</span></div>
      </div>
    </section>

    {(error || result?.warnings?.length || result?.pii_warnings?.length || result?.fallback_mode) && <section className="messages">
      {error && <p className="error">{error}</p>}
      {result?.fallback_mode && <p>AI-assisted extraction is disabled or unavailable. Rule-based fallback generation was used.</p>}
      {result?.warnings?.map((w, i) => <p key={`w-${i}`}>{w}</p>)}
      {result?.pii_warnings?.map((w, i) => <p className="error" key={`p-${i}`}>{w}</p>)}
    </section>}

    {result && <section className="panel output">
      <nav className="tabs">{(['code','data','validation','plan'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>{t}</button>)}</nav>
      {tab === 'code' && <pre className="code"><code>{result.code || 'No code generated yet.'}</code></pre>}
      {tab === 'data' && <pre>{JSON.stringify(result.data_preview ?? result.summary ?? 'Generate data to preview records.', null, 2)}</pre>}
      {tab === 'validation' && <pre>{JSON.stringify(result.validation_report ?? 'No validation report yet.', null, 2)}</pre>}
      {tab === 'plan' && <pre>{JSON.stringify(result.plan, null, 2)}</pre>}
    </section>}
  </main>;
}
