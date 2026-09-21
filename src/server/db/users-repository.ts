// ─── Users Repository ────────────────────────────────────────────────────────
// Storage-agnostic contract for identities and roles. Postgres implements it
// in production; the in-memory variant powers tests and dev.
//
// Authorization model: the users row is the source of truth for a session's
// role, resolved per request (src/server/auth/roles.ts) so promotions and
// demotions take effect immediately. Rows are created automatically:
//   role = 'admin'  if sub ∈ bootstrapAdminSubs OR the table is empty
//                    (first login = admin bootstrap)
//   role = defaultRole  otherwise ('viewer' | 'editor')
// Provisioning is an insert-if-absent — reads never write for existing rows,
// so `last_login_at` keeps its meaning (updated only by recordLogin, the
// actual OIDC login event).
//
// setRoleGuarded is the ONLY setter: the last-admin lockout check runs in
// the same critical section as the update (advisory transaction lock in
// Postgres), so concurrent demotions cannot jointly empty the admin set.

import type { Role } from '../../shared/roles'

export interface UserRecord {
  sub: string
  email: string | null
  name: string | null
  role: Role
  /** epoch ms */
  createdAt: number
  /** epoch ms — last real login (or row creation) */
  lastLoginAt: number
  /** epoch ms — last ROLE change */
  updatedAt: number
  /** sub of the admin who last changed the role, null if never changed */
  updatedBy: string | null
}

export interface LoginClaims {
  email?: string | null
  name?: string | null
}

export type ProvisionReason = 'bootstrap-list' | 'empty-table' | 'default'

export interface ProvisionOutcome {
  record: UserRecord
  /** True only when this call created the row. */
  created: boolean
  /** True only when this call created the row WITH role='admin'. */
  grantedAdmin: boolean
  /** Bootstrap decision, meaningful when `grantedAdmin`. */
  reason: ProvisionReason | null
}

export type SetRoleResult =
  | { ok: true; record: UserRecord; changed: boolean }
  | { ok: false; reason: 'missing' | 'last-admin' }

export interface UsersRepositoryOptions {
  /** OIDC subs that always provision as admin (deterministic upgrades). */
  bootstrapAdminSubs?: readonly string[]
  /** Role for every other newly-provisioned account. */
  defaultRole: Role
}

export interface UsersRepository {
  get(sub: string): Promise<UserRecord | null>
  /** Insert-if-absent; never updates an existing row (resolver hot path). */
  ensure(sub: string, claims?: LoginClaims): Promise<ProvisionOutcome>
  /** Real login: upsert email/name/last_login_at; never touches role. */
  recordLogin(sub: string, claims?: LoginClaims): Promise<ProvisionOutcome>
  list(opts?: { limit?: number }): Promise<UserRecord[]>
  /**
   * Atomic role change with the lockout guard. Refuses to demote the last
   * admin; same-role writes succeed as a no-op (`changed: false`).
   */
  setRoleGuarded(sub: string, role: Role, by: string | null): Promise<SetRoleResult>
  destroy(): Promise<void>
}

/** Shared bootstrap-role computation (pg + memory must agree exactly). */
export function computeProvisionedRole(
  opts: UsersRepositoryOptions,
  sub: string,
  tableEmpty: boolean,
): { role: Role; reason: ProvisionReason } {
  if (opts.bootstrapAdminSubs?.includes(sub)) return { role: 'admin', reason: 'bootstrap-list' }
  if (tableEmpty) return { role: 'admin', reason: 'empty-table' }
  return { role: opts.defaultRole, reason: 'default' }
}
