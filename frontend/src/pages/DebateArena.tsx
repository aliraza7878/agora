import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquarePlus, Pause, Play, Send } from 'lucide-react'
import Portrait from '../components/Portrait'
import Judgment from '../components/Judgment'
import Vote from '../components/Vote'
import ErrorNote from '../components/Errors'
import KeyBanner from '../components/KeyBanner'
import { getJSON, postJSON, streamSSE } from '../lib/api'
import { usePhilosophers } from '../lib/hooks'
import { debates } from '../lib/store'
import type { Debate, Judgment as J, Msg, Turn } from '../lib/types'

interface Live { speaker: 'p1' | 'p2'; round: number; stage: string; label: string; text: string }
const KINDS = [['defend', 'Defend a philosopher'], ['challenge', 'Challenge a philosopher'], ['question', 'Ask a question'], ['argument', 'Introduce a new argument'], ['clarify', 'Request clarification']] as const

export default function DebateArena() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { byId } = usePhilosophers()
  const [debate, setDebate] = useState<Debate | undefined>(() => debates.get(id))
  const [plan, setPlan] = useState<Turn[]>([])
  const [live, setLive] = useState<Live | null>(null)
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('question')
  const [target, setTarget] = useState<'p1' | 'p2' | 'both'>('both')
  const dRef = useRef<Debate | undefined>(debate)
  const runRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const busyRef = useRef(false)

  const persist = useCallback((d: Debate) => { dRef.current = d; setDebate(d); debates.put(d) }, [])
  useEffect(() => () => { runRef.current = false; abortRef.current?.abort() }, [])
  useEffect(() => {
    if (!debate) return
    getJSON<{ turns: Turn[] }>(`/api/debate/plan?rounds=${debate.config.rounds}`).then(r => setPlan(r.turns)).catch(e => setError(e.message))
  }, [debate?.config.rounds]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!debate) return <p className="py-24 text-mute">That debate was not found on this device. <button className="text-gold underline" onClick={() => nav('/debate')}>Start a new one</button></p>
  const cfg = debate.config
  const p1 = byId(cfg.p1), p2 = byId(cfg.p2)
  if (!p1 || !p2) return <p className="py-24 text-mute">Loading philosophers…</p>
  const name = { p1: p1.name, p2: p2.name }
  const done = plan.length > 0 && debate.nextTurn >= plan.length
  const current = plan[debate.nextTurn]
  const roleDesc = { spectator: 'spectator', advocate_p1: `advocate for ${p1.name}`, advocate_p2: `advocate for ${p2.name}`, independent: 'independent participant' }[cfg.user_role]

  async function playTurn(): Promise<boolean> {
    const d = dRef.current!
    const ctrl = new AbortController(); abortRef.current = ctrl
    let final = ''; let spk: 'p1' | 'p2' = 'p1'; let stage = ''; let round = 0
    try {
      await streamSSE('/api/debate/turn', { config: d.config, transcript: d.messages, turn_index: d.nextTurn }, ev => {
        if (ev.type === 'turn_start') { spk = ev.speaker; stage = ev.stage; round = ev.round; setLive({ speaker: ev.speaker, round: ev.round, stage: ev.stage, label: ev.label, text: '' }) }
        else if (ev.type === 'token') setLive(l => (l ? { ...l, text: l.text + ev.text } : l))
        else if (ev.type === 'status') setNote(ev.text)
        else if (ev.type === 'error') throw new Error(ev.message)
        else if (ev.type === 'turn_end') final = ev.content
      }, ctrl.signal)
      if (!final) throw new Error('The model returned an empty response. Try again, or pick a different model.')
      const msg: Msg = { speaker: spk, content: final, round, stage }
      persist({ ...d, messages: [...d.messages, msg], nextTurn: d.nextTurn + 1 })
      setNote(''); return true
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message)
      return false
    } finally { setLive(null) }
  }

  async function judge() {
    const d = dRef.current!
    persist({ ...d, status: 'judging' }); setError(''); setNote('The judge is reading the transcript…')
    try {
      const j = await postJSON<J>('/api/debate/judge', { config: d.config, transcript: dRef.current!.messages })
      persist({ ...dRef.current!, status: 'completed', judgment: j })
    } catch (e: any) { setError(e.message) } finally { setNote('') }
  }

  async function loop() {
    if (busyRef.current) return
    busyRef.current = true; runRef.current = true; setRunning(true); setError('')
    try {
      while (runRef.current && dRef.current!.nextTurn < plan.length) { if (!(await playTurn())) break }
      if (runRef.current && dRef.current!.nextTurn >= plan.length && !dRef.current!.judgment) await judge()
    } finally { runRef.current = false; busyRef.current = false; setRunning(false) }
  }

  async function send() {
    const content = text.trim()
    if (!content || busyRef.current) return
    const d = dRef.current!
    const round = current?.round ?? plan[plan.length - 1]?.round ?? 0
    const role = `${roleDesc}, ${KINDS.find(k => k[0] === kind)![1].toLowerCase()}`
    busyRef.current = true; setRunning(true); setError(''); setText('')
    const before = d.messages
    persist({ ...d, messages: [...before, { speaker: 'user', content, round, target, role }] })
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      await streamSSE('/api/debate/intervene', { config: d.config, transcript: before, message: { content, target, role, round } }, ev => {
        if (ev.type === 'turn_start') setLive({ speaker: ev.speaker, round, stage: ev.stage, label: ev.label, text: '' })
        else if (ev.type === 'token') setLive(l => (l ? { ...l, text: l.text + ev.text } : l))
        else if (ev.type === 'status') setNote(ev.text)
        else if (ev.type === 'error') throw new Error(ev.message)
        else if (ev.type === 'turn_end' && ev.content) {
          persist({ ...dRef.current!, messages: [...dRef.current!.messages, { speaker: ev.speaker, content: ev.content, round, stage: 'intervention_reply' }] })
          setLive(null)
        }
      }, ctrl.signal)
    } catch (e: any) { if (e.name !== 'AbortError') setError(e.message) }
    finally { setLive(null); setNote(''); busyRef.current = false; setRunning(false) }
  }

  const lastBy = (s: 'p1' | 'p2') => [...debate.messages].reverse().find(m => m.speaker === s)
  const progress = plan.length ? Math.round((debate.nextTurn / plan.length) * 100) : 0
  const status = debate.status === 'completed' ? 'Debate complete' : debate.status === 'judging' ? 'Awaiting judgment' : live ? `${name[live.speaker]} is speaking` : running ? 'Preparing the next speech' : debate.nextTurn === 0 ? 'Ready to begin' : done ? 'All rounds finished' : 'Paused'

  const renderSide = (s: 'p1' | 'p2', p: NonNullable<typeof p1>) => {
    const speaking = live?.speaker === s
    const last = lastBy(s)
    const shown = speaking ? live!.text : last?.content
    return (
      <div key={s} className={`border-t-2 pt-5 ${s === 'p1' ? 'border-gold/70' : 'border-violet/70'}`}>
        <div className="flex items-center gap-4"><Portrait p={p} size={72} speaking={speaking} />
          <div><h2 className="h-display text-3xl">{p.name}</h2><p className="text-sm text-mute">{p.school}</p>
            <p className={`mt-1 text-xs ${speaking ? 'text-gold' : 'text-mute'}`}>{speaking ? `Speaking · ${live!.label}` : last ? `Last spoke in ${last.stage?.replace('_', ' ') ?? 'debate'}` : 'Waiting'}</p></div>
        </div>
        <div className={`prose-arg mt-5 max-h-[26rem] overflow-y-auto pr-2 ${speaking ? 'caret' : ''}`} aria-live={speaking ? 'polite' : undefined}>
          {shown ? shown : <span className="text-mute">{done ? 'Has finished speaking.' : 'Has not spoken yet.'}</span>}
        </div>
      </div>
    )
  }

  const rounds = [...new Set(debate.messages.map(m => m.round))].sort((a, b) => a - b)

  return (
    <section className="py-10">
      <KeyBanner />
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm text-mute">{p1.name} against {p2.name} · {cfg.rounds} rounds · {cfg.style} · {cfg.model}</p>
        <h1 className="h-display mt-2 text-4xl sm:text-5xl">{cfg.topic}</h1>
      </header>

      <div className="mx-auto mt-8 max-w-xl text-center">
        <div className="flex justify-between text-xs text-mute"><span>{current ? `Round ${current.round} of ${cfg.rounds} · ${current.label}` : done ? `All ${cfg.rounds} rounds` : 'Round 1'}</span><span>{progress}%</span></div>
        <div className="mt-1 h-px bg-line"><div className="h-px bg-gold transition-all duration-700" style={{ width: `${progress}%` }} /></div>
        <p className="mt-3 font-serif text-xl italic text-parchment/90">{status}</p>
        {note && <p className="mt-1 text-xs text-gold">{note}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {!done && debate.status !== 'completed' && (running
            ? <button className="btn btn-line" onClick={() => { runRef.current = false; setNote('Pausing after this speech') }}><Pause size={14} />Pause</button>
            : <button className="btn btn-gold" onClick={loop} disabled={!plan.length}><Play size={14} />{debate.nextTurn ? 'Resume' : 'Begin debate'}</button>)}
          {done && !debate.judgment && <button className="btn btn-gold" onClick={() => { busyRef.current = false; judge() }} disabled={debate.status === 'judging' && !error}>Request judgment</button>}
          {debate.status !== 'completed' && <button className="btn btn-line" onClick={() => setJoinOpen(o => !o)}><MessageSquarePlus size={14} />Join the debate</button>}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl space-y-3"><ErrorNote message={error} onRetry={done ? judge : !running ? loop : undefined} /></div>

      {joinOpen && debate.status !== 'completed' && (
        <div className="mx-auto mt-6 max-w-3xl border border-line bg-vault p-5">
          <p className="text-sm text-mute">You are taking part as: <span className="text-parchment">{roleDesc === 'spectator' ? 'a spectator asking from the floor' : roleDesc}</span>. {running && 'Pause the debate, or wait for the current speech, to send.'}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <select className="field !w-auto" value={kind} onChange={e => setKind(e.target.value as typeof kind)} aria-label="Type of contribution">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <div role="radiogroup" aria-label="Address" className="flex gap-1 text-sm">
              {([['p1', p1.name.split(' ').slice(-1)[0]], ['both', 'Both'], ['p2', p2.name.split(' ').slice(-1)[0]]] as const).map(([v, l]) => (
                <button key={v} role="radio" aria-checked={target === v} onClick={() => setTarget(v)} className={`border px-3 py-1.5 ${target === v ? 'border-gold text-gold' : 'border-line text-mute'}`}>{l}</button>))}
            </div>
          </div>
          <textarea className="field mt-3 h-24" maxLength={2000} placeholder="Say what you want to put to the philosophers" value={text} onChange={e => setText(e.target.value)} />
          <button className="btn btn-gold mt-3" onClick={send} disabled={!text.trim() || running}><Send size={14} />Send</button>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">{renderSide('p1', p1)}{renderSide('p2', p2)}</div>

      {debate.messages.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="tr">
          <h2 id="tr" className="h-display text-3xl">Full transcript</h2>
          {rounds.map(r => (
            <div key={r} className="mt-6">
              <h3 className="text-sm font-medium text-gold">{r === 0 ? 'Before the rounds' : `Round ${r}`}</h3>
              <div className="mt-2 space-y-5">
                {debate.messages.filter(m => m.round === r).map((m, i) => (
                  <div key={i} className={m.speaker === 'user' ? 'border-l-2 border-steel pl-4' : ''}>
                    <p className="text-sm text-mute">{m.speaker === 'user' ? `You (${m.role ?? 'participant'}) to ${m.target === 'both' ? 'both philosophers' : name[m.target as 'p1' | 'p2']}` : `${name[m.speaker]}${m.stage ? ` · ${m.stage.replace('_', ' ')}` : ''}`}</p>
                    <p className="prose-arg mt-1 max-w-3xl whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {debate.judgment && <div className="mt-16 space-y-16"><Judgment j={debate.judgment} n1={p1.name} n2={p2.name} /><Vote id={debate.id} n1={p1.name} n2={p2.name} /></div>}
    </section>
  )
}
