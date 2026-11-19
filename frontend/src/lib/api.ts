import { getKey } from './keystore'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export class ApiError extends Error {
  status: number; retryAfter?: number
  constructor(msg: string, status: number, retryAfter?: number) { super(msg); this.status = status; this.retryAfter = retryAfter }
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const k = getKey()
  if (k) h['X-Provider-Key'] = k
  return h
}

async function fail(r: Response): Promise<never> {
  let detail = `Request failed (${r.status})`
  let retry: number | undefined
  try { const j = await r.json(); detail = j.detail || detail; retry = j.retry_after ?? undefined } catch { /* not json */ }
  if (r.status === 429) detail = `Rate limit reached.${retry ? ` Try again in ${Math.ceil(retry)}s.` : ''} ${detail}`
  throw new ApiError(detail, r.status, retry)
}

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path, { headers: headers() })
  if (!r.ok) await fail(r)
  return r.json()
}
export async function postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal })
  if (!r.ok) await fail(r)
  return r.json()
}

export type SSEEvent = { type: string; [k: string]: any }

/** POST + read a text/event-stream (EventSource can't send headers or a body). */
export async function streamSSE(path: string, body: unknown, onEvent: (e: SSEEvent) => void, signal?: AbortSignal) {
  const r = await fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal })
  if (!r.ok) await fail(r)
  if (!r.body) throw new ApiError('Streaming is not supported by this browser.', 0)
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2)
      const line = chunk.split('\n').find(l => l.startsWith('data:'))
      if (!line) continue
      let ev: SSEEvent
      try { ev = JSON.parse(line.slice(5).trim()) } catch { continue } // ignore malformed frame
      onEvent(ev) // may throw to abort the stream; errors propagate to the caller
    }
  }
}
