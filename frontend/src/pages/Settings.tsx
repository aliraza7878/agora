import { useState } from 'react'
import { CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react'
import { getJSON } from '../lib/api'
import { clearKey, getKey, keyMode, maskKey, setKey, type KeyMode } from '../lib/keystore'
import { useKey } from '../lib/hooks'
import ErrorNote from '../components/Errors'

export default function Settings() {
  const current = useKey()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<KeyMode>(keyMode())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function save() {
    const k = input.trim()
    if (k.length < 16) { setError('That does not look like an API key.'); return }
    setBusy(true); setError(''); setOk('')
    setKey(k, mode)
    try {
      const r = await getJSON<{ models: unknown[] }>('/api/models?refresh=true')
      setOk(`Key accepted. ${r.models.length} models available to this key.`)
      setInput('')
    } catch (e: any) {
      setError(e.message); clearKey()
    } finally { setBusy(false) }
  }

  return (
    <section className="mx-auto max-w-2xl py-14">
      <h1 className="h-display text-5xl">Your API key</h1>
      <p className="mt-4 text-mute">AGORA runs on your own Groq account. Create a key in the Groq console, paste it here, and every debate and Playground request is billed to you.</p>

      <div className="mt-8 border border-line bg-vault p-6">
        {current && (
          <div className="mb-5 flex items-center justify-between border-b border-line pb-4 text-sm">
            <span className="flex items-center gap-2 text-parchment"><CheckCircle2 size={16} className="text-gold" /> Connected: <code className="text-gold">{maskKey(getKey())}</code></span>
            <button className="btn-ghost flex items-center gap-1 text-xs" onClick={() => { clearKey(); setOk('Key removed from this browser.') }}><Trash2 size={13} /> Remove</button>
          </div>
        )}
        <label className="block text-sm text-mute">Groq API key
          <input type="password" autoComplete="off" spellCheck={false} className="field mt-1 font-mono" placeholder="gsk_…"
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
        </label>
        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="mb-1 text-mute">Where to keep it</legend>
          {([['session', 'This tab only (forgotten when you close the tab)'], ['device', 'This device (stays until you remove it)']] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} /> {l}</label>
          ))}
        </fieldset>
        <button className="btn btn-gold mt-6" onClick={save} disabled={busy || !input}>{busy ? 'Checking key…' : 'Save and verify'}</button>
        <div className="mt-4 space-y-3">{ok && <p className="text-sm text-gold">{ok}</p>}<ErrorNote message={error} /></div>
      </div>

      <div className="mt-8 flex gap-3 text-sm text-mute">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-violet" />
        <p>Your key is kept in this browser and sent to the AGORA server only as a request header so it can call Groq for you. The server never stores or logs it. Anyone with access to this device and browser profile could read a key saved on the device, so avoid that option on shared computers.</p>
      </div>
    </section>
  )
}
