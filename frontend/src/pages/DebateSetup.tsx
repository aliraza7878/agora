import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Portrait from '../components/Portrait'
import ModelSelect from '../components/ModelSelect'
import KeyBanner from '../components/KeyBanner'
import ErrorNote from '../components/Errors'
import { usePhilosophers } from '../lib/hooks'
import { getKey } from '../lib/keystore'
import { debates, uid } from '../lib/store'
import { TOPICS } from '../lib/topics'
import type { DebateConfig, Philosopher, Role } from '../lib/types'

const LENGTHS = [[3, 'Short', '3 rounds'], [5, 'Standard', '5 rounds'], [7, 'Extended', '7 rounds']] as const
const STYLES = [['academic', 'Academic'], ['aggressive', 'Aggressive but respectful'], ['socratic', 'Socratic questioning'], ['formal', 'Formal philosophical debate']] as const
const ROLES: [Role, string][] = [['spectator', 'Spectator'], ['advocate_p1', 'Advocate for Philosopher 1'], ['advocate_p2', 'Advocate for Philosopher 2'], ['independent', 'Independent participant']]

function Picker({ title, list, value, other, onChange }: { title: string; list: Philosopher[]; value: string; other: string; onChange: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="h-display mb-3 text-xl text-gold">{title}</legend>
      <div className="grid grid-cols-5 gap-2">
        {list.map(p => (
          <button key={p.id} type="button" disabled={p.id === other} onClick={() => onChange(p.id)} aria-pressed={p.id === value} title={`${p.name}: ${p.tagline}`}
            className={`flex flex-col items-center gap-1 border p-2 text-center transition-colors disabled:opacity-30 ${p.id === value ? 'border-gold bg-slab' : 'border-line hover:border-gold/50'}`}>
            <Portrait p={p} size={44} /><span className="text-[11px] leading-tight text-mute">{p.name.split(' ').slice(-1)[0]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function DebateSetup() {
  const { list, error } = usePhilosophers()
  const [q] = useSearchParams()
  const nav = useNavigate()
  const [p1, setP1] = useState(q.get('p1') ?? '')
  const [p2, setP2] = useState(q.get('p2') ?? '')
  const [topic, setTopic] = useState(q.get('topic') ?? '')
  const [rounds, setRounds] = useState<3 | 5 | 7>(5)
  const [style, setStyle] = useState<DebateConfig['style']>('academic')
  const [role, setRole] = useState<Role>('spectator')
  const [model, setModel] = useState('')
  const [err, setErr] = useState('')

  function start() {
    const t = topic.trim()
    if (!p1 || !p2) return setErr('Choose both philosophers.')
    if (p1 === p2) return setErr('Choose two different philosophers.')
    if (t.length < 3 || t.length > 300) return setErr('Enter a topic between 3 and 300 characters.')
    if (!getKey()) return setErr('Add your API key in Settings first.')
    if (!model) return setErr('Pick a model.')
    const d = { id: uid(), created_at: new Date().toISOString(), config: { topic: t, p1, p2, rounds, style, model, user_role: role }, messages: [], nextTurn: 0, status: 'in_progress' as const }
    debates.put(d)
    nav(`/arena/${d.id}`)
  }

  const n = (id: string) => list.find(p => p.id === id)?.name

  return (
    <section className="py-12">
      <h1 className="h-display text-5xl">Set the stage</h1>
      <p className="mt-3 text-mute">Choose your contenders, the question, and how you want to take part.</p>
      <div className="mt-6"><KeyBanner /><ErrorNote message={error && `Could not load philosophers: ${error}`} /></div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <Picker title="Philosopher 1" list={list} value={p1} other={p2} onChange={setP1} />
        <Picker title="Philosopher 2" list={list} value={p2} other={p1} onChange={setP2} />
      </div>
      {p1 && p2 && <p className="mt-6 text-center font-serif text-2xl text-parchment">{n(p1)} <span className="text-gold">against</span> {n(p2)}</p>}

      <div className="mt-10">
        <label className="h-display mb-2 block text-xl text-gold" htmlFor="topic">Topic</label>
        <input id="topic" className="field !py-3 font-serif text-lg" maxLength={300} placeholder="Choose a suggestion or write your own question"
          value={topic} onChange={e => setTopic(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map(t => <button key={t} onClick={() => setTopic(t)} className={`border px-3 py-1 text-xs transition-colors ${t === topic ? 'border-gold text-gold' : 'border-line text-mute hover:border-gold/50 hover:text-parchment'}`}>{t}</button>)}
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <fieldset><legend className="h-display mb-2 text-xl text-gold">Length</legend>
          {LENGTHS.map(([v, l, d]) => <label key={v} className="mb-1.5 flex items-center gap-2 text-sm"><input type="radio" name="len" checked={rounds === v} onChange={() => setRounds(v)} />{l} <span className="text-mute">({d})</span></label>)}
        </fieldset>
        <fieldset><legend className="h-display mb-2 text-xl text-gold">Style</legend>
          {STYLES.map(([v, l]) => <label key={v} className="mb-1.5 flex items-center gap-2 text-sm"><input type="radio" name="style" checked={style === v} onChange={() => setStyle(v)} />{l}</label>)}
        </fieldset>
        <fieldset><legend className="h-display mb-2 text-xl text-gold">Your role</legend>
          {ROLES.map(([v, l]) => <label key={v} className="mb-1.5 flex items-center gap-2 text-sm"><input type="radio" name="role" checked={role === v} onChange={() => setRole(v)} />{l}</label>)}
        </fieldset>
      </div>

      <div className="mt-10 max-w-md"><ModelSelect value={model} onChange={setModel} /></div>
      <div className="mt-8 space-y-3"><ErrorNote message={err} /><button className="btn btn-gold !px-8 !py-3" onClick={start}>Start debate</button></div>
    </section>
  )
}
