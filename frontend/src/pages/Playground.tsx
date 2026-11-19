import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Code2, Copy, Eraser, Pencil, RefreshCw, Send, Square } from 'lucide-react'
import ModelSelect from '../components/ModelSelect'
import ParamsPanel from '../components/ParamsPanel'
import KeyBanner from '../components/KeyBanner'
import ErrorNote from '../components/Errors'
import { postJSON, streamSSE } from '../lib/api'
import { useModels } from '../lib/hooks'
import { experiments, prompts, uid, type Experiment } from '../lib/store'
import type { ModelInfo, Params, Usage } from '../lib/types'
import { useStarters } from './PromptLibrary'

const DEFAULT_SYSTEM = 'You are a thoughtful assistant who helps people reason carefully about philosophical questions.'
interface Meta { model: string; duration_ms?: number; usage?: Usage | null; notes?: string[]; applied?: Record<string, unknown>; finish?: string | null }
interface ChatMsg { role: 'user' | 'assistant'; content: string; meta?: Meta }
interface Run { id: string; ts: string; prompt: string; text: string; meta: Meta; params: Params }
const clean = (p: Params): Params => ({ ...p, stop: p.stop?.filter(Boolean).length ? p.stop.filter(Boolean) : undefined })

function MetaLine({ m }: { m: Meta }) {
  const u = m.usage
  return (
    <p className="mt-2 text-xs text-mute">
      {m.model}{m.duration_ms != null && ` · ${(m.duration_ms / 1000).toFixed(2)}s`}
      {u ? ` · ${u.prompt_tokens ?? '?'} prompt + ${u.completion_tokens ?? '?'} completion = ${u.total_tokens ?? '?'} tokens` : m.duration_ms != null ? ' · token usage not returned' : ''}
      {m.notes?.length ? ` · ${m.notes.join('; ')}` : ''}
    </p>
  )
}

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return <button className="inline-flex items-center gap-1 text-xs text-mute hover:text-gold" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400) }}>{ok ? <Check size={12} /> : <Copy size={12} />}{ok ? 'Copied' : label}</button>
}

