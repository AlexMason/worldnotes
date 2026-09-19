// ─── Bounded LRU render cache ────────────────────────────────────────────────
// In-process only (single-instance deployment assumption, documented in
// README). Both TTL and max-entry bounds keep memory flat under remote reads;
// writes invalidate by key.

export interface CacheEntry<T = unknown> {
  value: T
  etag: string
  storedAt: number // ms
}

export interface RenderCacheOptions {
  maxEntries: number
  ttlMs: number
}

export interface RenderCache {
  get<T = unknown>(key: string): CacheEntry<T> | undefined
  set<T>(key: string, entry: CacheEntry<T>): void
  invalidate(key: string): void
  clear(): void
  get size(): number
}

export const INDEX_CACHE_KEY = '__index__'

export function createRenderCache(opts: RenderCacheOptions): RenderCache {
  const store = new Map<string, CacheEntry>() // Map iteration order = insertion order = LRU

  return {
    get<T>(key: string): CacheEntry<T> | undefined {
      const hit = store.get(key) as CacheEntry<T> | undefined
      if (!hit) return undefined
      if (Date.now() - hit.storedAt > opts.ttlMs) {
        store.delete(key)
        return undefined
      }
      // refresh recency
      store.delete(key)
      store.set(key, hit)
      return hit
    },

    set<T>(key: string, entry: CacheEntry<T>) {
      if (store.has(key)) store.delete(key)
      store.set(key, entry)
      while (store.size > opts.maxEntries) {
        const oldest = store.keys().next().value as string | undefined
        if (oldest === undefined) break
        store.delete(oldest)
      }
    },

    invalidate(key) {
      store.delete(key)
    },

    clear() {
      store.clear()
    },

    get size() {
      return store.size
    },
  }
}
