import { useEffect, useState } from 'react'
import { Copy, RotateCcw, Save, Trash2 } from 'lucide-react'
import { getJSON } from '../lib/api'
import { prompts, uid } from '../lib/store'
import type { PromptItem } from '../lib/types'

export function useStarters() {
  const [s, setS] = useState<PromptItem[]>([])
  useEffect(() => { getJSON<{ prompts: PromptItem[] }>('/api/playground/starter-prompts').then(r => setS(r.prompts.map(p => ({ ...p, starter: true })))).catch(() => {}) }, [])
  return s
}

export default function PromptLibrary() {
  const starters = useStarters()
  const [mine, setMine] = useState(prompts.all())
  const [sel, setSel] = useState<PromptItem | null>(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const open = (p: PromptItem) => { setSel(p); setName(p.name); setText(p.text) }
  const refresh = () => setMine(prompts.all())

  function save() {
    if (!name.trim() || !text.trim()) return
    // Editing a starter saves a personal copy; starters themselves stay pristine.
    const item: PromptItem = { id: sel && !sel.starter ? sel.id : uid(), name: name.trim(), text }
    prompts.put(item); refresh(); open(item)
  }
  function duplicate() { if (!sel) return; const c = { id: uid(), name: `${name} (copy)`, text }; prompts.put(c); refresh(); open(c) }
  function reset() { const orig = sel?.starter ? sel : starters.find(s => s.name === sel?.name.replace(/ \(copy\)$/, '')); if (orig) { setText(orig.text); setName(orig.name) } }
  function remove() { if (sel && !sel.starter && confirm('Delete this prompt?')) { prompts.remove(sel.id); refresh(); setSel(null); setName(''); setText('') } }

  const Item = ({ p }: { p: PromptItem }) => (
    <li><button onClick={() => open(p)} className={`w-full px-3 py-2 text-left text-sm transition-colors ${sel?.id === p.id ? 'bg-slab text-gold' : 'text-parchment/85 hover:bg-slab/60'}`}>{p.name}</button></li>
  )

  return (
    <section className="py-12">
      <h1 className="h-display text-5xl">Prompt library</h1>
      <p className="mt-3 text-mute">Starter prompts for philosophical work, plus your own. Your prompts stay in this browser. Load any of them from the Playground.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 className="h-display mb-1 text-lg text-gold">Starters</h2><ul>{starters.map(p => <Item key={p.id} p={p} />)}</ul>
          <h2 className="h-display mb-1 mt-6 text-lg text-gold">Yours</h2>
          <ul>{mine.map(p => <Item key={p.id} p={p} />)}</ul>
          {!mine.length && <p className="px-3 text-sm text-mute">Nothing saved yet.</p>}
          <button className="btn btn-line mt-4 w-full" onClick={() => { setSel(null); setName('New prompt'); setText('') }}>New prompt</button>
        </div>
        <div>
          {!sel && !name ? <p className="text-mute">Select a prompt to read or edit it.</p> : (<>
            <input className="field font-serif text-xl" value={name} onChange={e => setName(e.target.value)} aria-label="Prompt name" maxLength={80} />
            <textarea className="field mt-3 h-72 font-mono text-[13px] leading-relaxed" value={text} maxLength={12000} onChange={e => setText(e.target.value)} aria-label="Prompt text" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-gold" onClick={save}><Save size={14} />{sel?.starter ? 'Save as my copy' : 'Save'}</button>
              <button className="btn btn-line" onClick={duplicate} disabled={!sel}><Copy size={14} />Duplicate</button>
              <button className="btn btn-line" onClick={reset} disabled={!sel}><RotateCcw size={14} />Reset to default</button>
              {sel && !sel.starter && <button className="btn btn-ghost" onClick={remove}><Trash2 size={14} />Delete</button>}
            </div>
          </>)}
        </div>
      </div>
    </section>
  )
}
