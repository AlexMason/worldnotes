// ─── Themes Repository ───────────────────────────────────────────────────────
// Storage-agnostic contract for admin-authored theme stylesheets. Postgres
// implements it in production; the in-memory variant powers tests and dev.
// Validation (name/css rules) lives in the service (src/server/themes.ts) —
// repositories persist already-normalized values. The one rule enforced here
// is name uniqueness, because only the store can decide it atomically.

export interface ThemeRow {
  id: number
  name: string
  description: string
  css: string
  createdAt: number
  updatedAt: number
  updatedBy: string | null
}

export interface ThemeInsert {
  name: string
  description: string
  css: string
  by?: string | null
}

export interface ThemeUpdate {
  name?: string
  description?: string
  css?: string
  by?: string | null
}

/** Thrown by create/update when another theme already uses the name. */
export class ThemeNameTakenError extends Error {
  constructor(name: string) {
    super(`a theme named “${name}” already exists`)
    this.name = 'ThemeNameTakenError'
  }
}

export interface ThemesRepository {
  /** All themes, oldest first (stable gallery order). */
  list(): Promise<ThemeRow[]>
  get(id: number): Promise<ThemeRow | null>
  create(theme: ThemeInsert): Promise<ThemeRow>
  /** Returns null when the id does not exist. */
  update(id: number, patch: ThemeUpdate): Promise<ThemeRow | null>
  /** Returns true when a row was removed. */
  delete(id: number): Promise<boolean>
  destroy(): Promise<void>
}