/* ───────── Chat ───────── */
function Chat({ model, system, params, onExportInput }: { model: string; system: string; params: Params; onExportInput: (s: string) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [runs, setRuns] = useState<Run[]>([])
  const abort = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [msgs])
  useEffect(() => { const last = [...msgs].reverse().find(m => m.role === 'user'); onExportInput(last?.content ?? '') }, [msgs]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate(history: ChatMsg[]) {
    if (!model) return setError('Choose a model first.')
    setError(''); setBusy(true)
    const ctrl = new AbortController(); abort.current = ctrl
    const base = history
    setMsgs([...base, { role: 'assistant', content: '', meta: { model } }])
    let text = ''; const meta: Meta = { model }
    try {
      await streamSSE('/api/playground/chat', { model, system, messages: base.map(({ role, content }) => ({ role, content })), params: clean(params) }, ev => {
        if (ev.type === 'start') { meta.notes = ev.notes; meta.applied = ev.applied_params }
        else if (ev.type === 'token') { text += ev.text; setMsgs(m => m.map((x, i) => (i === m.length - 1 ? { ...x, content: text } : x))) }
        else if (ev.type === 'note') meta.notes = [...(meta.notes ?? []), ev.text]
        else if (ev.type === 'done') { meta.model = ev.model; meta.usage = ev.usage; meta.duration_ms = ev.duration_ms; meta.finish = ev.finish_reason }
        else if (ev.type === 'error') throw new Error(ev.message)
      }, ctrl.signal)
    } catch (e: any) { if (e.name !== 'AbortError') setError(e.message) }
    finally {
      setBusy(false)
      setMsgs(m => m.map((x, i) => (i === m.length - 1 && x.role === 'assistant' ? (x.content ? { ...x, meta } : null) : x)).filter(Boolean) as ChatMsg[])
      if (text) setRuns(r => [{ id: uid(), ts: new Date().toLocaleTimeString(), prompt: base[base.length - 1]?.content ?? '', text, meta, params: clean(params) }, ...r].slice(0, 30))
    }
  }

  function send() { const t = input.trim(); if (!t || busy) return; setInput(''); generate([...msgs, { role: 'user', content: t }]) }
  function regenerate() { const i = msgs.map(m => m.role).lastIndexOf('user'); if (i >= 0 && !busy) generate(msgs.slice(0, i + 1)) }
  function resend(i: number) { const t = editText.trim(); if (!t) return; setEditing(null); generate([...msgs.slice(0, i), { role: 'user', content: t }]) }

  return (
    <div>
      <div className="min-h-[18rem] space-y-6">
        {msgs.length === 0 && <p className="py-16 text-center font-serif text-xl italic text-mute">Send a message to begin. Change the settings and run the same prompt again to compare.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%] border border-line bg-slab p-4' : 'max-w-[92%]'}>
            {editing === i ? (
              <div><textarea className="field h-24" value={editText} onChange={e => setEditText(e.target.value)} />
                <div className="mt-2 flex gap-2"><button className="btn btn-gold !py-1.5" onClick={() => resend(i)}>Resend</button><button className="btn btn-ghost !py-1.5" onClick={() => setEditing(null)}>Cancel</button></div></div>
            ) : (<>
              <p className={`whitespace-pre-wrap ${m.role === 'assistant' ? 'prose-arg' : 'text-sm'} ${busy && i === msgs.length - 1 && m.role === 'assistant' ? 'caret' : ''}`}>{m.content || (busy ? '' : '')}</p>
              {m.role === 'assistant' && m.meta && <MetaLine m={m.meta} />}
              <div className="mt-1 flex gap-3">
                {m.role === 'assistant' && m.content && <CopyBtn text={m.content} />}
                {m.role === 'user' && !busy && <button className="inline-flex items-center gap-1 text-xs text-mute hover:text-gold" onClick={() => { setEditing(i); setEditText(m.content) }}><Pencil size={12} />Edit and resend</button>}
              </div>
            </>)}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-4 space-y-3"><ErrorNote message={error} /></div>
      <div className="sticky bottom-0 mt-4 bg-ink/90 pb-2 pt-3 backdrop-blur">
        <textarea className="field h-24" placeholder="Message the model" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} maxLength={20000} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {busy ? <button className="btn btn-line" onClick={() => abort.current?.abort()}><Square size={13} />Stop</button> : <button className="btn btn-gold" onClick={send} disabled={!input.trim()}><Send size={13} />Send</button>}
          <button className="btn btn-line" onClick={regenerate} disabled={busy || !msgs.length}><RefreshCw size={13} />Regenerate</button>
          <button className="btn btn-ghost" onClick={() => { setMsgs([]); setError('') }} disabled={busy || !msgs.length}><Eraser size={13} />Clear</button>
          <span className="ml-auto text-xs text-mute">Ctrl/⌘ + Enter to send</span>
        </div>
      </div>
      {runs.length > 1 && (
        <details className="mt-8 border-t border-line pt-4"><summary className="cursor-pointer text-sm text-gold">Experiment log ({runs.length} runs this session)</summary>
          <ul className="mt-3 space-y-4">{runs.map(r => (
            <li key={r.id} className="border-l border-line pl-4 text-sm"><p className="text-xs text-mute">{r.ts} · {r.meta.model} · {JSON.stringify(r.params)}</p>
              <p className="mt-1 text-xs italic text-mute">“{r.prompt.slice(0, 120)}”</p><p className="mt-1 line-clamp-4 whitespace-pre-wrap text-parchment/85">{r.text}</p></li>))}
          </ul></details>
      )}
    </div>
  )
}

/* ───────── Compare (models or prompts) ───────── */
interface Side { model: string; system: string }
interface Result { ok: boolean; text?: string; model?: string; usage?: Usage | null; duration_ms?: number; applied_params?: Record<string, unknown>; notes?: string[]; error?: string }

