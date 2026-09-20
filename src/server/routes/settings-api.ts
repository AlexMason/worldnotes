// ─── Settings API ────────────────────────────────────────────────────────────
// PUT /api/settings persists instance-wide settings (search toggle, home page,
// site branding incl. raw admin-trusted header/footer HTML). The admin form
// and editor shell read settings server-side; there is no GET endpoint because
// no client fetches settings over HTTP.

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireSameOrigin } from '../auth/session'
import type { MediaRepository } from '../db/media-repository'
import type { SettingsPatch, SettingsService } from '../settings'

export interface SettingsApiDeps {
  settings: SettingsService
  /** Favicon references are validated against the media store, and a
   *  replaced/cleared override's row is deleted here (the only place that
   *  owns both stores). */
  media: MediaRepository
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
    if (body.navSlug !== undefined && body.navSlug !== null && typeof body.navSlug !== 'string') {
      return reply.code(400).send({ error: 'navSlug must be a string or null' })
    }
    for (const field of ['siteName', 'headerHtml', 'footerHtml'] as const) {
      if (body[field] !== undefined && typeof body[field] !== 'string') {
        return reply.code(400).send({ error: `${field} must be a string` })
      }
    }
    if (body.faviconMediaId !== undefined && body.faviconMediaId !== null) {
      if (
        typeof body.faviconMediaId !== 'number' ||
        !Number.isInteger(body.faviconMediaId) ||
        body.faviconMediaId < 1
      ) {
        return reply.code(400).send({ error: 'faviconMediaId must be a positive integer or null' })
      }
      if (!(await deps.media.get(body.faviconMediaId))) {
        return reply.code(400).send({ error: `unknown media id ${body.faviconMediaId}` })
      }
    }

    const patch: SettingsPatch = {}
    if (body.searchEnabled !== undefined) patch.searchEnabled = body.searchEnabled as boolean
    if (body.homeSlug !== undefined) patch.homeSlug = body.homeSlug as string | null
    if (body.navSlug !== undefined) patch.navSlug = body.navSlug as string | null
    if (body.allPagesEnabled !== undefined) patch.allPagesEnabled = body.allPagesEnabled as boolean
    if (body.siteName !== undefined) patch.siteName = body.siteName as string
    if (body.headerHtml !== undefined) patch.headerHtml = body.headerHtml as string
    if (body.footerHtml !== undefined) patch.footerHtml = body.footerHtml as string
    if (body.faviconMediaId !== undefined) {
      patch.faviconMediaId = body.faviconMediaId as number | null
    }

    const previousFavicon = deps.settings.get().faviconMediaId
    let next
    try {
      next = await deps.settings.update(patch, req.user?.sub ?? null)
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

    // Orphan cleanup: a replaced or cleared override's row can no longer be
    // referenced (nothing else consumes media yet). Re-read guard so an
    // interleaved writer that re-pointed settings at the old row never has
    // it deleted under it. Best-effort: a failed delete must not fail the
    // (already persisted) settings write.
    if (previousFavicon !== null && next.faviconMediaId !== previousFavicon) {
      try {
        await deps.media.delete(previousFavicon)
      } catch (e) {
        req.log.warn({ err: e, mediaId: previousFavicon }, 'could not delete replaced favicon')
      }
    }
    return next
  })
}
