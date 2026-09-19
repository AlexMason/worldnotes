// ─── Postgres SettingsRepository ─────────────────────────────────────────────

import type { SqlPool } from './pool'
import type { SettingsRepository } from './settings-repository'

export function createPgSettingsRepository(pool: SqlPool): SettingsRepository {
  return {
    async getAll() {
      const res = await pool.query('SELECT key, value FROM settings')
      const out: Record<string, string> = {}
      for (const row of res.rows as { key: string; value: string }[]) {
        out[row.key] = row.value
      }
      return out
    },

    async set(key, value, by = null) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value,
                updated_at = now(),
                updated_by = EXCLUDED.updated_by`,
        [key, value, by],
      )
    },

    async destroy() {
      // The pool is owned by the bootstrap; nothing per-instance to release.
      await Promise.resolve()
    },
  }
}
