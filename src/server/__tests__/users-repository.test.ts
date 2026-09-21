import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMemoryUsersRepository } from '../db/users-memory'

function repo(opts: { bootstrapAdminSubs?: string[]; defaultRole?: 'viewer' | 'editor' } = {}) {
  return createMemoryUsersRepository({
    bootstrapAdminSubs: opts.bootstrapAdminSubs ?? [],
    defaultRole: opts.defaultRole ?? 'editor',
  })
}

describe('memory UsersRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse('2026-01-01T00:00:00Z') })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ensure (provisioning bootstrap)', () => {
    it('first-ever user becomes admin via empty-table bootstrap', async () => {
      const r = repo()
      const out = await r.ensure('alice', { email: 'alice@x', name: 'Alice' })
      expect(out).toMatchObject({
        created: true,
        grantedAdmin: true,
        reason: 'empty-table',
      })
      expect(out.record.role).toBe('admin')
      expect(out.record).toMatchObject({ sub: 'alice', email: 'alice@x', name: 'Alice' })
    })

    it('subsequent users get the default role', async () => {
      const r = repo()
      await r.ensure('alice')
      const bob = await r.ensure('bob', { email: 'bob@x' })
      expect(bob).toMatchObject({ created: true, grantedAdmin: false, reason: 'default' })
      expect(bob.record.role).toBe('editor')
    })

    it('honours defaultRole=viewer for non-bootstrap accounts', async () => {
      const r = repo({ defaultRole: 'viewer' })
      await r.ensure('alice')
      const carol = await r.ensure('carol')
      expect(carol.record.role).toBe('viewer')
    })

    it('a bootstrap-list sub is admin even after the table is populated', async () => {
      const r = repo({ bootstrapAdminSubs: ['dave'] })
      await r.ensure('alice') // empty-table admin
      const dave = await r.ensure('dave', { email: 'dave@x' })
      expect(dave).toMatchObject({ created: true, grantedAdmin: true, reason: 'bootstrap-list' })
      expect(dave.record.role).toBe('admin')
    })

    it('bootstrap-list wins over the empty-table check for the first user', async () => {
      const r = repo({ bootstrapAdminSubs: ['erin'] })
      const out = await r.ensure('erin')
      expect(out.reason).toBe('bootstrap-list')
      expect(out.record.role).toBe('admin')
    })

    it('is insert-if-absent: a second ensure never mutates the row', async () => {
      const r = repo()
      const first = await r.ensure('alice', { email: 'a1@x', name: 'A1' })
      const t = Date.parse('2026-06-01T00:00:00Z')
      vi.setSystemTime(t)
      const second = await r.ensure('alice', { email: 'a2@x', name: 'A2' })
      expect(second.created).toBe(false)
      expect(second.grantedAdmin).toBe(false)
      // ensure never refreshes email/name/last_login_at — that's recordLogin
      expect(second.record.email).toBe('a1@x')
      expect(second.record.lastLoginAt).toBe(first.record.lastLoginAt)
    })
  })

  describe('recordLogin', () => {
    it('provisions a missing sub with the bootstrap rules', async () => {
      const r = repo()
      const out = await r.recordLogin('alice', { email: 'a@x' })
      expect(out).toMatchObject({ created: true, grantedAdmin: true, reason: 'empty-table' })
    })

    it('refreshes email/name/last_login_at without touching role', async () => {
      const r = repo()
      await r.ensure('alice')
      await r.ensure('bob')
      await r.setRoleGuarded('bob', 'admin', 'alice') // two admins, so…
      await r.setRoleGuarded('alice', 'editor', 'bob') // …this demotion sticks
      const before = (await r.get('alice'))!
      const t = before.lastLoginAt + 5000
      vi.setSystemTime(t)
      const out = await r.recordLogin('alice', { email: 'new@x', name: 'Renamed' })
      expect(out.created).toBe(false)
      expect(out.record.role).toBe('editor') // demotion survives re-login
      expect(out.record.email).toBe('new@x')
      expect(out.record.name).toBe('Renamed')
      expect(out.record.lastLoginAt).toBe(t)
    })

    it('COALESCE-preserves stored fields when new claims are absent', async () => {
      const r = repo()
      await r.recordLogin('alice', { email: 'a@x', name: 'Alice' })
      const out = await r.recordLogin('alice', { email: null })
      expect(out.record.email).toBe('a@x')
      expect(out.record.name).toBe('Alice')
    })
  })

  describe('setRoleGuarded (the only setter)', () => {
    it('rejects an unknown sub', async () => {
      const r = repo()
      await expect(r.setRoleGuarded('ghost', 'editor', null)).resolves.toEqual({
        ok: false,
        reason: 'missing',
      })
    })

    it('treats a same-role write as a no-op success', async () => {
      const r = repo()
      await r.ensure('alice') // admin
      const res = await r.setRoleGuarded('alice', 'admin', null)
      expect(res).toMatchObject({ ok: true, changed: false })
    })

    it('changes role and records the audit columns', async () => {
      const r = repo()
      await r.ensure('alice')
      await r.ensure('bob')
      await r.setRoleGuarded('bob', 'admin', 'alice')
      const bob = (await r.get('bob'))!
      expect(bob.role).toBe('admin')
      expect(bob.updatedBy).toBe('alice')
    })

    it('refuses to demote the last admin', async () => {
      const r = repo()
      await r.ensure('alice') // sole admin
      const res = await r.setRoleGuarded('alice', 'viewer', 'alice')
      expect(res).toEqual({ ok: false, reason: 'last-admin' })
      expect((await r.get('alice'))!.role).toBe('admin')
    })

    it('allows demotion once a second admin exists', async () => {
      const r = repo()
      await r.ensure('alice')
      await r.ensure('bob')
      await r.setRoleGuarded('bob', 'admin', 'alice')
      const res = await r.setRoleGuarded('alice', 'viewer', 'alice')
      expect(res).toMatchObject({ ok: true, changed: true })
      expect((await r.get('alice'))!.role).toBe('viewer')
    })

    it('two concurrent last-two-admin demotions yield exactly one success', async () => {
      // The in-memory critical section is synchronous (single-threaded), so
      // this exercises the ordering; the pg suite proves the same against a
      // real READ COMMITTED race.
      const r = repo()
      await r.ensure('alice')
      await r.ensure('bob')
      await r.setRoleGuarded('bob', 'admin', 'alice') // now two admins
      const [a, b] = await Promise.all([
        r.setRoleGuarded('alice', 'viewer', 'alice'),
        r.setRoleGuarded('bob', 'viewer', 'bob'),
      ])
      const ok = [a, b].filter((x) => x.ok && x.changed).length
      const blocked = [a, b].filter((x) => !x.ok && x.reason === 'last-admin').length
      expect(ok).toBe(1)
      expect(blocked).toBe(1)
    })
  })

  describe('list', () => {
    it('returns newest-last-login first, capped by limit', async () => {
      const r = repo()
      await r.ensure('alice')
      vi.setSystemTime(Date.now() + 1000)
      await r.ensure('bob')
      vi.setSystemTime(Date.now() + 1000)
      await r.ensure('carol')

      const all = await r.list()
      expect(all.map((u) => u.sub)).toEqual(['carol', 'bob', 'alice'])
      const capped = await r.list({ limit: 2 })
      expect(capped.map((u) => u.sub)).toEqual(['carol', 'bob'])
    })

    it('hands out defensive copies', async () => {
      const r = repo()
      await r.ensure('alice')
      const list = await r.list()
      list[0]!.role = 'viewer'
      expect((await r.get('alice'))!.role).toBe('admin')
    })
  })
})
