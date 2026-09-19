// ─── Pages JSON API ──────────────────────────────────────────────────────────
// Reads are public (cached at the edge/browser); writes require an editor
// session, same-origin, and optimistic concurrency (If-Match).

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireSameOrigin } from '../auth/session'
import type { PagesRepository } from '../db/repository'
import { validateSlug, slugDisplayName } from '../../shared/slug'
import { extractTitle } from '../render/title'

const MAX_CONTENT_BYTES = 1_000_000 // 1 MB
const MAX_TITLE_LENGTH = 200

export interface PageApiDeps {
  pages: PagesRepository
  /** Bump when any write succeeds — SSR cache keys off this (step 8). */
  onWrite?: (slug: string) => void
}

interface PageBody {
  title?: unknown
  content?: unknown
  slug?: unknown
}

function etagOf(version: number): string {
  return `"${version}"`
}

function parseIfMatch(raw: string | undefined): number | null {
  if (!raw) return null
  const match = /^"??(\d+)"??$/.exec(raw.trim())
  return match ? Number(match[1]) : null
}

export async function registerPageApiRoutes(
  app: FastifyInstance,
  deps: PageApiDeps,
): Promise<void> {
  const writeGuard = [requireSameOrigin, requireAuth]

  // ── Reads ─────────────────────────────────────────────────────────────────

  app.get('/api/pages', async (req, reply) => {
    const query = (req.query ?? {}) as { q?: string; limit?: string }
    const limit = Math.min(Number(query.limit) || 100, 500)
    const items = await deps.pages.list({ query: query.q, limit })
    reply.header('cache-control', 'public, max-age=30, stale-while-revalidate=60')
    return { pages: items }
  })

  app.get('/api/pages/*', async (req, reply) => {
    const slug = (req.params as { '*': string })['*']
    const validated = validateSlug(slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })

    const page = await deps.pages.get(validated.slug)
    if (!page) return reply.code(404).send({ error: 'page not found' })

    reply
      .header('etag', etagOf(page.version))
      .header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    return {
      slug: page.slug,
      title: page.title,
      content: page.content,
      version: page.version,
      updatedAt: page.updatedAt,
      updatedBy: page.updatedBy,
    }
  })

  // ── Writes (authenticated editors) ────────────────────────────────────────

  app.post('/api/pages', { preHandler: writeGuard }, async (req, reply) => {
    const body = (req.body ?? {}) as PageBody
    if (typeof body.slug !== 'string') {
      return reply.code(400).send({ error: 'slug is required' })
    }
    const validated = validateSlug(body.slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })

    const content = typeof body.content === 'string' ? body.content : ''
    if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
      return reply.code(413).send({ error: 'content exceeds size limit' })
    }
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : ''
    if (rawTitle.length > MAX_TITLE_LENGTH) {
      return reply.code(400).send({ error: 'title too long' })
    }
    const title = rawTitle || extractTitle(content, slugDisplayName(validated.slug))

    const result = await deps.pages.create(validated.slug, {
      title,
      content,
      by: req.user?.sub ?? null,
    })
    if (!result.ok) {
      return reply.code(409).send({ error: 'page exists', current: result.current })
    }
    deps.onWrite?.(validated.slug)
    return reply
      .code(201)
      .header('etag', etagOf(result.record.version))
      .send({ ...result.record })
  })

  app.put('/api/pages/*', { preHandler: writeGuard }, async (req, reply) => {
    const slug = (req.params as { '*': string })['*']
    const validated = validateSlug(slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })

    const body = (req.body ?? {}) as PageBody
    if (typeof body.content !== 'string') {
      return reply.code(400).send({ error: 'content is required' })
    }
    if (Buffer.byteLength(body.content, 'utf8') > MAX_CONTENT_BYTES) {
      return reply.code(413).send({ error: 'content exceeds size limit' })
    }
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : ''
    if (rawTitle.length > MAX_TITLE_LENGTH) {
      return reply.code(400).send({ error: 'title too long' })
    }

    const ifMatch = parseIfMatch(req.headers['if-match'] as string | undefined)
    if (ifMatch === null) {
      return reply.code(428).send({ error: 'If-Match header with a version is required' })
    }

    // Title: explicit > derived from new content > existing
    let title = rawTitle
    if (!title) {
      const existing = await deps.pages.get(validated.slug)
      if (!existing) return reply.code(404).send({ error: 'page not found' })
      title = extractTitle(body.content, existing.title)
    }

    const result = await deps.pages.putIfMatch(
      validated.slug,
      { title, content: body.content, by: req.user?.sub ?? null },
      ifMatch,
    )
    if (result.ok === false) {
      if (result.reason === 'missing') {
        return reply.code(404).send({ error: 'page not found' })
      }
      return reply
        .code(409)
        .header('etag', etagOf(result.current.version))
        .send({ error: 'version conflict', current: result.current })
    }
    deps.onWrite?.(validated.slug)
    return reply.header('etag', etagOf(result.record.version)).send({ ...result.record })
  })

  app.delete('/api/pages/*', { preHandler: writeGuard }, async (req, reply) => {
    const slug = (req.params as { '*': string })['*']
    const validated = validateSlug(slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })
    const removed = await deps.pages.delete(validated.slug)
    if (!removed) return reply.code(404).send({ error: 'page not found' })
    deps.onWrite?.(validated.slug)
    return reply.code(204).send()
  })
}
