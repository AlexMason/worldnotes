// ─── Migration runner ────────────────────────────────────────────────────────
// Applies numbered .sql files from a directory inside a transaction, guarded
// by a session-level advisory lock so concurrent app boots never race.

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { SqlPool } from './pool'

const LOCK_KEY = 7266796  // 'wnos' — stable application-level migration lock

export async function runMigrations(pool: SqlPool, dir: string): Promise<string[]> {
  const client = await pool.connect()
  const applied: string[] = []
  try {
    const locked = await client.query(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [LOCK_KEY],
    )
    if (!locked.rows[0]?.locked) {
      throw new Error('migrations: another instance holds the advisory lock')
    }

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name        TEXT PRIMARY KEY,
          applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      const done = new Set<string>(
        (await client.query('SELECT name FROM schema_migrations')).rows.map(
          (r: { name: string }) => r.name,
        ),
      )

      const files = (await readdir(dir)).filter((f) => /^\d+.*\.sql$/.test(f)).sort()
      for (const file of files) {
        if (done.has(file)) continue
        const sql = await readFile(join(dir, file), 'utf8')
        await client.query('BEGIN')
        try {
          await client.query(sql)
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
          await client.query('COMMIT')
          applied.push(file)
        } catch (e) {
          await client.query('ROLLBACK')
          throw new Error(`migration ${file} failed: ${(e as Error).message}`, { cause: e })
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY])
    }
  } finally {
    client.release()
  }
  return applied
}