function CompareView({ mode, a, b, setA, setB, base }: { mode: 'model' | 'prompt'; a: Side; b: Side; setA: (s: Side) => void; setB: (s: Side) => void; base: { model: string; system: string; params: Params } }) {
  const [input, setInput] = useState('')
  const [res, setRes] = useState<{ a: Result; b: Result } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pref, setPref] = useState<'a' | 'b' | 'none' | ''>('')
  const cfg = (s: Side) => ({ model: mode === 'model' ? s.model : base.model, system: mode === 'model' ? base.system : s.system, messages: [{ role: 'user', content: input }], params: clean(base.params) })

  async function run() {
    if (!input.trim()) return
    if (!cfg(a).model || !cfg(b).model) return setError('Choose models for both sides.')
    setBusy(true); setError(''); setRes(null); setPref('')
    try { setRes(await postJSON('/api/playground/compare', { a: cfg(a), b: cfg(b) })) } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  const col = (k: 'a' | 'b', s: Side, set: (s: Side) => void, r?: Result) => (
    <div key={k} className={`border p-4 ${pref === k ? 'border-gold' : 'border-line'}`}>
      <h3 className="h-display text-xl text-gold">{k.toUpperCase()}</h3>
      {mode === 'model' ? <div className="mt-2"><ModelSelect value={s.model} onChange={id => set({ ...s, model: id })} label="Model" /></div>
        : <textarea className="field mt-2 h-32 font-mono text-xs" placeholder="System prompt" value={s.system} onChange={e => set({ ...s, system: e.target.value })} maxLength={12000} />}
      {r && (r.ok ? (<>
        <p className="prose-arg mt-4 whitespace-pre-wrap">{r.text}</p>
        <MetaLine m={{ model: r.model ?? '', duration_ms: r.duration_ms, usage: r.usage, notes: r.notes }} />
        <details className="mt-1 text-xs text-mute"><summary className="cursor-pointer">Parameters sent</summary><pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(r.applied_params, null, 1)}</pre></details>
        <div className="mt-2 flex gap-3"><CopyBtn text={r.text ?? ''} /><button className="text-xs text-gold" onClick={() => setPref(k)}>I prefer this answer</button></div>
      </>) : <div className="mt-4"><ErrorNote message={r.error ?? 'Failed'} /></div>)}
    </div>
  )
  return (
    <div>
      <textarea className="field h-24" placeholder="One question, sent identically to both sides" value={input} onChange={e => setInput(e.target.value)} maxLength={20000} />
      <button className="btn btn-gold mt-3" onClick={run} disabled={busy || !input.trim()}>{busy ? 'Running both…' : 'Run both'}</button>
      <div className="mt-4"><ErrorNote message={error} /></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">{col('a', a, setA, res?.a)}{col('b', b, setB, res?.b)}</div>
      {res && <div className="mt-4 flex items-center gap-4 text-sm text-mute">
        <span>Speed and length say little about quality. Judge the answers themselves.</span>
        <button className={`text-xs ${pref === 'none' ? 'text-gold' : 'hover:text-gold'}`} onClick={() => setPref('none')}>No preference</button></div>}
    </div>
  )
}

