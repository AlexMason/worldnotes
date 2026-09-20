// ─── In-memory MediaRepository ───────────────────────────────────────────────
// Mirrors the Postgres semantics (immutable rows, bigserial ids) so tests
// exercise the real contract without a database.

import type { MediaInsert, MediaRepository, MediaRow } from './media-repository'

export function createMemoryMediaRepository(): MediaRepository & {
  dump(): MediaRow[]
} {
  const rows = new Map<number, MediaRow>()
  let nextId = 1

  return {
    async insert(media: MediaInsert) {
      const id = nextId++
      rows.set(id, {
        id,
        mediaType: media.mediaType,
        width: media.width,
        height: media.height,
        sizeBytes: media.data.byteLength,
        data: Buffer.from(media.data),
        createdAt: Date.now(),
      })
      return { id }
    },

    async get(id) {
      const row = rows.get(id)
      return row ? { ...row, data: Buffer.from(row.data) } : null
    },

    async delete(id) {
      return rows.delete(id)
    },

    async destroy() {
      rows.clear()
    },

    dump() {
      return [...rows.values()]
    },
  }
}
