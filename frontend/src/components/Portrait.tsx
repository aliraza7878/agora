import type { Accent, Philosopher } from '../lib/types'

const COLOR: Record<Accent, string> = { gold: '#C8A55B', violet: '#8274DB', steel: '#6C8BB8', muted: '#8C92AA' }

export function accentColor(a: Accent) { return COLOR[a] }

function initials(name: string) {
  const w = name.split(' ')
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0][0]).toUpperCase()
}

/** Engraved-medallion placeholder. A real portrait_url can replace this later without touching callers. */
export default function Portrait({ p, size = 96, speaking = false }: { p: Pick<Philosopher, 'id' | 'name' | 'accent'>; size?: number; speaking?: boolean }) {
  const c = COLOR[p.accent]
  const id = `g-${p.id}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${p.name} medallion`}
      style={{ filter: speaking ? `drop-shadow(0 0 14px ${c}66)` : undefined, transition: 'filter .4s' }}>
      <defs>
        <radialGradient id={id} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={c} stopOpacity="0.28" /><stop offset="100%" stopColor="#0B0F1A" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id})`} stroke={c} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeOpacity="0.45" strokeWidth="0.6" strokeDasharray="1.5 2.5" />
      <text x="50" y="62" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontSize="34" fontWeight="600" fill={c}>{initials(p.name)}</text>
    </svg>
  )
}
