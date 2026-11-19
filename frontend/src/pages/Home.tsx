import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Portrait from '../components/Portrait'
import { usePhilosophers } from '../lib/hooks'
import { debates } from '../lib/store'
import { FEATURED, TOPICS } from '../lib/topics'

const STEPS = [
  ['Choose your contenders', 'Pick two philosophers whose views collide, and a question worth fighting over.'],
  ['Watch the rounds unfold', 'Openings, counterarguments, rebuttals and cross-examination, written live by the model as the debate unfolds.'],
  ['Step into the arena', 'Question either philosopher, defend one, or add an argument. They answer what you actually said.'],
  ['Hear the judgment', 'An impartial judge scores the arguments made, lists the fallacies, and names what stayed unanswered.'],
]

export default function Home() {
  const { list, byId } = usePhilosophers()
  const recent = debates.all().slice(0, 3)
  const a = byId('socrates') ?? list[0], b = byId('nietzsche') ?? list[3]

  return (
    <>
      <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
            className="h-display text-[5.5rem] leading-none tracking-[0.12em] text-gold sm:text-[8rem]">AGORA</motion.h1>
          <p className="h-display mt-6 text-3xl">The art of argument.</p>
          <p className="mt-3 font-serif text-xl italic text-mute">Two minds. Opposing ideas. One search for truth.</p>
          <p className="mt-6 max-w-md text-mute">Enter the arena where the greatest philosophical minds challenge each other. Don't be told what to think. Learn how to think.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/debate" className="btn btn-gold">Enter the arena</Link>
            <Link to="/philosophers" className="btn btn-line">Explore philosophers</Link>
          </div>
        </div>
        <div className="relative hidden h-[22rem] items-center justify-between border-y border-line/80 px-8 lg:flex" aria-hidden>
          {a && <Portrait p={a} size={140} speaking />}
          <div className="absolute inset-y-6 left-1/2 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
          <p className="absolute left-1/2 top-1/2 w-44 -translate-x-1/2 -translate-y-1/2 bg-ink px-2 py-3 text-center font-serif text-lg italic text-parchment/90">Is the examined life worth the cost?</p>
          {b && <Portrait p={b} size={140} />}
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="h-display text-3xl">Featured debates</h2>
        <div className="mt-6 grid gap-px bg-line md:grid-cols-3">
          {FEATURED.map(f => (
            <Link key={f.topic} to={`/debate?p1=${f.p1}&p2=${f.p2}&topic=${encodeURIComponent(f.topic)}`} className="group bg-ink p-6 transition-colors hover:bg-slab">
              <div className="flex items-center gap-3">
                {byId(f.p1) && <Portrait p={byId(f.p1)!} size={52} />}<span className="font-serif text-lg text-mute">against</span>{byId(f.p2) && <Portrait p={byId(f.p2)!} size={52} />}
              </div>
              <p className="h-display mt-5 text-2xl group-hover:text-gold">{f.topic}</p>
              <p className="mt-2 text-sm text-mute">{byId(f.p1)?.name} and {byId(f.p2)?.name}. {f.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-12 border-t border-line py-14 lg:grid-cols-2">
        <div>
          <h2 className="h-display text-3xl">Popular questions</h2>
          <ul className="mt-5 divide-y divide-line/70">
            {TOPICS.slice(0, 6).map(t => (
              <li key={t}><Link to={`/debate?topic=${encodeURIComponent(t)}`} className="block py-3 font-serif text-xl text-parchment/90 hover:text-gold">{t}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="h-display text-3xl">Recently conducted</h2>
          {recent.length === 0 && <p className="mt-5 text-mute">No debates yet. The ones you run will appear here.</p>}
          <ul className="mt-5 divide-y divide-line/70">
            {recent.map(d => (
              <li key={d.id}><Link to={`/arena/${d.id}`} className="block py-3 hover:text-gold">
                <span className="font-serif text-xl">{d.config.topic}</span>
                <span className="block text-sm text-mute">{byId(d.config.p1)?.name} against {byId(d.config.p2)?.name} · {d.status.replace('_', ' ')}</span>
              </Link></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="h-display text-3xl">The philosophers</h2>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-6">
          {list.map(p => (
            <Link key={p.id} to="/philosophers" state={{ id: p.id }} className="group flex w-24 flex-col items-center text-center">
              <Portrait p={p} size={72} /><span className="mt-2 text-xs text-mute group-hover:text-gold">{p.name.split(' ').slice(-1)[0]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="h-display text-3xl">How AGORA works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t}><span className="font-serif text-3xl text-gold">{i + 1}</span><h3 className="h-display mt-1 text-xl">{t}</h3><p className="mt-2 text-sm text-mute">{d}</p></li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl text-xs text-mute">Philosophers in AGORA are AI simulations of historically informed perspectives. They are not authentic statements from the people they portray.</p>
      </section>
    </>
  )
}
