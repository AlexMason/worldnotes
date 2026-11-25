// ─── One-time title backfill (data migration) ────────────────────────────────
// Stored titles written before #17 followed the old rule (first h1–h3, else
// the previous title). Recompute every row once with the current rule and
// record it in schema_migrations under a name the SQL runner never matches
// (it only applies `^\d+.*\.sql$` files), so it never runs twice. Titles only:
// version, updated_at and updated_by stay as they are.

import type { SqlPool } from './pool'
import { LOCK_KEY } from './migrate'
import { pageTitle } from '../../core/page-title'

export const TITLE_BACKFILL_NAME = 'titles-from-first-h1'

/** @returns the number of retitled pages (0 when it already ran). */
export async function backfillTitles(
  pool: SqlPool,
  compute: (content: string, slug: string) => string = pageTitle,
): Promise<number> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    try {
      // Waits for a concurrent boot's backfill (or migration run) to finish,
      // then re-checks the marker under the lock.
      await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY])
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [
        TITLE_BACKFILL_NAME,
      ])
      if (done.rows.length > 0) {
        await client.query('COMMIT')
        return 0
      }
      const rows = (await client.query('SELECT slug, title, content FROM pages FOR UPDATE'))
        .rows as { slug: string; title: string; content: string }[]
      let changed = 0
      for (const row of rows) {
        const title = compute(row.content, row.slug)
        if (title === row.title) continue
        await client.query('UPDATE pages SET title = $2 WHERE slug = $1', [row.slug, title])
        changed++
      }
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [TITLE_BACKFILL_NAME])
      await client.query('COMMIT')
      return changed
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw new Error(`data migration ${TITLE_BACKFILL_NAME} failed: ${(e as Error).message}`, {
        cause: e,
      })
    }
  } finally {
    client.release()
  }
}
