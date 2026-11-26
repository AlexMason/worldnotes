// ─── Pages JSON API ──────────────────────────────────────────────────────────
// Reads are public (cached at the edge/browser); writes require an editor
// session, same-origin, and optimistic concurrency (If-Match).
//
// Page moves (POST /api/page-moves) relocate a page and its subtree, rewrite
// every internal link to moved pages through the ONE engine (core
// link-rewrite), and leave an alias at each old slug. Aliases answer reads
// with a 301 and mutations with `409 {movedTo}` — never 404, which the edit
// client would treat as "deleted underneath me" and recreate the old page.

import type { FastifyInstance, FastifyReply } from 'fastify'
import { requireRole, requireSameOrigin } from '../auth/session'
import { cacheControlFor, requireLoginJson } from '../auth/login-gate'
import type { MoveInput, PagesRepository } from '../db/repository'
import type { AppSettings, SettingsPatch } from '../settings'
import { validateSlug, navTargetToSlug, wikiLinkBase } from '../../shared/slug'
import { isBlankContent } from '../../shared/content'
import { pageTitle } from '../../core/page-title'
import { rewriteLinks } from '../../core/link-rewrite'
import { defaultPlugins } from '../../core/plugins/defaults'

const MAX_CONTENT_BYTES = 1_000_000 // 1 MB
/** Slugs per /api/pages-exist or /api/page-titles request. */
const MAX_BATCH_SLUGS = 100

/** Settings that name a page by slug — they follow the page when it moves. */
const PAGE_SLUG_SETTINGS = ['homeSlug', 'navSlug', 'notFoundSlug', 'forbiddenSlug'] as const

export type PageWriteChange = 'created' | 'updated' | 'retitled' | 'deleted' | 'moved'

export interface PageApiDeps {
  pages: PagesRepository
  /** Login-only gate reads the dynamic settings snapshot per request. */
  getSettings: () => AppSettings
  /** Settings follow moved pages (home/nav/404/403 slugs). */
  updateSettings: (patch: SettingsPatch, by: string | null) => Promise<unknown>
  /** Bump when any write succeeds — SSR cache keys off this (step 8).
   *  `change` says whether the write altered page EXISTENCE (created /
   *  deleted / moved) — reader HTML of every page linking to it is then
   *  stale — or the page's TITLE (retitled), which every descendant's
   *  breadcrumb shows. */
  onWrite?: (slug: string, change: PageWriteChange) => void
}

function apiPagePath(slug: string): string {
  return `/api/pages/${slug.split('/').map(encodeURIComponent).join('/')}`
}

interface PageBody {
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
  const writeGuard = [requireSameOrigin, requireRole('editor', 'admin')]
  const readGate = requireLoginJson(deps.getSettings)

  function moved(reply: FastifyReply, movedTo: string): FastifyReply {
    return reply.code(409).send({ error: 'page moved', movedTo })
  }

  /** A write found no page: a former slug answers 409 movedTo, else 404. */
  async function missingOrMoved(reply: FastifyReply, slug: string): Promise<FastifyReply> {
    const movedTo = await deps.pages.resolveAlias(slug)
    if (movedTo !== null) return moved(reply, movedTo)
    return reply.code(404).send({ error: 'page not found' })
  }

  // ── Reads (public unless the instance is login-only) ─────────────────────────

  app.get('/api/pages', { preHandler: [readGate] }, async (req, reply) => {
    const query = (req.query ?? {}) as { q?: string; limit?: string; scope?: string }
    if (query.scope !== undefined && query.scope !== 'name') {
      return reply.code(400).send({ error: "scope must be 'name'" })
    }
    const limit = Math.min(Number(query.limit) || 100, 500)
    const items = await deps.pages.list({
      query: query.q,
      limit,
      scope: query.scope === 'name' ? 'name' : undefined,
    })
    const gated = deps.getSettings().requireLogin
    if (gated) reply.header('vary', 'Cookie')
    reply.header(
      'cache-control',
      cacheControlFor(gated, 'public, max-age=30, stale-while-revalidate=60'),
    )
    return { pages: items }
  })

  /** The valid slugs of a `?slugs=a,b/c` batch (invalid ones are omitted —
   *  unknown, not an error), or null when the batch exceeds the cap. */
  function batchSlugs(raw: unknown): Set<string> | null {
    const requested = typeof raw === 'string' && raw !== '' ? raw.split(',') : []
    if (requested.length > MAX_BATCH_SLUGS) return null
    const slugs = new Set<string>()
    for (const candidate of requested) {
      const validated = validateSlug(candidate)
      if (validated.ok) slugs.add(validated.slug)
    }
    return slugs
  }

  function batchCacheHeaders(reply: FastifyReply): void {
    const gated = deps.getSettings().requireLogin
    if (gated) reply.header('vary', 'Cookie')
    reply.header(
      'cache-control',
      cacheControlFor(gated, 'public, max-age=30, stale-while-revalidate=60'),
    )
  }

