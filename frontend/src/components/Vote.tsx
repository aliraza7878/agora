import { useState } from 'react'
import { votes } from '../lib/store'

export default function Vote({ id, n1, n2 }: { id: string; n1: string; n2: string }) {
  const [t, setT] = useState(votes.get(id))
  const total = t.p1 + t.p2 + t.tie
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const opts = [['p1', n1], ['tie', 'Neither / tie'], ['p2', n2]] as const
  return (
    <section className="border-t border-line pt-12" aria-labelledby="vote">
      <h2 id="vote" className="h-display text-3xl">Audience vote</h2>
      <p className="mt-2 text-sm text-mute">Who argued better? This is your view, separate from the judge's reasoning-based evaluation. Totals shown are votes cast on this device.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {opts.map(([k, l]) => (
          <button key={k} onClick={() => setT(votes.cast(id, k))} aria-pressed={t.mine === k}
            className={`border px-4 py-3 text-left transition-colors ${t.mine === k ? 'border-gold bg-slab' : 'border-line hover:border-gold/50'}`}>
            <span className="block text-sm">{l}</span>
            <span className="font-serif text-3xl text-gold">{pct(t[k])}%</span> <span className="text-xs text-mute">{t[k]} vote{t[k] === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-mute">{total} total vote{total === 1 ? '' : 's'}. You can change your vote.</p>
    </section>
  )
}
