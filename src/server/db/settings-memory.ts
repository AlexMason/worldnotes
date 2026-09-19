// ─── In-memory SettingsRepository ────────────────────────────────────────────
// Mirrors the Postgres semantics (upsert by key) so tests exercise the real
// contract without a database.

import type { SettingsRepository } from './settings-repository'

export function createMemorySettingsRepository(
  seed: Record<string, string> = {},
): SettingsRepository & { dump(): Record<string, string> } {
  const store = new Map<string, string>(Object.entries(seed))

  return {
    async getAll() {
      return Object.fromEntries(store)
    },

    async set(key, value) {
      store.set(key, value)
    },

    async destroy() {
      store.clear()
    },

    dump() {
      return Object.fromEntries(store)
    },
  }
}
