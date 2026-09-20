// ─── Memory Page Store ───────────────────────────────────────────────────────
//
// Default in-memory PageStore — used by tests and as the editor fallback when
// no backend is configured. The production app supplies an HTTP-backed store.

import type { PageStore } from './types'

export interface MemoryPageStore extends PageStore {
  /** Snapshot of everything saved so far. */
  dump(): Record<string, string>
  /** Preload pages without going through save(). */
  seed(pages: Record<string, string>): void
}

export function createMemoryPageStore(initial: Record<string, string> = {}): MemoryPageStore {
  const map = new Map<string, string>(Object.entries(initial))

  return {
    async load(page) {
      return map.has(page) ? (map.get(page) as string) : null
    },
    async save(page, content) {
      map.set(page, content)
    },
    dump() {
      return Object.fromEntries(map)
    },
    seed(pages) {
      for (const [k, v] of Object.entries(pages)) map.set(k, v)
    },
  }
}
