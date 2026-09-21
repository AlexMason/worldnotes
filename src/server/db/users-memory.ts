// ─── In-memory UsersRepository ───────────────────────────────────────────────
// Mirrors the Postgres semantics exactly (same computeProvisionedRole rule;
// critical sections are synchronous, which is this thread's advisory lock)
// so tests exercise the real contract without a database.

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

export function createMemoryUsersRepository(
  opts: UsersRepositoryOptions & { seed?: Iterable<UserRecord> },
): UsersRepository & { dump(): UserRecord[] } {
  // sub → row, in insertion order (a stable sort keeps it for ties).
  const store = new Map<string, UserRecord>()
  for (const row of opts.seed ?? []) store.set(row.sub, { ...row })

  function provisionCore(
    sub: string,
    claims: LoginClaims | undefined,
    touch: boolean,
  ): ProvisionOutcome {
    const existing = store.get(sub)
    if (existing) {
      let record = existing
      if (touch) {
        record = {
          ...existing,
          email: claims?.email ?? existing.email,
          name: claims?.name ?? existing.name,
          lastLoginAt: Date.now(),
        }
        store.set(sub, record)
      }
      return { record, created: false, grantedAdmin: false, reason: null }
    }
    const { role, reason } = computeProvisionedRole(opts, sub, store.size === 0)
    const now = Date.now()
    const record: UserRecord = {
      sub,
      email: claims?.email ?? null,
      name: claims?.name ?? null,
      role,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
      updatedBy: null,
    }
    store.set(sub, record)
    return { record, created: true, grantedAdmin: role === 'admin', reason }
  }

  return {
    async get(sub) {
      return store.get(sub) ?? null
    },

    async ensure(sub, claims) {
      return provisionCore(sub, claims, false)
    },

    async recordLogin(sub, claims) {
      return provisionCore(sub, claims, true)
    },

    async list(listOpts = {}) {
      const limit = listOpts.limit ?? 500
      return [...store.values()]
        .sort((a, b) => b.lastLoginAt - a.lastLoginAt)
        .slice(0, limit)
        .map((r) => ({ ...r }))
    },

    async setRoleGuarded(sub, role: Role, by): Promise<SetRoleResult> {
      const current = store.get(sub)
      if (!current) return { ok: false, reason: 'missing' }
      if (current.role === role) return { ok: true, record: { ...current }, changed: false }
      if (current.role === 'admin' && role !== 'admin') {
        let admins = 0
        for (const row of store.values()) if (row.role === 'admin') admins++
        if (admins <= 1) return { ok: false, reason: 'last-admin' }
      }
      const record: UserRecord = { ...current, role, updatedAt: Date.now(), updatedBy: by }
      store.set(sub, record)
      return { ok: true, record: { ...record }, changed: true }
    },

    async destroy() {
      store.clear()
    },

    dump() {
      return [...store.values()].map((r) => ({ ...r }))
    },
  }
}
