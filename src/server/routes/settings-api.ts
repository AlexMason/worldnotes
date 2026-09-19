// ─── Settings API ────────────────────────────────────────────────────────────
// PUT /api/settings persists instance-wide settings (search toggle, home page).
// The admin form and editor shell read settings server-side; there is no GET
// endpoint because no client fetches settings over HTTP.

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireSameOrigin } from '../auth/session'
import type { SettingsService } from '../settings'

export interface SettingsApiDeps {
  settings: SettingsService
}

export async function registerSettingsApiRoutes(
  app: FastifyInstance,
  deps: SettingsApiDeps,
): Promise<void> {
  app.put('/api/settings', { preHandler: [requireSameOrigin, requireAuth] }, async (req, reply) => {
    const body = (req.body ?? {}) as {
      searchEnabled?: unknown
      homeSlug?: unknown
      allPagesEnabled?: unknown
    }

    if (body.searchEnabled !== undefined && typeof body.searchEnabled !== 'boolean') {
      return reply.code(400).send({ error: 'searchEnabled must be a boolean' })
    }
    if (body.allPagesEnabled !== undefined && typeof body.allPagesEnabled !== 'boolean') {
      return reply.code(400).send({ error: 'allPagesEnabled must be a boolean' })
    }
    if (
      body.homeSlug !== undefined &&
      body.homeSlug !== null &&
      typeof body.homeSlug !== 'string'
    ) {
      return reply.code(400).send({ error: 'homeSlug must be a string or null' })
    }

    try {
      const patch: {
        searchEnabled?: boolean
        homeSlug?: string | null
        allPagesEnabled?: boolean
      } = {}
      if (body.searchEnabled !== undefined) patch.searchEnabled = body.searchEnabled as boolean
      if (body.homeSlug !== undefined) patch.homeSlug = body.homeSlug as string | null
      if (body.allPagesEnabled !== undefined)
        patch.allPagesEnabled = body.allPagesEnabled as boolean
      const updated = await deps.settings.update(patch, req.user?.sub ?? null)
      return updated
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }
  })
}
