// ─── SSR read path: /, /all, /search[/terms], /{slug} ────────────────────────
// Anonymous visitors receive the single-engine (core) render, served
// from a bounded cache with ETag revalidation. Editorial sessions
// (editor/admin) receive the client editor shell at /{slug} instead;
// viewers receive the reader render with their own chrome. While
// settings.requireLogin is on, anonymous HTML reads get the gated 403
// document instead. Registered LAST so the catch-all
// slug route only sees unmatched paths.

import type { FastifyInstance, FastifyReply } from 'fastify'
import type { ServerConfig } from '../config'
import type { PagesRepository } from '../db/repository'
import type { ReaderRenderer } from '../render/reader'
import type { AuthUser } from '../auth/session'
import { requireLoginHtml } from '../auth/login-gate'
import {
  notFoundBodyHtml,
  signInLineHtml,
  signInRequiredBodyHtml,
  statusDocument,
  type StatusDeps,
} from '../render/status-page'
import { isEditorialRole } from '../../shared/roles'
import type { NavLink } from '../../shared/dto'
import { validateSlug, slugDisplayName } from '../../shared/slug'
import { INDEX_CACHE_KEY, hashEtag, type RenderCache } from '../cache'
import { escapeHtml, searchFormHtml } from '../render/layout'
import type { LayoutOptions } from '../render/layout'
import { editorShellHtml } from '../render/editor-shell'
import type { AppSettings } from '../settings'
import type { ThemeService } from '../themes'

export interface PageHtmlDeps {
  config: ServerConfig
  pages: PagesRepository
  cache: RenderCache
  render: ReaderRenderer
  layout: (opts: LayoutOptions) => string
  /** Absolute prefix the client bundle is served under, e.g. '/assets'. */
  assetPrefix: string
  autosaveMs: number
  getSettings: () => AppSettings
  /** Settings revision — mixed into reader ETags so chrome-only changes
   *  (branding, toggles) bust browser revalidation of cached pages. */
  getSettingsRevision: () => number
  /** Links extracted from the configured nav page (async: the parse may
   *  need to fetch the nav page, though the render cache usually answers). */
  getNavLinks: () => Promise<NavLink[]>
  /** Theme store: the active theme's CSS (and admin `?previewTheme=` lookups)
   *  are appended after the default stylesheet on every reader surface and
   *  embedded in the editor shell. NOT used by /admin (anti-lockout). */
  themes: ThemeService
}

interface PageCacheValue {
  title: string
  article: string
}

interface CacheEntry {
  html: string
  etag: string
}

