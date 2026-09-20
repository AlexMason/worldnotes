// ─── Postgres MediaRepository ────────────────────────────────────────────────

import type { SqlPool } from './pool'
import type { MediaInsert, MediaRepository, MediaRow, StoredMediaType } from './media-repository'

interface Row {
  id: string | number
  media_type: StoredMediaType
  width: number | null
  height: number | null
  size_bytes: string | number
  data: Buffer
  created_at: Date
}

function toRecord(row: Row): MediaRow {
  return {
    id: Number(row.id),
    mediaType: row.media_type,
    width: row.width,
    height: row.height,
    sizeBytes: Number(row.size_bytes),
    data: row.data,
    createdAt: row.created_at.getTime(),
  }
}

export function createPgMediaRepository(pool: SqlPool): MediaRepository {
  return {
    async insert(media: MediaInsert) {
      const res = await pool.query(
        `INSERT INTO media (media_type, width, height, size_bytes, data, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          media.mediaType,
          media.width,
          media.height,
          media.data.byteLength,
          media.data,
          media.by ?? null,
        ],
      )
      return { id: Number(res.rows[0].id) }
    },

    async get(id) {
      const res = await pool.query(
        'SELECT id, media_type, width, height, size_bytes, data, created_at FROM media WHERE id = $1',
        [id],
      )
      return res.rows[0] ? toRecord(res.rows[0]) : null
    },

    async delete(id) {
      const res = await pool.query('DELETE FROM media WHERE id = $1', [id])
      return (res.rowCount ?? 0) > 0
    },

    async destroy() {
      // The pool is owned by the bootstrap; nothing per-instance to release.
      await Promise.resolve()
    },
  }
}
