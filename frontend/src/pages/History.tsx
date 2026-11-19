import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Trash2 } from 'lucide-react'
import { usePhilosophers } from '../lib/hooks'
import { debates } from '../lib/store'

export default function History() {
  const [all, setAll] = useState(debates.all())
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const { byId } = usePhilosophers()
  const shown = useMemo(() => all.filter(d => {
    const hay = `${d.config.topic} ${byId(d.config.p1)?.name ?? d.config.p1} ${byId(d.config.p2)?.name ?? d.config.p2}`.toLowerCase()
    return hay.includes(q.toLowerCase()) && (status === 'all' || d.status === status)
  }), [all, q, status, byId])

  return (
    <section className="py-12">
      <h1 className="h-display text-5xl">Debate history</h1>
      <p className="mt-3 text-mute">Debates are saved on this device. Open one to reread the transcript and judgment.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <label className="relative flex-1 min-w-[14rem]"><Search size={15} className="absolute left-3 top-3 text-mute" />
          <input className="field !pl-9" placeholder="Search by topic or philosopher" value={q} onChange={e => setQ(e.target.value)} /></label>
        <select className="field !w-auto" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All</option><option value="completed">Completed</option><option value="in_progress">In progress</option>
        </select>
      </div>
      {shown.length === 0 && <p className="mt-10 text-mute">{all.length ? 'Nothing matches that search.' : 'No debates yet. Start one from the Debate Arena.'}</p>}
      <ul className="mt-6 divide-y divide-line/70">
        {shown.map(d => (
          <li key={d.id} className="flex items-center gap-4 py-4">
            <Link to={`/arena/${d.id}`} className="flex-1 hover:text-gold">
              <span className="font-serif text-2xl">{d.config.topic}</span>
              <span className="mt-1 block text-sm text-mute">{byId(d.config.p1)?.name} against {byId(d.config.p2)?.name} · {d.config.rounds} rounds · {d.status.replace('_', ' ')}
                {d.judgment && ` · ${d.judgment.overall.p1} to ${d.judgment.overall.p2}`} · {new Date(d.created_at).toLocaleDateString()}
                {d.messages.some(m => m.speaker === 'user') && ' · you took part'}</span>
            </Link>
            <button aria-label="Delete debate" className="text-mute hover:text-red-300" onClick={() => { if (confirm('Delete this debate?')) { debates.remove(d.id); setAll(debates.all()) } }}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
    </section>
  )
}
