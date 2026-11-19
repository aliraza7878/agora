import { Info } from 'lucide-react'
import type { Cap, ModelInfo, Params } from '../lib/types'

const TIPS: Record<string, string> = {
  temperature: 'Randomness. Lower values give more focused, repeatable answers; higher values give more varied ones.',
  top_p: 'Nucleus sampling. Only the most likely tokens whose probabilities add up to this value are considered. Usually change this or temperature, not both.',
  max_completion_tokens: 'Upper limit on tokens in the reply. Longer limits allow longer answers and cost more.',
  frequency_penalty: 'Positive values discourage repeating the same words, in proportion to how often they already appeared.',
  presence_penalty: 'Positive values encourage new topics by penalising any token that has already appeared at all.',
  seed: 'Asks for repeatable sampling. Same seed and settings usually (not always) give the same output.',
  stop: 'Up to four sequences, one per line. Generation halts when one is produced.',
  json_mode: 'Forces the reply to be a valid JSON object. Your prompt should also ask for JSON.',
}

function Tip({ k }: { k: string }) { return <span title={TIPS[k]} className="cursor-help text-mute" aria-label={TIPS[k]}><Info size={13} /></span> }

function Num({ k, label, cap, value, onChange, step = 0.01, int = false }: {
  k: string; label: string; cap: Cap; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; int?: boolean
}) {
  const on = value !== undefined
  const lo = cap.min ?? 0, hi = cap.max ?? 1
  const set = (raw: number) => { if (Number.isNaN(raw)) return; const c = Math.min(hi, Math.max(lo, raw)); onChange(int ? Math.round(c) : c) }
  return (
    <div className={cap.supported ? '' : 'opacity-40'}>
      <div className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={on} disabled={!cap.supported} aria-label={`Use ${label}`} onChange={e => onChange(e.target.checked ? (cap.default ?? lo) : undefined)} />
        <span>{label}</span><Tip k={k} />
        {!cap.supported && <span className="text-xs text-mute">not supported</span>}
      </div>
      {on && cap.supported && (
        <div className="mt-1.5 flex items-center gap-3">
          <input type="range" className="flex-1 accent-[#C8A55B]" min={lo} max={hi} step={step} value={value} onChange={e => set(parseFloat(e.target.value))} />
          <input type="number" className="field !w-24 !py-1" min={lo} max={hi} step={step} value={value} onChange={e => set(parseFloat(e.target.value))} />
        </div>
      )}
    </div>
  )
}

export default function ParamsPanel({ model, params, setParams }: { model?: ModelInfo; params: Params; setParams: (p: Params) => void }) {
  if (!model) return <p className="text-sm text-mute">Choose a model to see its settings.</p>
  const c = model.capabilities
  const up = (patch: Partial<Params>) => setParams({ ...params, ...patch })
  return (
    <div className="space-y-4">
      <Num k="temperature" label="Temperature" cap={c.temperature} value={params.temperature} onChange={v => up({ temperature: v })} />
      <Num k="max_completion_tokens" label="Max completion tokens" cap={c.max_completion_tokens} value={params.max_completion_tokens} onChange={v => up({ max_completion_tokens: v })} step={16} int />
      <Num k="top_p" label="Top P" cap={c.top_p} value={params.top_p} onChange={v => up({ top_p: v })} />
      <Num k="frequency_penalty" label="Frequency penalty" cap={c.frequency_penalty} value={params.frequency_penalty} onChange={v => up({ frequency_penalty: v })} />
      <Num k="presence_penalty" label="Presence penalty" cap={c.presence_penalty} value={params.presence_penalty} onChange={v => up({ presence_penalty: v })} />
      <div className={c.seed.supported ? '' : 'opacity-40'}>
        <label className="flex items-center gap-2 text-sm">Seed <Tip k="seed" /></label>
        <input type="number" className="field mt-1 !py-1" disabled={!c.seed.supported} placeholder="random" value={params.seed ?? ''}
          onChange={e => up({ seed: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) })} />
      </div>
      <div className={c.stop.supported ? '' : 'opacity-40'}>
        <label className="flex items-center gap-2 text-sm">Stop sequences <Tip k="stop" /></label>
        <textarea className="field mt-1 h-16 !py-1 font-mono text-xs" disabled={!c.stop.supported} placeholder="one per line, max 4"
          value={(params.stop ?? []).join('\n')} onChange={e => { const s = e.target.value.split('\n').slice(0, c.stop.max_items ?? 4); up({ stop: s.some(x => x) ? s : undefined }) }} />
      </div>
      <label className={`flex items-center gap-2 text-sm ${c.json_mode.supported ? '' : 'opacity-40'}`}>
        <input type="checkbox" disabled={!c.json_mode.supported} checked={params.json_mode && c.json_mode.supported} onChange={e => up({ json_mode: e.target.checked })} />
        JSON mode <Tip k="json_mode" />{!c.json_mode.supported && <span className="text-xs text-mute">not supported</span>}
      </label>
    </div>
  )
}
