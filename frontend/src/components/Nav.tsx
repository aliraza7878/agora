import { NavLink, Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useKey } from '../lib/hooks'

const LINKS = [
  ['/', 'Home'], ['/debate', 'Debate Arena'], ['/playground', 'AI Playground'],
  ['/philosophers', 'Philosophers'], ['/history', 'Debate History'], ['/prompts', 'Prompt Library'],
] as const

export default function Nav() {
  const key = useKey()
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
        <Link to="/" className="h-display text-2xl tracking-[0.18em] text-gold">AGORA</Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm" aria-label="Primary">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `whitespace-nowrap rounded-sm px-3 py-1.5 transition-colors ${isActive ? 'text-gold' : 'text-mute hover:text-parchment'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/settings" className={`btn btn-line !px-3 !py-1.5 text-xs ${key ? '' : '!border-gold/60 !text-gold'}`}>
          <KeyRound size={14} /> {key ? 'Key connected' : 'Add API key'}
        </Link>
      </div>
    </header>
  )
}
