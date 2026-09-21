// ─── Users role API (admin only) ─────────────────────────────────────────────
// PUT /api/users/role — the sole role-change surface. `sub` travels in the
// body, not the path: OIDC subs legitimately contain `/` and `:`. The
// last-admin lockout guard is applied by the repository (setRoleGuarded),
// not here, so no future caller can bypass it. Strict Origin (no
// Origin-less pass) because this endpoint grants script-execution-as-admin.

import type { FastifyInstance } from 'fastify'
import { requireRole, requireStrictOrigin } from '../auth/session'
import type { UsersRepository } from '../db/users-repository'
import { isRole, ROLES, type Role } from '../../shared/roles'

export interface UsersApiDeps {
  users: UsersRepository
}

export async function registerUsersApiRoutes(
  app: FastifyInstance,
  deps: UsersApiDeps,
): Promise<void> {
  app.put(
    '/api/users/role',
    // Role first: anonymous callers get the conventional 401 before the
    // CSRF detail; both guards precede the handler either way.
    { preHandler: [requireRole('admin'), requireStrictOrigin] },
    async (req, reply) => {
      const body = (req.body ?? {}) as { sub?: unknown; role?: unknown }
      if (typeof body.sub !== 'string' || body.sub.trim() === '') {
        return reply.code(400).send({ error: 'sub is required' })
      }
      if (!isRole(body.role)) {
        return reply.code(400).send({ error: `role must be one of ${ROLES.join(', ')}` })
      }
      const by = req.user?.sub ?? null
      const result = await deps.users.setRoleGuarded(body.sub, body.role as Role, by)
      if (!result.ok) {
        if (result.reason === 'missing') {
          return reply.code(404).send({ error: 'unknown user' })
        }
        return reply.code(409).send({ error: 'cannot demote the last remaining admin' })
      }
      // Audit line: who granted whom, visible in server logs alongside the
      // updated_by/updated_at row columns.
      req.log.warn(
        { by, sub: body.sub, to: body.role, changed: result.changed },
        'user role change',
      )
      return reply.header('cache-control', 'no-store').send({
        user: result.record,
        changed: result.changed,
      })
    },
  )
}
