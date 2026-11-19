import type { Judgment as J } from '../lib/types'

const LABELS: Record<string, string> = {
  logical_consistency: 'Logical consistency', strength_of_reasoning: 'Strength of reasoning', supporting_evidence: 'Supporting evidence',
  relevance: 'Relevance to the topic', handling_counterarguments: 'Handling counterarguments', identifying_assumptions: 'Identifying assumptions', philosophical_depth: 'Philosophical depth',
}

function Bar({ v, side }: { v: number; side: 'p1' | 'p2' }) {
  return <div className="h-1.5 w-full bg-line"><div className={`h-full ${side === 'p1' ? 'bg-gold' : 'bg-violet'}`} style={{ width: `${v}%` }} /></div>
}

export default function Judgment({ j, n1, n2 }: { j: J; n1: string; n2: string }) {
  const name = { p1: n1, p2: n2 }
  const result = j.winner === 'tie' ? 'The judge found the debate too close to separate.' : `The judge scored ${name[j.winner]} higher on the arguments made.`
  return (
    <section className="border-t border-line pt-12" aria-labelledby="judgment">
      <h2 id="judgment" className="h-display text-4xl">The judgment</h2>
      <p className="mt-2 text-mute">{result}</p>

      <div className="mt-8 grid grid-cols-2 gap-px bg-line text-center">
        {(['p1', 'p2'] as const).map(s => (
          <div key={s} className="bg-ink py-6">
            <div className={`font-serif text-6xl ${s === 'p1' ? 'text-gold' : 'text-violet'}`}>{j.overall[s]}</div>
            <div className="mt-1 text-sm text-mute">{name[s]} · out of 100</div>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-5">
        {Object.entries(j.categories).map(([k, c]) => (
          <div key={k}>
            <div className="flex justify-between text-sm"><span className="font-medium">{LABELS[k] ?? k}</span><span className="text-mute">{c.p1} · {c.p2}</span></div>
            <div className="mt-1.5 space-y-1"><Bar v={c.p1} side="p1" /><Bar v={c.p2} side="p2" /></div>
            <p className="mt-2 text-sm text-mute">{c.rationale}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {(['p1', 'p2'] as const).map(s => (
          <div key={s}>
            <h3 className="h-display text-2xl">{name[s]}</h3>
            <h4 className="mt-4 text-sm font-medium text-gold">Strongest argument</h4><p className="mt-1 text-sm text-parchment/85">{j.strongest[s] || 'Not identified.'}</p>
            <h4 className="mt-4 text-sm font-medium text-gold">Weakest argument</h4><p className="mt-1 text-sm text-parchment/85">{j.weakest[s] || 'Not identified.'}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <div><h3 className="h-display text-2xl">Left unanswered</h3>
          {j.unanswered_questions.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-parchment/85">{j.unanswered_questions.map(q => <li key={q}>{q}</li>)}</ul> : <p className="mt-3 text-sm text-mute">The judge found no major unanswered questions.</p>}
        </div>
        <div><h3 className="h-display text-2xl">Logical fallacies</h3>
          {j.fallacies.length ? <ul className="mt-3 space-y-3 text-sm">{j.fallacies.map((f, i) => <li key={i}><span className="text-gold">{f.name}</span> <span className="text-mute">({name[f.speaker]})</span><br /><span className="text-parchment/85">{f.explanation}</span></li>)}</ul> : <p className="mt-3 text-sm text-mute">None identified.</p>}
        </div>
      </div>

      <div className="mt-12 border-l-2 border-gold pl-5"><h3 className="h-display text-2xl">Final verdict</h3><p className="prose-arg mt-2 max-w-3xl">{j.verdict}</p></div>
      <p className="mt-8 text-xs text-mute">{j.disclaimer}{j.judge_model && ` Judged by ${j.judge_model}.`}</p>
    </section>
  )
}
