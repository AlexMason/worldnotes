// ─── Integration-test migration helper ───────────────────────────────────────
// Vitest runs test files in parallel threads; runMigrations() intentionally
// fails fast when another instance holds the advisory lock (correct for
// production boot, wrong for concurrent integration suites). Retry a few
// times so whichever file loses the race just waits for the winner.

import { runMigrations } from '../../db/migrate'
import type { SqlPool } from '../../db/pool'

export async function migrateWithRetry(
  pool: SqlPool,
  dir: string,
  attempts = 20,
  delayMs = 100,
): Promise<string[]> {
  for (let i = 0; ; i++) {
    try {
      return await runMigrations(pool, dir)
    } catch (e) {
      if (!/advisory lock/.test((e as Error).message) || i >= attempts - 1) throw e
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}