/* ───────── Prompt Lab ───────── */
function PromptLab({ base }: { base: { model: string; system: string; params: Params } }) {
  const [list, setList] = useState<Experiment[]>(experiments.all())
  const [cur, setCur] = useState<Experiment>(() => experiments.all()[0] ?? { id: uid(), name: 'Untitled experiment', versions: [] })
  const [a, setA] = useState<Side>({ model: '', system: base.system })
  const [b, setB] = useState<Side>({ model: '', system: '' })
  const [note, setNote] = useState('')
  const persist = (e: Experiment) => { setCur(e); experiments.put(e); setList(experiments.all()) }
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <input className="field !w-64 font-serif text-lg" value={cur.name} aria-label="Experiment name" onChange={e => persist({ ...cur, name: e.target.value })} />
        <select className="field !w-auto" value={cur.id} aria-label="Switch experiment" onChange={e => { const x = list.find(l => l.id === e.target.value); if (x) setCur(x) }}>
          {!list.some(l => l.id === cur.id) && <option value={cur.id}>{cur.name}</option>}{list.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <button className="btn btn-line !py-1.5" onClick={() => setCur({ id: uid(), name: 'Untitled experiment', versions: [] })}>New</button>
        {list.some(l => l.id === cur.id) && <button className="btn btn-ghost !py-1.5" onClick={() => { if (confirm('Delete this experiment?')) { experiments.remove(cur.id); const r = experiments.all(); setList(r); setCur(r[0] ?? { id: uid(), name: 'Untitled experiment', versions: [] }) } }}>Delete</button>}
      </div>
      <p className="mb-3 text-sm text-mute">Write two system prompts and send the same question to both, using the model and settings in the left panel.</p>
      <CompareView mode="prompt" a={a} b={b} setA={setA} setB={setB} base={base} />
      <div className="mt-8 border-t border-line pt-5">
        <div className="flex flex-wrap gap-2"><input className="field !w-64" placeholder="Version note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn btn-line" onClick={() => { persist({ ...cur, versions: [{ id: uid(), ts: new Date().toISOString(), a: a.system, b: b.system, note }, ...cur.versions] }); setNote('') }}>Save version</button></div>
        <ul className="mt-4 space-y-2 text-sm">{cur.versions.map(v => (
          <li key={v.id} className="flex items-center gap-3 border-b border-line/60 pb-2"><span className="text-mute">{new Date(v.ts).toLocaleString()}</span><span className="flex-1 truncate">{v.note || v.a.slice(0, 60)}</span>
            <button className="text-gold" onClick={() => { setA({ ...a, system: v.a }); setB({ ...b, system: v.b }) }}>Restore</button></li>))}
        </ul>{!cur.versions.length && <p className="mt-3 text-sm text-mute">No saved versions yet.</p>}
      </div>
    </div>
  )
}

