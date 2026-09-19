// ─── SSR read path: /, /search[/terms], /{slug} ─────────────────────────────
// Anonymous visitors receive semantic HTML from the viewer renderer, served
// from a bounded cache with ETag revalidation. Registered LAST so the
// catch-all slug route only sees unmatched paths.

import type { FastifyInstance, FastifyReply } from 'fastify'
import type { ServerConfig } from '../config'
import type { PagesRepository } from '../db/repository'
import type { SessionUser } from '../auth/session'
import { validateSlug, slugDisplayName } from '../../shared/slug'
import { INDEX_CACHE_KEY, type RenderCache } from '../cache'
import { escapeHtml, searchFormHtml } from '../render/layout'
import type { LayoutOptions } from '../render/layout'

export interface PageHtmlDeps {
  config: ServerConfig
  pages: PagesRepository
  cache: RenderCache
  render: { render(src: string): string }
  layout: (opts: LayoutOptions) => string
}

interface PageCacheValue {
  title: string
  article: string
}

interface CacheEntry {
  html: string
  etag: string
}

function hashEtag(html: string): string {
  // Cheap content hash (djb2) — identical bytes ⇒ identical ETag.
  let h = 5381
  for (let i = 0; i < html.length; i++) h = ((h << 5) + h + html.charCodeAt(i)) | 0
  return `"${(h >>> 0).toString(36)}"`
}

function pageUrl(slug: string): string {
  return `/${slug.split('/').map(encodeURIComponent).join('/')}`
}

export async function registerPageHtmlRoutes(
  app: FastifyInstance,
  deps: PageHtmlDeps,
): Promise<void> {
  const { config, pages, cache, render, layout } = deps
  const MAX_AGE = 'public, max-age=60, stale-while-revalidate=300'

  function respond(reply: FastifyReply, entry: CacheEntry, status = 200): FastifyReply {
    if (status === 200 && reply.request.headers['if-none-match'] === entry.etag) {
      return reply.code(304).send()
    }
    return reply
      .code(status)
      .header('content-type', 'text/html; charset=utf-8')
      .header('etag', entry.etag)
      .header('cache-control', MAX_AGE)
      .send(entry.html)
  }

  function trailFor(slug: string) {
    const crumbs = [{ href: '/', label: 'Home' }]
    if (slug === 'home') return crumbs
    const parts = slug.split('/')
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({
        href: pageUrl(parts.slice(0, i + 1).join('/')),
        label: slugDisplayName(parts[i]!),
      })
    }
    return crumbs
  }

  function chrome(user: SessionUser | null) {
    return { user, authDisabled: config.authDisabled }
  }

  // ── Index ────────────────────────────────────────────────────────────────

  app.get('/', async (req, reply) => {
    // Index chrome varies per auth state → cache the list body, compose per request.
    const cached = cache.get<string>(INDEX_CACHE_KEY)
    let listHtml = cached?.value
    if (!listHtml) {
      const items = await pages.list({ limit: 500 })
      listHtml = items
        .map(
          (p) =>
            `<li><a href="${escapeHtml(pageUrl(p.slug))}">${escapeHtml(p.title)}</a></li>`,
        )
        .join('\n')
      cache.set(INDEX_CACHE_KEY, {
        value: listHtml,
        etag: hashEtag(listHtml),
        storedAt: Date.now(),
      })
    }
    const html = layout({
      title: 'WorldNotes',
      body: `<h1>All pages</h1>${searchFormHtml()}<ul class="wn-page-list">${
        listHtml || '<li><em>No pages yet.</em></li>'
      }</ul>`,
      ...chrome(req.user),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'public, max-age=30, stale-while-revalidate=60')
      .send(html)
  })

  // ── Search ───────────────────────────────────────────────────────────────

  async function searchResults(terms: string) {
    const items = terms ? await pages.list({ query: terms, limit: 100 }) : []
    const list = items
      .map(
        (p) => `<li><a href="${escapeHtml(pageUrl(p.slug))}">${escapeHtml(p.title)}</a></li>`,
      )
      .join('\n')
    return `<h1>Search</h1>${searchFormHtml()}${
      terms
        ? `<p>${items.length} match${items.length === 1 ? '' : 'es'} for <em>${escapeHtml(terms)}</em></p><ul class="wn-page-list">${
            list || '<li><em>Nothing found.</em></li>'
          }</ul>`
        : ''
    }`
  }

  app.get('/search', async (req, reply) => {
    const html = layout({
      title: 'Search',
      body: await searchResults(''),
      trail: [{ href: '/', label: 'Home' }, { href: '/search', label: 'Search' }],
      ...chrome(req.user),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-cache')
      .send(html)
  })

  app.get('/search/*', async (req, reply) => {
    const params = (req.params as { '*': string })['*']
    const raw = decodeURIComponent(params).trim()
    const terms = raw
    const html = layout({
      title: `Search: ${terms}`,
      body: await searchResults(terms),
      trail: [{ href: '/', label: 'Home' }, { href: '/search', label: 'Search' }],
      ...chrome(req.user),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-cache')
      .send(html)
  })

  // ── Catch-all page route (registered last) ───────────────────────────────

  app.get('/*', async (req, reply) => {
    const raw = (req.params as { '*': string })['*']
    if (raw.startsWith('api/') || raw.startsWith('oidc/') || raw.startsWith('assets/')) {
      return reply.code(404).send({ error: 'not found' })
    }
    const validated = validateSlug(raw)
    if (!validated.ok) {
      const html = layout({
        title: 'Not found',
        body: `<div class="wn-status"><h1>Page not found</h1><p>That address is not a valid page path.</p></div>`,
        ...chrome(req.user),
      })
      return respond(reply, { html, etag: hashEtag(html) }, 404)
    }
    const slug = validated.slug

    // The cache stores the renderer output (auth-independent); the layout
    // chrome is composed per request, and ETags track the article bytes so
    // viewer identity never perturbs revalidation.
    const cached = cache.get<PageCacheValue>(`p:${slug}`)
    let title: string
    let articleHtml: string

    if (cached) {
      title = cached.value.title
      articleHtml = cached.value.article
    } else {
      const page = await pages.get(slug)
      if (!page) {
        // 404 with create overlay (transient: never cached)
        const html = layout({
          title: 'Page not found',
          body:
            `<div class="wn-status"><h1>Page not found</h1>` +
            `<p>No page exists at <code>${escapeHtml(pageUrl(slug))}</code> yet.</p>` +
            `<div class="wn-create" data-slug="${escapeHtml(slug)}">` +
            `<button id="wn-create-btn" type="button">Create this page</button>` +
            `<span id="wn-create-hint" hidden><a href="/oidc/login?returnTo=${encodeURIComponent(
              `/edit/${slug}`,
            )}">Log in to create</a></span>` +
            `</div></div>`,
          createForSlug: slug,
          trail: trailFor(slug),
          ...chrome(req.user),
        })
        return respond(reply, { html, etag: hashEtag(html) }, 404)
      }
      title = page.title
      articleHtml = `<article class="wn-article">${render.render(page.content)}</article>`
      cache.set(`p:${slug}`, {
        value: { title, article: articleHtml },
        etag: hashEtag(articleHtml),
        storedAt: Date.now(),
      })
    }

    const html = layout({
      title,
      body: articleHtml,
      trail: trailFor(slug),
      editSlug: req.user ? slug : undefined,
      ...chrome(req.user),
    })
    return respond(reply, { html, etag: hashEtag(articleHtml) })
  })
}
