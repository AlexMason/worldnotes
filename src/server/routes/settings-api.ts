// ─── Settings API ────────────────────────────────────────────────────────────
// PUT /api/settings persists instance-wide settings (search toggle, home page,
// site branding incl. raw admin-trusted header/footer HTML). The admin form
// and editor shell read settings server-side; there is no GET endpoint because
// no client fetches settings over HTTP.

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireSameOrigin } from '../auth/session'
import type { SettingsPatch, SettingsService } from '../settings'

export interface SettingsApiDeps {
  settings: SettingsService
}

export async function registerSettingsApiRoutes(
  app: FastifyInstance,
  deps: SettingsApiDeps,
): Promise<void> {
  app.put('/api/settings', { preHandler: [requireSameOrigin, requireAuth] }, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>

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
    for (const field of ['siteName', 'headerHtml', 'footerHtml'] as const) {
      if (body[field] !== undefined && typeof body[field] !== 'string') {
        return reply.code(400).send({ error: `${field} must be a string` })
      }
    }

    const patch: SettingsPatch = {}
    if (body.searchEnabled !== undefined) patch.searchEnabled = body.searchEnabled as boolean
    if (body.homeSlug !== undefined) patch.homeSlug = body.homeSlug as string | null
    if (body.allPagesEnabled !== undefined) patch.allPagesEnabled = body.allPagesEnabled as boolean
    if (body.siteName !== undefined) patch.siteName = body.siteName as string
    if (body.headerHtml !== undefined) patch.headerHtml = body.headerHtml as string
    if (body.footerHtml !== undefined) patch.footerHtml = body.footerHtml as string

    try {
      return await deps.settings.update(patch, req.user?.sub ?? null)
    } catch (e) {
      const message = (e as Error).message
      // Service-level validation failures carry operator-facing messages;
      // anything else (e.g. a Postgres driver error) must not leak internals.
      if (/must be|invalid|exceeds|contains control|home page is required/.test(message)) {
        return reply.code(400).send({ error: message })
      }
      req.log.error({ err: e }, 'settings update failed')
      return reply.code(500).send({ error: 'failed to save settings' })
    }
  })
}
