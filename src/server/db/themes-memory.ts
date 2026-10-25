// ─── In-memory ThemesRepository ──────────────────────────────────────────────
// Mirrors the Postgres semantics (bigserial ids, unique names, oldest-first
// listing) so tests exercise the real contract without a database.

import {
  ThemeNameTakenError,
  type ThemeInsert,
  type ThemeRow,
  type ThemeUpdate,
  type ThemesRepository,
} from './themes-repository'

export function createMemoryThemesRepository(): ThemesRepository {
  const rows = new Map<number, ThemeRow>()
  let nextId = 1

  function nameTaken(name: string, exceptId?: number): boolean {
    for (const row of rows.values()) {
      if (row.name === name && row.id !== exceptId) return true
    }
    return false
  }

  return {
    async list() {
      return [...rows.values()].map((r) => ({ ...r }))
    },

    async get(id) {
      const row = rows.get(id)
      return row ? { ...row } : null
    },

    async create(theme: ThemeInsert) {
      if (nameTaken(theme.name)) throw new ThemeNameTakenError(theme.name)
      const now = Date.now()
      const row: ThemeRow = {
        id: nextId++,
        name: theme.name,
        description: theme.description,
        css: theme.css,
        createdAt: now,
        updatedAt: now,
        updatedBy: theme.by ?? null,
      }
      rows.set(row.id, row)
      return { ...row }
    },

    async update(id, patch: ThemeUpdate) {
      const row = rows.get(id)
      if (!row) return null
      if (patch.name !== undefined && nameTaken(patch.name, id)) {
        throw new ThemeNameTakenError(patch.name)
      }
      const next: ThemeRow = {
        ...row,
        name: patch.name ?? row.name,
        description: patch.description ?? row.description,
        css: patch.css ?? row.css,
        updatedAt: Date.now(),
        updatedBy: patch.by ?? null,
      }
      rows.set(id, next)
      return { ...next }
    },

    async delete(id) {
      return rows.delete(id)
    },

    async destroy() {
      rows.clear()
    },
  }
}
