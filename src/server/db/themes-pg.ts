// ─── Postgres ThemesRepository ───────────────────────────────────────────────

import type { SqlPool } from './pool'
import {
  ThemeNameTakenError,
  type ThemeInsert,
  type ThemeRow,
  type ThemeUpdate,
  type ThemesRepository,
} from './themes-repository'

interface Row {
  id: string | number
  name: string
  description: string
  css: string
  created_at: Date
  updated_at: Date
  updated_by: string | null
}

const COLUMNS = 'id, name, description, css, created_at, updated_at, updated_by'
const UNIQUE_VIOLATION = '23505'

function toRecord(row: Row): ThemeRow {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    css: row.css,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
    updatedBy: row.updated_by,
  }
}
function rethrowUnique(e: unknown, name: string | undefined): never {
  if (e instanceof Error && 'code' in e && e.code === UNIQUE_VIOLATION) {
    throw new ThemeNameTakenError(name ?? '')
  }
  throw e
}

export function createPgThemesRepository(pool: SqlPool): ThemesRepository {
  return {
    async list() {
      const res = await pool.query(`SELECT ${COLUMNS} FROM themes ORDER BY id`)
      return res.rows.map(toRecord)
    },

    async get(id) {
      const res = await pool.query(`SELECT ${COLUMNS} FROM themes WHERE id = $1`, [id])
      return res.rows[0] ? toRecord(res.rows[0]) : null
    },

    async create(theme: ThemeInsert) {
      try {
        const res = await pool.query(
          `INSERT INTO themes (name, description, css, updated_by)
           VALUES ($1, $2, $3, $4)
           RETURNING ${COLUMNS}`,
          [theme.name, theme.description, theme.css, theme.by ?? null],
        )
        return toRecord(res.rows[0])
      } catch (e) {
        return rethrowUnique(e, theme.name)
      }
    },

    async update(id, patch: ThemeUpdate) {
      try {
        const res = await pool.query(
          `UPDATE themes
              SET name        = COALESCE($2, name),
                  description = COALESCE($3, description),
                  css         = COALESCE($4, css),
                  updated_at  = now(),
                  updated_by  = $5
            WHERE id = $1
            RETURNING ${COLUMNS}`,
          [id, patch.name ?? null, patch.description ?? null, patch.css ?? null, patch.by ?? null],
        )
        return res.rows[0] ? toRecord(res.rows[0]) : null
      } catch (e) {
        return rethrowUnique(e, patch.name)
      }
    },

    async delete(id) {
      const res = await pool.query('DELETE FROM themes WHERE id = $1', [id])
      return (res.rowCount ?? 0) > 0
    },

    async destroy() {
      // The pool is owned by the bootstrap; nothing per-instance to release.
      await Promise.resolve()
    },
  }
}
