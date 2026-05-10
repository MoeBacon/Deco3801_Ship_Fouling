type Envelope<T> = {
  version: number
  saved_at: string
  data: T
}

const EVENT_NAME = 'app-localstore-updated'

export function writeVersionedLocal<T>(key: string, version: number, data: T): void {
  const payload: Envelope<T> = {
    version,
    saved_at: new Date().toISOString(),
    data,
  }
  window.localStorage.setItem(key, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }))
}

export function readVersionedLocal<T>(
  key: string,
  expectedVersion: number,
  ttlMs?: number,
): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== expectedVersion) return null
    if (!parsed.saved_at || typeof parsed.saved_at !== 'string') return null
    if (ttlMs) {
      const ageMs = Date.now() - new Date(parsed.saved_at).getTime()
      if (!Number.isFinite(ageMs) || ageMs > ttlMs) return null
    }
    if (!('data' in parsed)) return null
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function removeVersionedLocal(key: string): void {
  window.localStorage.removeItem(key)
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }))
}

export function subscribeLocalStoreUpdates(onKey: (key: string) => void): () => void {
  const onEvent = (event: Event) => {
    const custom = event as CustomEvent<{ key?: string }>
    if (custom.detail?.key) onKey(custom.detail.key)
  }
  window.addEventListener(EVENT_NAME, onEvent)
  return () => window.removeEventListener(EVENT_NAME, onEvent)
}
