// ─── Postgres PagesRepository ────────────────────────────────────────────────

import type { SqlPool } from './pool'
import type {
  CreateResult,
  DeleteResult,
  MoveResult,
  PageListItem,
  PageRecord,
  PagesRepository,
  PutResult,
} from './repository'
import { computeRowUpdates, moveSuccess, planMove } from './page-move'

/** Serializes page moves (advisory xact lock key); saves only take row locks. */
const MOVE_LOCK_KEY = 'wnmv'

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

const RESOLVE_ALIAS_SQL = `SELECT p.slug FROM page_aliases a JOIN pages p ON p.id = a.page_id WHERE a.slug = $1`

export function createPgPagesRepository(pool: SqlPool): PagesRepository {
  /** On the pool, or on `client` when the caller already holds a connection. */
  async function resolveAlias(slug: string, client: Pick<SqlPool, 'query'> = pool) {
    const res = await client.query(RESOLVE_ALIAS_SQL, [slug])
    return (res.rows[0] as { slug: string } | undefined)?.slug ?? null
  }

  return {
    async get(slug) {
      const res = await pool.query(
        'SELECT slug, title, content, version, updated_at, updated_by FROM pages WHERE slug = $1',
        [slug],
      )
      return res.rows[0] ? toRecord(res.rows[0]) : null
    },

    async existing(slugs) {
      if (slugs.length === 0) return new Set<string>()
      const res = await pool.query(
        `SELECT slug FROM pages WHERE slug = ANY($1::text[])
         UNION SELECT slug FROM page_aliases WHERE slug = ANY($1::text[])`,
        [[...new Set(slugs)]],
      )
      return new Set<string>(res.rows.map((r: { slug: string }) => r.slug))
    },

    resolveAlias: (slug) => resolveAlias(slug),

    async move({ from, to, by = null, validate, rewrite }): Promise<MoveResult> {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // One move at a time — but never queue: a waiting move would pin a
        // pool connection for as long as the move ahead of it rewrites.
        const locked = await client.query(
          'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
          [MOVE_LOCK_KEY],
        )
        if (!(locked.rows[0] as { locked: boolean }).locked) {
          await client.query('ROLLBACK')
          return { ok: false, reason: 'busy' }
        }
        // Slug charset has no LIKE metacharacters (`%`, `_`), so the prefix
        // pattern is exact.
        const subtreeRes = await client.query(
          `SELECT id, slug FROM pages WHERE slug = $1 OR slug LIKE $1 || '/%'
            ORDER BY id FOR UPDATE`,
          [from],
        )
        const subtreeRows = subtreeRes.rows as { id: string; slug: string }[]
        if (!subtreeRows.some((r) => r.slug === from)) {
          // On THIS connection: a second pool checkout while holding one can
          // exhaust the pool under concurrent moves.
          const current = await resolveAlias(from, client)
          await client.query('ROLLBACK')
          return current === null
            ? { ok: false, reason: 'missing' }
            : { ok: false, reason: 'moved', to: current }
        }
        const subtree = subtreeRows.map((r) => r.slug).sort()
        const plan = planMove(from, to, subtree, validate)
        if (!plan.ok) {
          await client.query('ROLLBACK')
          return plan
        }
        const movedIds = subtreeRows.map((r) => r.id)
        const targets = [...plan.moved.values()]
        const taken = await client.query(
          `SELECT slug FROM pages WHERE slug = ANY($1::text[]) AND NOT (id = ANY($2::bigint[]))
            LIMIT 1`,
          [targets, movedIds],
        )
        if (taken.rows[0]) {
          await client.query('ROLLBACK')
          return { ok: false, reason: 'taken', slug: (taken.rows[0] as { slug: string }).slug }
        }

        // Every row that could link to a moved page (and the moved rows,
        // whose link base changes) is locked until COMMIT: a concurrent save
        // waits, then fails its If-Match — never a partial move.
        const candidates = await client.query(
          `SELECT id, slug, title, content FROM pages
            WHERE content LIKE '%[%' OR id = ANY($1::bigint[])
            ORDER BY id FOR UPDATE`,
          [movedIds],
        )
        const rows = candidates.rows as {
          id: string
          slug: string
          title: string
          content: string
        }[]
        const updates = computeRowUpdates(rows, plan.moved, rewrite)
        for (const u of updates) {
          await client.query(
            `UPDATE pages
                SET slug = $2, title = $3, content = $4,
                    version = version + $5, updated_at = now(), updated_by = $6
              WHERE slug = $1`,
            [u.oldSlug, u.newSlug, u.title, u.content, u.contentChanged ? 1 : 0, by],
          )
        }
        await client.query('DELETE FROM page_aliases WHERE slug = ANY($1::text[])', [targets])
        await client.query(
          `INSERT INTO page_aliases (slug, page_id)
           SELECT old_slug, p.id
             FROM unnest($1::text[], $2::text[]) AS m(old_slug, new_slug)
             JOIN pages p ON p.slug = m.new_slug
           ON CONFLICT (slug) DO UPDATE SET page_id = EXCLUDED.page_id`,
          [[...plan.moved.keys()], targets],
        )
        await client.query('COMMIT')
        return moveSuccess(plan.moved, updates)
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined)
        // A page created at a target slug after the "taken" check: report it
        // like any taken target rather than a raw unique violation.
        if ((e as { code?: string }).code === '23505')
          return { ok: false, reason: 'taken', slug: to }
        throw e
      } finally {
        client.release()
      }
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
