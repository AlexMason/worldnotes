// ─── UsersRepository on Postgres ─────────────────────────────────────────────
// Skipped unless WN_TEST_PG_URL points at a reachable Postgres. Load-bearing
// for the coverage gate: db/users-pg.ts is not coverage-excluded, mirroring
// the media/pages integration suites.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPool } from '../db/pool'
import { createPgUsersRepository } from '../db/users-pg'
import { migrateWithRetry } from './helpers/migrate'

const url = process.env.WN_TEST_PG_URL
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../../../migrations')

describe.skipIf(!url)('UsersRepository on Postgres', () => {
  let pool: ReturnType<typeof createPool>

  function repo(opts: { bootstrapAdminSubs?: string[]; defaultRole: 'viewer' | 'editor' }) {
    return createPgUsersRepository(pool, {
      bootstrapAdminSubs: opts.bootstrapAdminSubs ?? [],
      defaultRole: opts.defaultRole,
    })
  }

  beforeAll(async () => {
    pool = createPool(url as string)
    await migrateWithRetry(pool, migrationsDir)
  })
  beforeEach(async () => {
    await pool.query('DELETE FROM users')
  })
  afterAll(async () => {
    await pool?.end()
  })

  it('ensure provisions the first-ever user as admin (empty-table bootstrap)', async () => {
    const r = repo({ defaultRole: 'editor' })
    const out = await r.ensure('alice', { email: 'a@x', name: 'Alice' })
    expect(out).toMatchObject({ created: true, grantedAdmin: true, reason: 'empty-table' })
    expect((await r.get('alice'))!.role).toBe('admin')
  })

  it('ensure is insert-if-absent: no mutation on repeat calls', async () => {
    const r = repo({ defaultRole: 'editor' })
    await r.ensure('alice', { email: 'a1@x' })
    const bob = await r.ensure('bob', { email: 'b@x' }) // table non-empty → editor
    expect(bob.record.role).toBe('editor')
    const again = await r.ensure('alice', { email: 'a2@x' })
    expect(again.created).toBe(false)
    expect(again.record.email).toBe('a1@x')
  })

  it('bootstrap-list subs are admin even with a populated table', async () => {
    const r1 = repo({ defaultRole: 'viewer' })
    await r1.ensure('alice')
    const r2 = repo({ bootstrapAdminSubs: ['chosen'], defaultRole: 'viewer' })
    const out = await r2.ensure('chosen')
    expect(out).toMatchObject({ created: true, grantedAdmin: true, reason: 'bootstrap-list' })
  })

  it('recordLogin refreshes claims and last_login_at but never the role', async () => {
    const r = repo({ defaultRole: 'editor' })
    await r.ensure('alice') // admin (empty table)
    await r.ensure('bob') // editor
    await r.setRoleGuarded('bob', 'admin', 'alice') // now demotion may pass
    await r.setRoleGuarded('alice', 'viewer', 'bob')
    const out = await r.recordLogin('alice', { email: 'new@x', name: 'Renamed' })
    expect(out.created).toBe(false)
    expect(out.record.role).toBe('viewer')
    expect(out.record.email).toBe('new@x')
    expect(out.record.lastLoginAt).toBeGreaterThan(out.record.createdAt - 1)
  })

  it('setRoleGuarded changes roles, audits, 404s unknown subs, and guards the last admin', async () => {
    const r = repo({ defaultRole: 'editor' })
    await r.ensure('boss') // sole admin
    expect(await r.setRoleGuarded('ghost', 'editor', 'boss')).toEqual({
      ok: false,
      reason: 'missing',
    })
    const blocked = await r.setRoleGuarded('boss', 'viewer', 'boss')
    expect(blocked).toEqual({ ok: false, reason: 'last-admin' })
    await r.ensure('second')
    await r.setRoleGuarded('second', 'admin', 'boss')
    const ok = await r.setRoleGuarded('boss', 'editor', 'second')
    expect(ok).toMatchObject({ ok: true, changed: true })
    const row = (await r.get('boss'))!
    expect(row.role).toBe('editor')
    expect(row.updatedBy).toBe('second')
  })

  it('list returns newest-last-login first with a limit', async () => {
    const r = repo({ defaultRole: 'editor' })
    await r.ensure('alice')
    await r.ensure('bob')
    await r.recordLogin('bob')
    const list = await r.list({ limit: 10 })
    expect(list.map((u) => u.sub)).toEqual(['bob', 'alice'])
  })

  it('serializes concurrent last-two-admin demotions to exactly one winner', async () => {
    const r = repo({ defaultRole: 'editor' })
    await r.ensure('alice')
    await r.ensure('bob')
    await r.setRoleGuarded('bob', 'admin', 'alice')
    const [a, b] = await Promise.all([
      r.setRoleGuarded('alice', 'viewer', 'alice'),
      r.setRoleGuarded('bob', 'viewer', 'bob'),
    ])
    const winners = [a, b].filter((x) => x.ok && x.changed).length
    expect(winners).toBe(1)
    const admins = await pool.query(`SELECT count(*)::int AS n FROM users WHERE role = 'admin'`)
    expect(admins.rows[0].n).toBe(1)
  })
})
