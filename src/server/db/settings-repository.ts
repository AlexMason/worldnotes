// ─── Settings Repository ─────────────────────────────────────────────────────
// Storage-agnostic contract for instance-wide settings. Postgres implements it
// in production; the in-memory variant powers tests and dev.

export interface SettingsRepository {
  /** All settings as a flat key → string-value map. */
  getAll(): Promise<Record<string, string>>
  /** Upsert a single setting value. */
  set(key: string, value: string, by?: string | null): Promise<void>
  destroy(): Promise<void>
}
