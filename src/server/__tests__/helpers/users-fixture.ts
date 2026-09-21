// ─── Deterministic users fixtures ────────────────────────────────────────────
// Authz-asserting suites must seed EXPLICIT roles rather than rely on the
// first-login-is-admin bootstrap — the bootstrap is per-repo-state, and a
// suite that happens to touch two subs would otherwise gain/lose admin by
// execution order.

import { createMemoryUsersRepository } from '../../db/users-memory'
import type { UserRecord } from '../../db/users-repository'
import type { Role } from '../../../shared/roles'

export function usersFixture(opts?: {
  bootstrapAdminSubs?: string[]
  defaultRole?: 'viewer' | 'editor'
  /** Subs with the roles to seed (inserted in order). */
  users?: Record<string, Role>
}): ReturnType<typeof createMemoryUsersRepository> {
  const now = Date.parse('2026-01-01T00:00:00Z')
  const seed: UserRecord[] = Object.entries(opts?.users ?? {}).map(([sub, role], i) => ({
    sub,
    email: `${sub}@example.test`,
    name: sub,
    role,
    createdAt: now + i,
    lastLoginAt: now + i,
    updatedAt: now + i,
    updatedBy: null,
  }))
  return createMemoryUsersRepository({
    bootstrapAdminSubs: opts?.bootstrapAdminSubs ?? [],
    defaultRole: opts?.defaultRole ?? 'editor',
    seed,
  })
}
