import type { Debate, PromptItem } from './types'

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota or blocked */ }
}
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

// Debates (stored on this device until the Supabase persistence layer is connected)
export const debates = {
  all: (): Debate[] => load<Debate[]>('agora.debates', []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  get: (id: string) => debates.all().find(d => d.id === id),
  put: (d: Debate) => save('agora.debates', [d, ...debates.all().filter(x => x.id !== d.id)]),
  remove: (id: string) => save('agora.debates', debates.all().filter(x => x.id !== id)),
}

// Audience votes (device-local tallies)
export type Tally = { p1: number; p2: number; tie: number; mine?: 'p1' | 'p2' | 'tie' }
export const votes = {
  get: (id: string): Tally => load<Record<string, Tally>>('agora.votes', {})[id] ?? { p1: 0, p2: 0, tie: 0 },
  cast: (id: string, choice: 'p1' | 'p2' | 'tie') => {
    const all = load<Record<string, Tally>>('agora.votes', {})
    const t = all[id] ?? { p1: 0, p2: 0, tie: 0 }
    if (t.mine) t[t.mine] = Math.max(0, t[t.mine] - 1)
    t[choice] += 1; t.mine = choice
    all[id] = t; save('agora.votes', all); return t
  },
}

// Personal prompt library (private to this browser)
export const prompts = {
  all: (): PromptItem[] => load<PromptItem[]>('agora.prompts', []),
  put: (p: PromptItem) => save('agora.prompts', [{ ...p, updated_at: new Date().toISOString() }, ...prompts.all().filter(x => x.id !== p.id)]),
  remove: (id: string) => save('agora.prompts', prompts.all().filter(x => x.id !== id)),
}

// Prompt lab experiments
export interface Version { id: string; ts: string; a: string; b: string; note: string }
export interface Experiment { id: string; name: string; versions: Version[] }
export const experiments = {
  all: (): Experiment[] => load<Experiment[]>('agora.experiments', []),
  put: (e: Experiment) => save('agora.experiments', [e, ...experiments.all().filter(x => x.id !== e.id)]),
  remove: (id: string) => save('agora.experiments', experiments.all().filter(x => x.id !== id)),
}

export const settings = {
  get: <T,>(k: string, fb: T) => load<T>('agora.s.' + k, fb),
  set: (k: string, v: unknown) => save('agora.s.' + k, v),
}
