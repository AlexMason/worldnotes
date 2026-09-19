// ─── Postgres pool ───────────────────────────────────────────────────────────

import pg from 'pg'

export type SqlPool = pg.Pool

export function createPool(connectionString: string): SqlPool {
  return new pg.Pool({ connectionString, max: 10 })
}
