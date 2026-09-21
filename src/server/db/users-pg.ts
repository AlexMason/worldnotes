// ─── Postgres UsersRepository ────────────────────────────────────────────────
// Provisioning and the last-admin guard each run in one transaction holding
// a session-level advisory xact lock (adjacent key to migrate.ts's 'wnos'),
// serializing the check-then-write across processes. The xact lock releases
// at COMMIT/ROLLBACK; consequences of losing it: one duplicated admin (fix-
// able in the UI) versus a zero-admin lockout (SQL-only recovery) — the
// cheap lock prevents both.

import type { SqlPool } from './pool'
import type { Role } from '../../shared/roles'
import {
  computeProvisionedRole,
  type LoginClaims,
  type ProvisionOutcome,
  type SetRoleResult,
  type UserRecord,
  type UsersRepository,
  type UsersRepositoryOptions,
} from './users-repository'

const USERS_LOCK_KEY = 7266797 // 'wnus'

const COLS =
  'sub, email, name, role, created_at, last_login_at, updated_at, updated_by'

interface Row {
  sub: string
  email: string | null
  name: string | null
  role: Role
  created_at: Date
  last_login_at: Date
  updated_at: Date
  updated_by: string | null
}

function toRecord(row: Row): UserRecord {
  return {
    sub: row.sub,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at.getTime(),
    lastLoginAt: row.last_login_at.getTime(),
    updatedAt: row.updated_at.getTime(),
    updatedBy: row.updated_by,
  }
}

export function createPgUsersRepository(
  pool: SqlPool,
  opts: UsersRepositoryOptions,
): UsersRepository {
  /** Shared body of ensure()/recordLogin(); `touch` refreshes login fields. */
  async function provisionCore(
    sub: string,
    claims: LoginClaims | undefined,
    touch: boolean,
  ): Promise<ProvisionOutcome> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock($1)', [USERS_LOCK_KEY])
      const existing = await client.query(`SELECT ${COLS} FROM users WHERE sub = $1`, [sub])
      const current = existing.rows[0]
      if (current) {
        let record = toRecord(current)
        if (touch) {
          await client.query(
            `UPDATE users
                SET email = COALESCE($2, email),
                    name = COALESCE($3, name),
                    last_login_at = now()
              WHERE sub = $1`,
            [sub, claims?.email ?? null, claims?.name ?? null],
          )
          const after = await client.query(`SELECT ${COLS} FROM users WHERE sub = $1`, [sub])
          record = toRecord(after.rows[0]!)
        }
        await client.query('COMMIT')
        return { record, created: false, grantedAdmin: false, reason: null }
      }
      const any = await client.query('SELECT 1 FROM users LIMIT 1')
      const { role, reason } = computeProvisionedRole(opts, sub, any.rows.length === 0)
      const inserted = await client.query(
        `INSERT INTO users (sub, email, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLS}`,
        [sub, claims?.email ?? null, claims?.name ?? null, role],
      )
      await client.query('COMMIT')
      const record = toRecord(inserted.rows[0]!)
      return { record, created: true, grantedAdmin: role === 'admin', reason }
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  return {
    async get(sub) {
      const res = await pool.query(`SELECT ${COLS} FROM users WHERE sub = $1`, [sub])
      return res.rows[0] ? toRecord(res.rows[0]) : null
    },

    async ensure(sub, claims) {
      return provisionCore(sub, claims, false)
    },

    async recordLogin(sub, claims) {
      return provisionCore(sub, claims, true)
    },

    async list(listOpts = {}) {
      const limit = listOpts.limit ?? 500
      const res = await pool.query(
        `SELECT ${COLS} FROM users ORDER BY last_login_at DESC, sub LIMIT $1`,
        [limit],
      )
      return (res.rows as Row[]).map(toRecord)
    },

    async setRoleGuarded(sub, role, by): Promise<SetRoleResult> {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('SELECT pg_advisory_xact_lock($1)', [USERS_LOCK_KEY])
        const existing = await client.query(`SELECT ${COLS} FROM users WHERE sub = $1`, [sub])
        const current = existing.rows[0]
        if (!current) {
          await client.query('ROLLBACK')
          return { ok: false, reason: 'missing' }
        }
        if (current.role === role) {
          await client.query('COMMIT')
          return { ok: true, record: toRecord(current), changed: false }
        }
        if (current.role === 'admin' && role !== 'admin') {
          const admins = await client.query(
            `SELECT count(*)::int AS n FROM users WHERE role = 'admin'`,
          )
          if ((admins.rows[0]?.n ?? 0) <= 1) {
            await client.query('ROLLBACK')
            return { ok: false, reason: 'last-admin' }
          }
        }
        const updated = await client.query(
          `UPDATE users SET role = $2, updated_at = now(), updated_by = $3
            WHERE sub = $1
            RETURNING ${COLS}`,
          [sub, role, by],
        )
        await client.query('COMMIT')
        return { ok: true, record: toRecord(updated.rows[0]!), changed: true }
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    },

    async destroy() {
      // The pool is owned by the bootstrap; nothing per-instance to release.
      await Promise.resolve()
    },
  }
}