function pageUrl(slug: string): string {
  return `/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/** The request slice the render helpers need (user + raw query). */
interface ReqLike {
  user: AuthUser | null
  query?: unknown
}

export async function registerPageHtmlRoutes(
  app: FastifyInstance,
  deps: PageHtmlDeps,
): Promise<void> {
  const { config, pages, cache, render, layout, assetPrefix, autosaveMs, getSettings } = deps
  const getSettingsRevision = deps.getSettingsRevision
  const getNavLinks = deps.getNavLinks
  const themes = deps.themes
  const statusDeps: StatusDeps = { layout, render, pages, cache }
  const MAX_AGE = 'public, max-age=60, stale-while-revalidate=300'

  function respond(
    reply: FastifyReply,
    entry: CacheEntry,
    status = 200,
    preview = false,
  ): FastifyReply {
    // Previews are never negotiable or cacheable: a trial theme must not be
    // served from (or stored into) a browser cache.
    if (status === 200 && !preview && reply.request.headers['if-none-match'] === entry.etag) {
      return reply.code(304).send()
    }
    // 4xx must never sit in a browser cache. A stale 200 is a cosmetic
    // problem (≤60s-old chrome after a settings edit — accepted; the
    // settings revision is mixed into the ETag so revalidation fixes it);
    // a cached 404 is a WRONG answer that would outlive the thing that
    // caused it (e.g. re-enabling the all-pages listing, or creating the
    // page). The ETag stays (harmless); the 304 shortcut above is
    // deliberately 200-only, so a no-store 404 can never negotiate.
    return reply
      .code(status)
      .header('content-type', 'text/html; charset=utf-8')
      .header('etag', entry.etag)
      .header('cache-control', status === 200 && !preview ? MAX_AGE : 'no-store')
      .header('vary', 'Cookie')
      .send(entry.html)
  }

  function trailFor(slug: string) {
    const crumbs = [{ href: '/', label: 'Home' }]
    const homeSlug = getSettings().homeSlug ?? 'home'
    if (slug === homeSlug) return crumbs
    const parts = slug.split('/')
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({
        href: pageUrl(parts.slice(0, i + 1).join('/')),
        label: slugDisplayName(parts[i]!),
      })
    }
    return crumbs
  }

  /** Parsed `?previewTheme=<id>` — decimal positive ids only. */
  function previewId(req: ReqLike): number | null {
    const q = req.query
    const raw = q && typeof q === 'object' && 'previewTheme' in q ? q.previewTheme : undefined
    if (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw)) return null
    return Number(raw)
  }

  /**
   * The theme CSS this request renders with. Admins may preview any theme via
   * `?previewTheme=<id>`; the response is then non-cacheable (`preview`) so a
   * trial theme can never be served from, or into, a shared/browser cache.
   * Everyone else (and unknown ids) gets the active theme.
   */
  async function resolveTheme(req: ReqLike): Promise<{ css: string; preview: boolean }> {
    const id = req.user?.role === 'admin' ? previewId(req) : null
    if (id !== null) {
      const css = await themes.cssFor(id)
      if (css !== null) return { css, preview: true }
    }
    return { css: await themes.activeCss(), preview: false }
  }

  function chrome(
    user: AuthUser | null,
    settings: AppSettings,
    navLinks: NavLink[],
    themeCss: string,
  ) {
    return {
      user,
      authDisabled: config.authDisabled,
      searchEnabled: settings.searchEnabled,
      allPagesEnabled: settings.allPagesEnabled,
      siteName: settings.siteName,
      navLinks,
      headerHtml: settings.headerHtml,
      footerHtml: settings.footerHtml,
      themeCss,
      // One principle while login-only: uploaded (override) bytes never
      // reach anonymous HTML or subresources — gated sites link the bundled
      // icons for anonymous readers.
      faviconMediaId: settings.requireLogin && !user ? null : settings.faviconMediaId,
    }
  }

  // Login-only gate: anonymous HTML reads receive the 403 sign-in document
  // (custom forbiddenSlug page when designated — the sanctioned sign-in
  // line is appended either way). Unmatched api/oidc/assets wildcards keep
  // their JSON answers via the exemption.
  const gate = requireLoginHtml({
    getSettings,
    document: async (_req, returnTo) => {
      const settings = getSettings()
      const navLinks = await getNavLinks()
      return statusDocument(statusDeps, {
        kind: '403',
        title: 'Sign-in required',
        fallbackHtml: signInRequiredBodyHtml(returnTo),
        customAppendHtml: signInLineHtml(returnTo),
        trail: [{ href: '/', label: 'Home' }],
        customSlug: settings.forbiddenSlug,
        chrome: chrome(null, settings, navLinks, await themes.activeCss()),
      })
    },
  })

  /** One 404 document builder for every HTML miss (custom notFoundSlug
   *  page over a per-site fallback body; viewer gets the create-hint). */
  async function status404(
    req: ReqLike,
    fallbackHtml: string,
    trail?: { href: string; label: string }[],
  ): Promise<string> {
    const settings = getSettings()
    const navLinks = await getNavLinks()
    const theme = await resolveTheme(req)
    const hint = req.user ? '<p>Ask an editor to create this page.</p>' : undefined
    return statusDocument(statusDeps, {
      kind: '404',
      title: 'Page not found',
      fallbackHtml: hint ? fallbackHtml.replace('</div>', hint + '</div>') : fallbackHtml,
      customAppendHtml: hint,
      ...(trail ? { trail } : {}),
      customSlug: settings.notFoundSlug,
      chrome: chrome(req.user, settings, navLinks, theme.css),
    })
  }

  // ── Article render: editor shell for auth, viewer for anonymous ──────────

  async function renderArticle(
    reply: FastifyReply,
    req: ReqLike,
    slug: string,
    home = false,
  ): Promise<FastifyReply> {
    const navLinks = await getNavLinks()
    const theme = await resolveTheme(req)
    // Allowlist, never `!== 'viewer'`: an unresolvable role must not reach
    // the write-capable shell.
    if (req.user && isEditorialRole(req.user.role)) {
      const settings = getSettings()
      const page = await pages.get(slug)
      const html = editorShellHtml(slug, {
        assetPrefix,
        autosaveMs,
        searchEnabled: settings.searchEnabled,
        homeSlug: settings.homeSlug,
        allPagesEnabled: settings.allPagesEnabled,
        siteName: settings.siteName,
        navLinks,
        headerHtml: settings.headerHtml,
        footerHtml: settings.footerHtml,
        themeCss: theme.css,
        faviconMediaId: settings.faviconMediaId,
        userName: req.user.name ?? req.user.sub,
        authDisabled: config.authDisabled,
        userRole: req.user.role,
        page: page ? { content: page.content, version: page.version } : null,
      })
      return reply
        .header('content-type', 'text/html; charset=utf-8')
        .header('cache-control', 'no-store')
        .send(html)
    }

    const cached = cache.get<PageCacheValue>(`p:${slug}`)
    let title: string
    let articleHtml: string

    if (cached) {
      title = cached.value.title
      articleHtml = cached.value.article
    } else {
      const page = await pages.get(slug)
      if (!page) {
        // No login affordance on the anonymous 404 (reader pages ship none
        // by design — docs/api.md; viewers get an "ask an editor" hint).
        const html = await status404(
          req,
          notFoundBodyHtml(pageUrl(slug)),
          home ? [{ href: '/', label: 'Home' }] : trailFor(slug),
        )
        return respond(reply, { html, etag: hashEtag(html) }, 404)
      }
      title = page.title
      articleHtml = `<article class="wn-root wn-article">${await render.render(page.content)}</article>`
      cache.set(`p:${slug}`, {
        value: { title, article: articleHtml },
        etag: hashEtag(articleHtml),
        storedAt: Date.now(),
      })
    }

    const html = layout({
      title,
      body: articleHtml,
      trail: home ? [{ href: '/', label: 'Home' }] : trailFor(slug),
      ...chrome(req.user, getSettings(), navLinks, theme.css),
    })
    // ETag covers article bytes, the settings revision, the nav links AND the
    // theme CSS: cached entries are article-only, but the served document
    // embeds chrome (branding bands, nav toggles, nav-page links, theme) that
    // re-renders per request — a nav-page or theme edit must bust browser
    // revalidation of every page (the CSS is hashed in, not just the
    // revision, so a restart that resets the revision can never alias it).
    return respond(
      reply,
      {
        html,
        etag: hashEtag(
          `${articleHtml}\n${getSettingsRevision()}\n${JSON.stringify(navLinks)}\n${theme.css}`,
        ),
      },
      200,
      theme.preview,
    )
  }

  // ── Index (served at /all, and at / when no home page is configured) ─────

  async function renderIndex(reply: FastifyReply, req: ReqLike): Promise<FastifyReply> {
    const settings = getSettings()
    const navLinks = await getNavLinks()
    const theme = await resolveTheme(req)
    const cached = cache.get<string>(INDEX_CACHE_KEY)
    let listHtml = cached?.value
    if (!listHtml) {
      const items = await pages.list({ limit: 500 })
      listHtml = items
        .map((p) => `<li><a href="${escapeHtml(pageUrl(p.slug))}">${escapeHtml(p.title)}</a></li>`)
        .join('\n')
      cache.set(INDEX_CACHE_KEY, {
        value: listHtml,
        etag: hashEtag(listHtml),
        storedAt: Date.now(),
      })
    }
    const html = layout({
      title: settings.siteName,
      body: `<h1>All pages</h1>${searchFormHtml(settings.searchEnabled)}<ul class="wn-page-list">${
        listHtml || '<li><em>No pages yet.</em></li>'
      }</ul>`,
      ...chrome(req.user, settings, navLinks, theme.css),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header(
        'cache-control',
        theme.preview ? 'no-store' : 'public, max-age=30, stale-while-revalidate=60',
      )
      .header('vary', 'Cookie')
      .send(html)
  }

  app.get('/', { preHandler: [gate] }, async (req, reply) => {
    const settings = getSettings()
    const homeSlug = settings.homeSlug
    if (homeSlug) {
      if (req.user) return renderArticle(reply, req, homeSlug, true)
      // Only serve the home page when it exists; otherwise fall back to the index.
      const page = await pages.get(homeSlug)
      if (page) return renderArticle(reply, req, homeSlug, true)
    }
    if (!settings.allPagesEnabled) {
      const html = await status404(
        req,
        `<div class="wn-status"><h1>Page not found</h1>` +
          `<p>There is no landing page here yet.</p></div>`,
      )
      return respond(reply, { html, etag: hashEtag(html) }, 404)
    }
    return renderIndex(reply, req)
  })

  app.get('/all', { preHandler: [gate] }, async (req, reply) => {
    const settings = getSettings()
    if (!settings.allPagesEnabled) {
      const html = await status404(
        req,
        `<div class="wn-status"><h1>Page not found</h1>` +
          `<p>The all-pages listing is disabled.</p></div>`,
        [{ href: '/', label: 'Home' }],
      )
      return respond(reply, { html, etag: hashEtag(html) }, 404)
    }
    return renderIndex(reply, req)
  })

  // ── Search ───────────────────────────────────────────────────────────────

  async function searchResults(terms: string, searchEnabled: boolean) {
    const items = terms ? await pages.list({ query: terms, limit: 100 }) : []
    const list = items
      .map((p) => `<li><a href="${escapeHtml(pageUrl(p.slug))}">${escapeHtml(p.title)}</a></li>`)
      .join('\n')
    return `<h1>Search</h1>${searchFormHtml(searchEnabled)}${
      terms
        ? `<p>${items.length} match${items.length === 1 ? '' : 'es'} for <em>${escapeHtml(terms)}</em></p><ul class="wn-page-list">${
            list || '<li><em>Nothing found.</em></li>'
          }</ul>`
        : ''
    }`
  }

  app.get('/search', { preHandler: [gate] }, async (req, reply) => {
    const settings = getSettings()
    const theme = await resolveTheme(req)
    const html = layout({
      title: 'Search',
      body: await searchResults('', settings.searchEnabled),
      trail: [
        { href: '/', label: 'Home' },
        { href: '/search', label: 'Search' },
      ],
      ...chrome(req.user, settings, await getNavLinks(), theme.css),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', theme.preview ? 'no-store' : 'no-cache')
      .header('vary', 'Cookie')
      .send(html)
  })

  app.get('/search/*', { preHandler: [gate] }, async (req, reply) => {
    const settings = getSettings()
    const theme = await resolveTheme(req)
    const terms = decodeURIComponent((req.params as { '*': string })['*']).trim()
    const html = layout({
      title: `Search: ${terms}`,
      body: await searchResults(terms, settings.searchEnabled),
      trail: [
        { href: '/', label: 'Home' },
        { href: '/search', label: 'Search' },
      ],
      ...chrome(req.user, settings, await getNavLinks(), theme.css),
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', theme.preview ? 'no-store' : 'no-cache')
      .header('vary', 'Cookie')
      .send(html)
  })

  // ── Catch-all page route (registered last) ───────────────────────────────

  app.get('/*', { preHandler: [gate] }, async (req, reply) => {
    const raw = (req.params as { '*': string })['*']
    if (raw.startsWith('api/') || raw.startsWith('oidc/') || raw.startsWith('assets/')) {
      return reply.code(404).send({ error: 'not found' })
    }
    const validated = validateSlug(raw)
    if (!validated.ok) {
      const html = await status404(
        req,
        `<div class="wn-status"><h1>Page not found</h1>` +
          `<p>That address is not a valid page path.</p></div>`,
      )
      return respond(reply, { html, etag: hashEtag(html) }, 404)
    }
    return renderArticle(reply, req, validated.slug)
  })
}