  // Link-state lookup: which of a batch of slugs exist. Backs the editor's
  // missing-page link styling (the reader resolves existence server-side).
  // Lives OUTSIDE /api/pages/* — that wildcard would read "pages-exist" as a
  // slug.
  app.get<{ Querystring: { slugs?: unknown } }>(
    '/api/pages-exist',
    { preHandler: [readGate] },
    async (req, reply) => {
      const slugs = batchSlugs(req.query.slugs)
      if (slugs === null) {
        return reply.code(400).send({ error: `at most ${MAX_BATCH_SLUGS} slugs per request` })
      }
      const found = await deps.pages.existing([...slugs])
      batchCacheHeaders(reply)
      const exists: Record<string, boolean> = {}
      for (const slug of slugs) exists[slug] = found.has(slug)
      return { exists }
    },
  )

  // Title lookup: stored titles of the existing pages in a batch. Backs the
  // editor's breadcrumb labels for ancestors it has not loaded. Same gate,
  // cap and placement rule as /api/pages-exist.
  app.get<{ Querystring: { slugs?: unknown } }>(
    '/api/page-titles',
    { preHandler: [readGate] },
    async (req, reply) => {
      const slugs = batchSlugs(req.query.slugs)
      if (slugs === null) {
        return reply.code(400).send({ error: `at most ${MAX_BATCH_SLUGS} slugs per request` })
      }
      const found = await deps.pages.titles([...slugs])
      batchCacheHeaders(reply)
      return { titles: Object.fromEntries(found) }
    },
  )

