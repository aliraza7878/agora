// Bring-your-own-key storage. The key never leaves the browser except as the
// X-Provider-Key header on requests to the AGORA backend.
const K = 'agora.providerKey'
const MODE = 'agora.providerKey.persist'

export type KeyMode = 'session' | 'device'

export function getKey(): string {
  try { return sessionStorage.getItem(K) || localStorage.getItem(K) || '' } catch { return '' }
}
export function keyMode(): KeyMode {
  try { return localStorage.getItem(MODE) === '1' ? 'device' : 'session' } catch { return 'session' }
}
export function setKey(key: string, mode: KeyMode) {
  clearKey()
  try {
    if (mode === 'device') { localStorage.setItem(K, key); localStorage.setItem(MODE, '1') }
    else sessionStorage.setItem(K, key)
  } catch { /* storage blocked */ }
  window.dispatchEvent(new Event('agora-key'))
}
export function clearKey() {
  try { sessionStorage.removeItem(K); localStorage.removeItem(K); localStorage.removeItem(MODE) } catch { /* noop */ }
  window.dispatchEvent(new Event('agora-key'))
}
export function maskKey(k: string) { return k ? `${k.slice(0, 4)}…${k.slice(-4)}` : '' }
