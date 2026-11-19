import { useCallback, useEffect, useState } from 'react'
import { getJSON } from './api'
import { getKey } from './keystore'
import type { ModelInfo, Philosopher } from './types'

export function useKey() {
  const [key, setK] = useState(getKey())
  useEffect(() => {
    const h = () => setK(getKey())
    window.addEventListener('agora-key', h)
    return () => window.removeEventListener('agora-key', h)
  }, [])
  return key
}

let philCache: Philosopher[] | null = null
export function usePhilosophers() {
  const [list, setList] = useState<Philosopher[]>(philCache ?? [])
  const [error, setError] = useState('')
  useEffect(() => {
    if (philCache) return
    getJSON<{ philosophers: Philosopher[] }>('/api/philosophers')
      .then(r => { philCache = r.philosophers; setList(r.philosophers) })
      .catch(e => setError(e.message))
  }, [])
  return { list, error, byId: (id: string) => list.find(p => p.id === id) }
}

export function useModels() {
  const key = useKey()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (refresh = false) => {
    if (!getKey()) { setModels([]); return }
    setLoading(true); setError('')
    try { setModels((await getJSON<{ models: ModelInfo[] }>(`/api/models${refresh ? '?refresh=true' : ''}`)).models) }
    catch (e: any) { setError(e.message); setModels([]) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [key, load])
  return { models, loading, error, reload: () => load(true) }
}

/** Preference only: pick a sensible default from the models the provider actually returned. */
export function pickDefault(models: ModelInfo[]): string {
  const usable = models.filter(m => m.is_chat && m.active)
  const prefer = ['llama-3.3-70b', 'llama-3.1-70b', 'gpt-oss-120b', 'llama-3.1-8b']
  for (const p of prefer) { const m = usable.find(x => x.id.includes(p)); if (m) return m.id }
  return usable[0]?.id ?? ''
}