/* ───────── Page ───────── */
export default function Playground() {
  const [tab, setTab] = useState<'chat' | 'lab' | 'compare'>('chat')
  const [model, setModel] = useState('')
  const [system, setSystem] = useState(DEFAULT_SYSTEM)
  const [params, setParams] = useState<Params>({ json_mode: false })
  const [lastUser, setLastUser] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const { models } = useModels()
  const info: ModelInfo | undefined = useMemo(() => models.find(m => m.id === model), [models, model])
  const starters = useStarters()
  const [lib, setLib] = useState(prompts.all())
  const [cA, setCA] = useState<Side>({ model: '', system: '' })
  const [cB, setCB] = useState<Side>({ model: '', system: '' })
  const base = { model, system, params }

  // When the model changes, drop settings it does not support so nothing unsupported stays "active".
  useEffect(() => {
    if (!info) return
    const c = info.capabilities
    setParams(p => ({
      ...p,
      temperature: c.temperature.supported ? p.temperature : undefined, top_p: c.top_p.supported ? p.top_p : undefined,
      max_completion_tokens: c.max_completion_tokens.supported ? p.max_completion_tokens && Math.min(p.max_completion_tokens, c.max_completion_tokens.max ?? Infinity) : undefined,
      frequency_penalty: c.frequency_penalty.supported ? p.frequency_penalty : undefined, presence_penalty: c.presence_penalty.supported ? p.presence_penalty : undefined,
      seed: c.seed.supported ? p.seed : undefined, stop: c.stop.supported ? p.stop : undefined, json_mode: c.json_mode.supported && p.json_mode,
    }))
  }, [info?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (model) { setCA(s => (s.model ? s : { ...s, model })); setCB(s => (s.model ? s : { ...s, model })) } }, [model])

  function saveToLibrary(copy = false) {
    const name = prompt(copy ? 'Name for the duplicate' : 'Name for this prompt', 'My prompt')
    if (name?.trim()) { prompts.put({ id: uid(), name: name.trim(), text: system }); setLib(prompts.all()) }
  }
  const options = [...starters, ...lib]

  return (
    <section className="py-10">
      <h1 className="h-display text-5xl">AI Playground</h1>
      <p className="mt-2 text-mute">Experiment with live models on your own Groq account.</p>
      <div className="mt-6"><KeyBanner /></div>
      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-6 border border-line bg-vault p-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ModelSelect value={model} onChange={setModel} />
          {info && <p className="-mt-3 text-xs text-mute">{info.owned_by && `${info.owned_by} · `}{info.context_window && `${info.context_window.toLocaleString()} token context`}{info.max_completion_tokens ? ` · up to ${info.max_completion_tokens.toLocaleString()} output` : ''}{info.deprecated ? ' · inactive' : ''}</p>}
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-mute"><span>System prompt</span>
              <select className="max-w-[9rem] border border-line bg-vault px-1 py-0.5 text-xs" value="" aria-label="Load prompt from library" onChange={e => { const p = options.find(o => o.id === e.target.value); if (p) setSystem(p.text) }}>
                <option value="">Load…</option>{options.map(o => <option key={o.id} value={o.id}>{o.starter ? '◆ ' : ''}{o.name}</option>)}</select></div>
            <textarea className="field h-36 text-[13px]" value={system} onChange={e => setSystem(e.target.value)} maxLength={12000} />
            <div className="mt-2 flex gap-3 text-xs"><button className="text-gold" onClick={() => saveToLibrary()}>Save</button><button className="text-mute hover:text-gold" onClick={() => saveToLibrary(true)}>Duplicate</button><button className="text-mute hover:text-gold" onClick={() => setSystem(DEFAULT_SYSTEM)}>Reset to default</button></div>
          </div>
          <div><h2 className="h-display mb-3 text-lg text-gold">Parameters</h2><ParamsPanel model={info} params={params} setParams={setParams} /></div>
          <button className="btn btn-line w-full" onClick={() => setExportOpen(true)} disabled={!model}><Code2 size={14} />Export code</button>
        </aside>

        <div>
          <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
            {([['chat', 'Chat'], ['lab', 'Prompt Lab'], ['compare', 'Model comparison']] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm transition-colors ${tab === k ? 'border-b-2 border-gold text-gold' : 'text-mute hover:text-parchment'}`}>{l}</button>))}
          </div>
          {/* Chat stays mounted so switching tabs does not lose the conversation */}
          <div hidden={tab !== 'chat'}><Chat model={model} system={system} params={params} onExportInput={setLastUser} /></div>
          {tab === 'lab' && <PromptLab base={base} />}
          {tab === 'compare' && <CompareView mode="model" a={cA} b={cB} setA={setCA} setB={setCB} base={base} />}
        </div>
      </div>
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} model={model} system={system} params={params} user={lastUser} />}
    </section>
  )
}

function ExportModal({ onClose, model, system, params, user }: { onClose: () => void; model: string; system: string; params: Params; user: string }) {
  const [lang, setLang] = useState<'python' | 'javascript'>('python')
  const [stream, setStream] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    postJSON<{ code: string }>('/api/playground/export', { config: { model, system, messages: [{ role: 'user', content: user || 'Your message here' }], params: clean(params) }, language: lang, stream })
      .then(r => { setCode(r.code); setError('') }).catch(e => setError(e.message))
  }, [lang, stream]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-modal="true" aria-label="Export code" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl border border-line bg-vault p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4"><h2 className="h-display text-2xl">Export code</h2>
          {(['python', 'javascript'] as const).map(l => <button key={l} onClick={() => setLang(l)} className={`text-sm ${lang === l ? 'text-gold' : 'text-mute'}`}>{l === 'python' ? 'Python' : 'JavaScript'}</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={stream} onChange={e => setStream(e.target.checked)} />Streaming</label></div>
        <ErrorNote message={error} />
        <pre className="mt-4 max-h-[26rem] overflow-auto border border-line bg-ink p-4 text-xs leading-relaxed">{code}</pre>
        <div className="mt-3 flex items-center justify-between"><p className="text-xs text-mute">Reads GROQ_API_KEY from your environment. No key is included.</p><div className="flex gap-4"><CopyBtn text={code} /><button className="text-sm text-gold" onClick={onClose}>Close</button></div></div>
      </div>
    </div>
  )
}
