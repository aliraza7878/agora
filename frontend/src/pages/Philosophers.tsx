import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Portrait from '../components/Portrait'
import { usePhilosophers } from '../lib/hooks'
import ErrorNote from '../components/Errors'

export default function Philosophers() {
  const { list, error } = usePhilosophers()
  const loc = useLocation()
  const [sel, setSel] = useState<string>((loc.state as any)?.id ?? '')
  const p = list.find(x => x.id === sel) ?? list[0]
  const [showPrompt, setShowPrompt] = useState(false)

  return (
    <section className="py-12">
      <h1 className="h-display text-5xl">Philosophers</h1>
      <p className="mt-3 max-w-2xl text-mute">Ten schools of thought, each simulated from its documented commitments. They are interpretations for educational debate, not the historical individuals speaking.</p>
      <ErrorNote message={error && `Could not load philosophers: ${error}. Is the backend running?`} />
      {p && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[18rem_1fr]">
          <ul className="grid grid-cols-5 gap-3 lg:grid-cols-2" role="listbox" aria-label="Philosophers">
            {list.map(x => (
              <li key={x.id}>
                <button onClick={() => { setSel(x.id); setShowPrompt(false) }} aria-selected={x.id === p.id} role="option"
                  className={`flex w-full flex-col items-center gap-1 border p-2 transition-colors lg:flex-row lg:gap-3 lg:p-3 ${x.id === p.id ? 'border-gold bg-slab' : 'border-line hover:border-gold/50'}`}>
                  <Portrait p={x} size={44} /><span className="hidden text-left text-sm lg:block">{x.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <article>
            <div className="flex items-center gap-5"><Portrait p={p} size={96} speaking />
              <div><h2 className="h-display text-4xl">{p.name}</h2><p className="text-mute">{p.school} · {p.era}</p><p className="font-serif italic text-gold">{p.tagline}</p></div>
            </div>
            <p className="prose-arg mt-6 max-w-2xl">{p.bio}</p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {([['Key beliefs', p.beliefs], ['Main arguments', p.arguments], ['Famous works', p.works], ['Debate strengths', p.strengths]] as const).map(([h, items]) => (
                <div key={h}><h3 className="h-display text-xl text-gold">{h}</h3><ul className="mt-2 space-y-1.5 text-sm text-parchment/85">{items.map(i => <li key={i}>{i}</li>)}</ul></div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/debate?p1=${p.id}`} className="btn btn-gold">Debate {p.name.split(' ').slice(-1)[0]}</Link>
              <button className="btn btn-line" onClick={() => setShowPrompt(s => !s)}>{showPrompt ? 'Hide' : 'Show'} personality prompt</button>
            </div>
            {showPrompt && <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap border border-line bg-vault p-4 text-xs leading-relaxed text-mute">{p.personality_prompt}</pre>}
          </article>
        </div>
      )}
    </section>
  )
}
