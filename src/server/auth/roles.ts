// ─── Role resolver ───────────────────────────────────────────────────────────
// The ONLY writer of req.user. Runs immediately after the session parser:
// cookie claims land in req.sessionClaims, this hook resolves (and, on a
// miss, provisions) the users row and publishes req.user with a role. The
// hot path is a single indexed SELECT — ensure() inserts only when the row
// is absent, so authenticated GETs never write, and `last_login_at` keeps
// meaning "last login" (updated by /oidc/callback, not here).
//
// Repository errors propagate deliberately: if the users DB is unreachable,
// page reads fail anyway — a silently-downgraded role would be worse.
// Not registered when authDisabled (DEV_USER is already published admin by
// the session hook, and there may be no users store behind it).

import type { FastifyInstance } from 'fastify'
import type { UsersRepository } from '../db/users-repository'

export interface RoleResolverDeps {
  users: UsersRepository
}

export async function registerRoleResolver(
  app: FastifyInstance,
  deps: RoleResolverDeps,
): Promise<void> {
  app.addHook('onRequest', async (req) => {
    const claims = req.sessionClaims
    if (!claims) return
    const outcome = await deps.users.ensure(claims.sub, {
      email: claims.email,
      name: claims.name,
    })
    req.user = { ...claims, role: outcome.record.role }
    if (outcome.grantedAdmin) {
      req.log.warn(
        `provisioned admin sub=${claims.sub} (reason: ${outcome.reason}) — ` +
          'verify this grant was intended; demote or reassign via /admin',
      )
    }
  })
}
