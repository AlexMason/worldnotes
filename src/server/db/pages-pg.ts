// ─── Postgres PagesRepository ────────────────────────────────────────────────

import type { SqlPool } from './pool'
import type {
  CreateResult,
  DeleteResult,
  PageListItem,
  PageRecord,
  PagesRepository,
  PutResult,
} from './repository'

interface Row {
  slug: string
  title: string
  content: string
  version: string | number
  updated_at: Date
  updated_by: string | null
}

function toRecord(row: Row): PageRecord {
  return {
    slug: row.slug,
    title: row.title,
    content: row.content,
    version: Number(row.version),
    updatedAt: row.updated_at.getTime(),
    updatedBy: row.updated_by,
  }
}

export function createPgPagesRepository(pool: SqlPool): PagesRepository {
  return {
    async get(slug) {
      const res = await pool.query(
        'SELECT slug, title, content, version, updated_at, updated_by FROM pages WHERE slug = $1',
        [slug],
      )
      return res.rows[0] ? toRecord(res.rows[0]) : null
    },

    async list(opts = {}) {
      const limit = opts.limit ?? 500
      if (opts.query) {
        const pattern = `%${opts.query.replace(/[%_\\]/g, '\\$&')}%`
        const res = await pool.query(
          `SELECT slug, title, EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
             FROM pages
            WHERE slug ILIKE $1 OR title ILIKE $1 OR content ILIKE $1
            ORDER BY updated_at DESC
            LIMIT $2`,
          [pattern, limit],
        )
        return res.rows.map(
          (r: { slug: string; title: string; updated_at_ms: string | number }) => ({
            slug: r.slug,
            title: r.title,
            updatedAt: Number(r.updated_at_ms),
          }),
        ) as PageListItem[]
      }
      const res = await pool.query(
        `SELECT slug, title, EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
           FROM pages ORDER BY updated_at DESC LIMIT $1`,
        [limit],
      )
      return res.rows.map((r: { slug: string; title: string; updated_at_ms: string | number }) => ({
        slug: r.slug,
        title: r.title,
        updatedAt: Number(r.updated_at_ms),
      })) as PageListItem[]
    },

    async put(slug, { title, content, by = null }) {
      const res = await pool.query(
        `INSERT INTO pages (slug, title, content, version, updated_by)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (slug) DO UPDATE
            SET title = EXCLUDED.title,
                content = EXCLUDED.content,
                version = pages.version + 1,
                updated_at = now(),
                updated_by = EXCLUDED.updated_by
         RETURNING slug, title, content, version, updated_at, updated_by`,
        [slug, title, content, by],
      )
      return toRecord(res.rows[0])
    },

    async putIfMatch(slug, { title, content, by = null }, ifMatch): Promise<PutResult> {
      const updated = await pool.query(
        `UPDATE pages
            SET title = $2, content = $3, version = version + 1,
                updated_at = now(), updated_by = $4
          WHERE slug = $1 AND version = $5
          RETURNING slug, title, content, version, updated_at, updated_by`,
        [slug, title, content, by, ifMatch],
      )
      if (updated.rows[0]) return { ok: true, record: toRecord(updated.rows[0]) }

      const current = await pool.query(
        'SELECT version, EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms FROM pages WHERE slug = $1',
        [slug],
      )
      if (!current.rows[0]) return { ok: false, reason: 'missing' }
      return {
        ok: false,
        reason: 'conflict',
        current: {
          version: Number(current.rows[0].version),
          updatedAt: Number(current.rows[0].updated_at_ms),
        },
      }
    },

    async create(slug, { title, content, by = null }): Promise<CreateResult> {
      try {
        const res = await pool.query(
          `INSERT INTO pages (slug, title, content, version, updated_by)
           VALUES ($1, $2, $3, 1, $4)
           RETURNING slug, title, content, version, updated_at, updated_by`,
          [slug, title, content, by],
        )
        return { ok: true, record: toRecord(res.rows[0]) }
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          const current = await pool.query('SELECT version FROM pages WHERE slug = $1', [slug])
          return {
            ok: false,
            reason: 'exists',
            current: { version: Number(current.rows[0]?.version ?? 0) },
          }
        }
        throw e
      }
    },

    async deleteIfMatch(slug, ifMatch): Promise<DeleteResult> {
      const removed = await pool.query(
        'DELETE FROM pages WHERE slug = $1 AND version = $2 RETURNING slug',
        [slug, ifMatch],
      )
      if ((removed.rowCount ?? 0) > 0) return { ok: true }

      const current = await pool.query(
        'SELECT version, EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms FROM pages WHERE slug = $1',
        [slug],
      )
      if (!current.rows[0]) return { ok: false, reason: 'missing' }
      return {
        ok: false,
        reason: 'conflict',
        current: {
          version: Number(current.rows[0].version),
          updatedAt: Number(current.rows[0].updated_at_ms),
        },
      }
    },

    async delete(slug) {
      const res = await pool.query('DELETE FROM pages WHERE slug = $1', [slug])
      return (res.rowCount ?? 0) > 0
    },

    async destroy() {
      // The pool is owned by the bootstrap; nothing per-instance to release.
      await Promise.resolve()
    },
  }
}