  app.get('/api/pages/*', { preHandler: [readGate] }, async (req, reply) => {
    const slug = (req.params as { '*': string })['*']
    const validated = validateSlug(slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })

    const page = await deps.pages.get(validated.slug)
    if (!page) {
      const current = await deps.pages.resolveAlias(validated.slug)
      if (current === null) return reply.code(404).send({ error: 'page not found' })
      // A former slug: the client's fetch follows this to the live page
      // (whose `slug` field then tells it where the page lives now).
      const gated = deps.getSettings().requireLogin
      if (gated) reply.header('vary', 'Cookie')
      // At most a minute, no stale-while-revalidate: a reclaimed alias (the
      // page moved back) must stop redirecting quickly.
      return reply
        .code(301)
        .header('location', apiPagePath(current))
        .header('cache-control', cacheControlFor(gated, 'public, max-age=60'))
        .send()
    }

    const gated = deps.getSettings().requireLogin
    if (gated) reply.header('vary', 'Cookie')
    reply
      .header('etag', etagOf(page.version))
      .header(
        'cache-control',
        cacheControlFor(gated, 'public, max-age=60, stale-while-revalidate=300'),
      )
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
    // No-blank-pages invariant (route-level): a page comes into existence
    // only when it first holds content — blank or absent content is refused.
    if (isBlankContent(content)) {
      return reply.code(400).send({ error: 'cannot create an empty page' })
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
      return reply.code(413).send({ error: 'content exceeds size limit' })
    }
    const title = pageTitle(content, validated.slug)

    const movedTo = await deps.pages.resolveAlias(validated.slug)
    if (movedTo !== null) return moved(reply, movedTo)

    const result = await deps.pages.create(validated.slug, {
      title,
      content,
      by: req.user?.sub ?? null,
    })
    if (!result.ok) {
      return reply.code(409).send({ error: 'page exists', current: result.current })
    }
    deps.onWrite?.(validated.slug, 'created')
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

    const ifMatch = parseIfMatch(req.headers['if-match'] as string | undefined)
    if (ifMatch === null) {
      return reply.code(428).send({ error: 'If-Match header with a version is required' })
    }

    // Blank content means "all content deleted": the save REMOVES the page
    // (version-guarded, so a stale client can never destroy newer content).
    // A blank PUT never recreates.
    if (isBlankContent(body.content)) {
      const deleted = await deps.pages.deleteIfMatch(validated.slug, ifMatch)
      if (deleted.ok === false) {
        if (deleted.reason === 'missing') return missingOrMoved(reply, validated.slug)
        return reply
          .code(409)
          .header('etag', etagOf(deleted.current.version))
          .send({ error: 'version conflict', current: deleted.current })
      }
      deps.onWrite?.(validated.slug, 'deleted')
      return reply.code(204).send()
    }

    const title = pageTitle(body.content, validated.slug)
    // The row this save replaces when the If-Match holds (versions grow, so a
    // successful putIfMatch replaced this snapshot; a concurrent
    // delete-and-recreate can at worst cost one cache clear too many/few).
    const previous = await deps.pages.get(validated.slug)

    const result = await deps.pages.putIfMatch(
      validated.slug,
      { title, content: body.content, by: req.user?.sub ?? null },
      ifMatch,
    )
    if (result.ok === false) {
      if (result.reason === 'missing') return missingOrMoved(reply, validated.slug)
      return reply
        .code(409)
        .header('etag', etagOf(result.current.version))
        .send({ error: 'version conflict', current: result.current })
    }
    deps.onWrite?.(validated.slug, previous?.title === title ? 'updated' : 'retitled')
    return reply.header('etag', etagOf(result.record.version)).send({ ...result.record })
  })

  app.delete('/api/pages/*', { preHandler: writeGuard }, async (req, reply) => {
    const slug = (req.params as { '*': string })['*']
    const validated = validateSlug(slug)
    if (!validated.ok) return reply.code(400).send({ error: validated.error })
    const removed = await deps.pages.delete(validated.slug)
    if (!removed) return missingOrMoved(reply, validated.slug)
    deps.onWrite?.(validated.slug, 'deleted')
    return reply.code(204).send()
  })

  // ── Page moves (outside /api/pages/*: that wildcard would read a `/move`
  // suffix as part of a slug) ────────────────────────────────────────────────

  app.post('/api/page-moves', { preHandler: writeGuard }, async (req, reply) => {
    const body = (req.body ?? {}) as { from?: unknown; to?: unknown }
    if (typeof body.from !== 'string' || typeof body.to !== 'string') {
      return reply.code(400).send({ error: 'from and to are required' })
    }
    const from = validateSlug(body.from)
    if (!from.ok) return reply.code(400).send({ error: from.error })
    // The new address folds like a wiki-link target (`Clients/Acme Corp`).
    const folded = navTargetToSlug(body.to)
    const to = validateSlug(folded ?? body.to)
    if (!to.ok) return reply.code(400).send({ error: to.error })
    if (to.slug === from.slug) return reply.code(400).send({ error: 'already at that address' })
    if (to.slug.startsWith(`${from.slug}/`)) {
      return reply.code(400).send({ error: 'cannot move a page inside itself' })
    }

    const by = req.user?.sub ?? null
    const result = await deps.pages.move({
      from: from.slug,
      to: to.slug,
      by,
      validate: (slug) => {
        const v = validateSlug(slug)
        return v.ok ? null : v.error
      },
      rewrite: moveRewriter(() => deps.getSettings().homeSlug),
      title: (slug, content) => pageTitle(content, slug),
    })

    if (result.ok === false) {
      switch (result.reason) {
        case 'missing':
          return reply.code(404).send({ error: 'page not found' })
        case 'moved':
          return moved(reply, result.to)
        case 'taken':
          return reply
            .code(409)
            .send({ error: `a page already exists at /${result.slug}`, slug: result.slug })
        case 'invalid':
          return reply
            .code(400)
            .send({ error: `/${result.slug}: ${result.error}`, slug: result.slug })
        case 'busy':
          return reply
            .code(409)
            .send({ error: 'Another page move is in progress — try again in a moment.' })
      }
    }

    // The move committed: invalidate first, so nothing below can leave stale
    // reader HTML behind.
    const touched = new Set([
      ...result.moved.flatMap(({ from: f, to: t }) => [f, t]),
      ...result.rewritten,
    ])
    for (const slug of touched) deps.onWrite?.(slug, 'moved')

    // Settings that named a moved page follow it — judged against settings as
    // they are NOW (a concurrent admin change wins). Not atomic with the move
    // (plan: accepted risk); a lagging setting still resolves via the alias.
    const relocated = new Map(result.moved.map(({ from: f, to: t }) => [f, t]))
    const patch = settingsPatchFor(deps.getSettings(), relocated)
    const changedSettings = Object.keys(patch)
    if (changedSettings.length > 0) {
      try {
        await deps.updateSettings(patch, by)
      } catch (err) {
        req.log.error({ err, from: from.slug, to: to.slug }, 'settings did not follow page move')
        changedSettings.length = 0
      }
    }

    req.log.info(
      {
        from: from.slug,
        to: to.slug,
        by,
        moved: result.moved.length,
        rewritten: result.rewritten.length,
        settings: changedSettings,
      },
      'page moved',
    )
    return reply.send({
      moved: result.moved,
      rewritten: result.rewritten,
      settings: changedSettings,
    })
  })
}

/**
 * The move's per-page link rewrite: relative links resolve under each page's
 * link base before and after the move (the home page's base is the root, and
 * the home page itself may be moving). The home slug is read once, inside the
 * move transaction (first call), not when the request arrived.
 */
function moveRewriter(getHomeSlug: () => string | null): MoveInput['rewrite'] {
  let homeBefore: string | null | undefined
  return (row, movedSlugs) => {
    if (homeBefore === undefined) homeBefore = getHomeSlug()
    const homeAfter = homeBefore === null ? null : (movedSlugs.get(homeBefore) ?? homeBefore)
    const content = rewriteLinks(row.content, defaultPlugins, {
      oldBase: wikiLinkBase(row.slug, homeBefore),
      newBase: wikiLinkBase(row.newSlug, homeAfter),
      moved: (slug) => movedSlugs.get(slug),
    })
    return content === row.content ? null : content
  }
}

/** Settings fields naming a moved page, pointed at its new slug. */
function settingsPatchFor(
  settings: AppSettings,
  relocated: ReadonlyMap<string, string>,
): SettingsPatch {
  const patch: SettingsPatch = {}
  for (const field of PAGE_SLUG_SETTINGS) {
    const value = settings[field]
    const next = value === null ? undefined : relocated.get(value)
    if (next !== undefined) patch[field] = next
  }
  return patch
}
