// ─── /edit redirects ─────────────────────────────────────────────────────────
// The editor now lives at /{slug} (served by the SSR catch-all for
// authenticated users), so the legacy /edit paths simply redirect there.
// Anonymous visitors land on the reader at the same URL.

import type { FastifyInstance } from 'fastify'
import { validateSlug } from '../../shared/slug'
import { pageUrlPath } from '../../shared/url-helpers'

export async function registerEditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/edit', async (_req, reply) => reply.redirect('/', 302))

  app.get('/edit/*', async (req, reply) => {
    const raw = (req.params as { '*': string })['*']
    const validated = validateSlug(raw)
    return reply.redirect(validated.ok ? pageUrlPath(validated.slug) : '/', 302)
  })
}
