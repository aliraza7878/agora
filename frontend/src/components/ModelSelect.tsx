import { useEffect } from 'react'
import { pickDefault, useModels } from '../lib/hooks'
import type { ModelInfo } from '../lib/types'

interface Props {
  value: string; onChange: (id: string, m?: ModelInfo) => void; chatOnly?: boolean; label?: string
}
export default function ModelSelect({ value, onChange, chatOnly = true, label = 'Model' }: Props) {
  const { models, loading, error, reload } = useModels()
  const list = chatOnly ? models.filter(m => m.is_chat) : models

  useEffect(() => {
    if (!models.length) return
    const cur = models.find(m => m.id === value)
    if (!cur || cur.deprecated) { const d = pickDefault(models); if (d) onChange(d, models.find(m => m.id === d)) }
  }, [models]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center justify-between text-mute">
        {label}
        <button type="button" onClick={reload} className="text-xs text-mute hover:text-gold">refresh list</button>
      </span>
      <select className="field" value={value} disabled={loading || !list.length}
        onChange={e => onChange(e.target.value, models.find(m => m.id === e.target.value))}>
        {loading && <option>Loading models…</option>}
        {!loading && !list.length && <option value="">{error ? 'Could not load models' : 'Add an API key to load models'}</option>}
        {list.map(m => (
          <option key={m.id} value={m.id} disabled={m.deprecated}>
            {m.id}{m.context_window ? ` · ${Math.round(m.context_window / 1000)}k ctx` : ''}{m.deprecated ? ' (inactive)' : ''}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </label>
  )
}
