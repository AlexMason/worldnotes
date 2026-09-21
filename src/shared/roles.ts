// ─── Role model (single source of truth) ─────────────────────────────────────
// The three-tier access ladder shared by config validation, the users
// repository, the route guards, and the editor client. The Postgres CHECK in
// migrations/005_users.sql mirrors ROLES — change both together.
// Environment-agnostic by design (src/shared rules).

export const ROLES = ['viewer', 'editor', 'admin'] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Roles allowed to hold the session's edit surface (write + editor shell). */
export function isEditorialRole(role: Role | undefined): boolean {
  return role === 'editor' || role === 'admin'
}
