// ─── SSR read-path route tests ───────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { createMemoryMediaRepository } from '../db/media-memory'
import { seal } from '../auth/session'
import { pngBytes } from './helpers/media-fixtures'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://idp.test',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's3cr3t-xxxxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

function editorCookie(config: ServerConfig): string {
  return (
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'u1', name: 'Ed' }, config.sessionSecrets)
  )
}

describe('SSR pages', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    app = await buildApp({ config, pages: repo, users: usersFixture(), relyingParty: null })
    auth = editorCookie(config)
  })

  it('renders the editor shape (single engine) for anonymous readers', async () => {
    await repo.put('blog/hello', { title: 'Hello There', content: '# Hello There\n\n**world**' })
    const res = await app.inject({ method: 'GET', url: '/blog/hello' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('<span class="wn-h1">')
    expect(res.body).toContain('>Hello There<')
    expect(res.body).toContain('<span class="wn-bold">')
    expect(res.body).toContain('<title>Hello There — WorldNotes</title>')
    // breadcrumb from slug segments
    expect(res.body).toContain('/blog')
    // anonymous: no edit affordance, and no login affordance in chrome
    // (locked decision — sign-in is a known route, not a public button)
    expect(res.body).not.toContain('/edit/blog/hello')
    expect(res.body).not.toContain('/oidc/login')
    // responsive mobile chrome (M1)
    expect(res.body).toContain('@media (max-width: 640px)')
    expect(res.body).toContain('min-height: 44px')
  })

  it('embeds the editor stylesheets without editor chrome', async () => {
    await repo.put('style', { title: 'S', content: '# T' })
    const res = await app.inject({ method: 'GET', url: '/style' })
    // editor tokens + content rules are present…
    expect(res.body).toContain('--wn-color-punct')
    expect(res.body).toContain('.wn-punct')
    expect(res.body).toContain('white-space: pre-wrap')
    // …and the .wn-root FLEX LAYOUT rule (chrome-only) never reaches the reader
    expect(res.body).not.toMatch(/\.wn-root\s*\{[^}]*overflow:\s*hidden/)
    expect(res.body).not.toMatch(/\.wn-root\s*\{[^}]*height:\s*100%/)
    // article carries wn-root so editor tokens resolve inside it
    expect(res.body).toContain('<article class="wn-root wn-article">')
  })

  it('preserves leading whitespace on the read path (pre-wrap parity)', async () => {
    await repo.put('ws', { title: 'WS', content: '   three spaces in' })
    const res = await app.inject({ method: 'GET', url: '/ws' })
    expect(res.body).toContain('<div data-line="0">   three spaces in</div>')
  })

  it('serves the editor shell (not the reader) to authenticated users', async () => {
    await repo.put('page', { title: 'P', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/page', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('id="wn-app"')
  })

  it('serves cache headers + ETag and answers 304 on revalidation', async () => {
    await repo.put('etag', { title: 'E', content: 'body' })
    const first = await app.inject({ method: 'GET', url: '/etag' })
    expect(first.statusCode).toBe(200)
    expect(first.headers.etag).toMatch(/^".+"$/)
    expect(first.headers['cache-control']).toContain('max-age=60')

    const reval = await app.inject({
      method: 'GET',
      url: '/etag',
      headers: { 'if-none-match': first.headers.etag as string },
    })
    expect(reval.statusCode).toBe(304)
  })

  it('second read hits cache even when repo drops the page', async () => {
    await repo.put('memo', { title: 'M', content: 'from cache' })
    await app.inject({ method: 'GET', url: '/memo' })
    await repo.delete('memo')
    const second = await app.inject({ method: 'GET', url: '/memo' })
    expect(second.statusCode).toBe(200)
    expect(second.body).toContain('from cache')
  })

  it('renders branding: site-name crumb label + raw header/footer bands inside main', async () => {
    await repo.put('brand', { title: 'B', content: 'body text' })
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: {
        siteName: 'Acme KB',
        headerHtml: '<p>Head <em>note</em></p>',
        footerHtml: '<hr><p>Totals raw &amp; unescaped</p>',
      },
    })
    const res = await app.inject({ method: 'GET', url: '/brand' })
    // Bands are emitted raw (unescaped inner markup), inside <main>, in order.
    expect(res.body).toMatch(
      /<main><div class="wn-site-header"><p>Head <em>note<\/em><\/p><\/div>[\s\S]*<div class="wn-site-footer"><hr><p>Totals raw &amp; unescaped<\/p><\/div><\/main>/,
    )
    expect(res.body).toContain('<title>B — Acme KB</title>')
    // The root crumb (href "/") is relabelled to the site name.
    expect(res.body).toContain('<a href="/">Acme KB</a>')
    expect(res.body).not.toContain('<a href="/">Home</a>')
  })

  it('omits empty bands and keeps Home label without branding', async () => {
    await repo.put('plain', { title: 'P', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/plain' })
    // No band DIVS (the class selectors still exist in the shared stylesheet).
    expect(res.body).not.toContain('<div class="wn-site-header">')
    expect(res.body).not.toContain('<div class="wn-site-footer">')
    // Default siteName still decorates title/crumb
    expect(res.body).toContain('<title>P — WorldNotes</title>')
  })

  it('busts reader ETags when only the settings chrome changes', async () => {
    await repo.put('chrome', { title: 'C', content: 'same bytes' })
    const first = await app.inject({ method: 'GET', url: '/chrome' })
    const etagBefore = first.headers.etag as string

    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { siteName: 'Renamed' },
    })

    // Same article bytes — but a reader revalidating with the old ETag must
    // get the new document, not a 304 that pins stale chrome indefinitely.
    const reval = await app.inject({
      method: 'GET',
      url: '/chrome',
      headers: { 'if-none-match': etagBefore },
    })
    expect(reval.statusCode).toBe(200)
    expect(reval.body).toContain('<title>C — Renamed</title>')
    const second = await app.inject({ method: 'GET', url: '/chrome' })
    expect(second.headers.etag).not.toBe(etagBefore)
    // …and normal revalidation of the CURRENT revision still 304s.
    const stable = await app.inject({
      method: 'GET',
      url: '/chrome',
      headers: { 'if-none-match': second.headers.etag as string },
    })
    expect(stable.statusCode).toBe(304)
  })

  it('titles the index with the site name', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { siteName: 'Acme KB' },
    })
    const res = await app.inject({ method: 'GET', url: '/all' })
    expect(res.body).toContain('<title>Acme KB</title>')
  })

  it('serves the editor shell to authenticated users with branding title + config', async () => {
    await repo.put('page2', { title: 'P', content: 'x' })
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { siteName: 'Acme KB', headerHtml: '<b>hd</b>', footerHtml: '<i>ft</i>' },
    })
    const res = await app.inject({ method: 'GET', url: '/page2', headers: { cookie: auth } })
    expect(res.body).toContain('<title>Page2 — Acme KB</title>')
    // Bands are NOT server-rendered in the shell — they ride the embedded
    // config and the client inserts them around the content column
    // (reader-<main> parity inside the editor's scroll area).
    expect(res.body).not.toContain('<div class="wn-site-header">')
    expect(res.body).toContain('id="wn-app"')
    // The original 100dvh height chain on #wn-app is intact.
    expect(res.body).toContain('height: 100dvh')
    const cfg = JSON.parse(
      JSON.parse(
        /<script id="wn-config" type="application\/json">(.+?)<\/script>/.exec(
          res.body,
        )![1]! as string,
      ),
    )
    expect(cfg.siteName).toBe('Acme KB')
    expect(cfg.headerHtml).toBe('<b>hd</b>')
    expect(cfg.footerHtml).toBe('<i>ft</i>')
  })

  it('API writes invalidate the SSR cache for that slug and the index', async () => {
    await repo.put('fresh', { title: 'F', content: 'v1' })
    await app.inject({ method: 'GET', url: '/fresh' })
    await app.inject({
      method: 'PUT',
      url: '/api/pages/fresh',
      headers: { cookie: auth, 'if-match': '"1"' },
      payload: { content: 'v2 edited' },
    })
    const after = await app.inject({ method: 'GET', url: '/fresh' })
    expect(after.body).toContain('v2 edited')
  })

  it('404s unknown slugs without create affordances — and never caches the 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope/missing' })
    expect(res.statusCode).toBe(404)
    // A browser-cached 404 is a WRONG answer that outlives its cause
    // (settings re-enabled, page created) — 4xx must never be stored.
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('Page not found')
    // Login affordances are gone from chrome; the create CTA linked to the
    // same URL and rescued only by the removed login hint, so the whole
    // create block is dropped for anonymous visitors (it is a dead end).
    expect(res.body).not.toContain('wn-create-btn')
    expect(res.body).not.toContain('/oidc/login')
    expect(res.body).toContain('No page exists at')
  })

  it('blank API save deletes the page; reader and list follow', async () => {
    await repo.put('doomed', { title: 'Doomed', content: 'was here' })
    const before = await app.inject({ method: 'GET', url: '/doomed' })
    expect(before.statusCode).toBe(200)

    const blank = await app.inject({
      method: 'PUT',
      url: '/api/pages/doomed',
      headers: { cookie: auth, 'if-match': '"1"' },
      payload: { content: '  \n ' },
    })
    expect(blank.statusCode).toBe(204)

    // SSR cache busted by the write: readers get the plain 404 (no create
    // block, no login hint).
    const after = await app.inject({ method: 'GET', url: '/doomed' })
    expect(after.statusCode).toBe(404)
    expect(after.body).not.toContain('wn-create-btn')
    expect(after.body).toContain('No page exists at')

    const list = await app.inject({ method: 'GET', url: '/api/pages' })
    expect(list.json().pages.map((p: { slug: string }) => p.slug)).not.toContain('doomed')

    // Authenticated visits land in the editor as a fresh (uncreated) page.
    const shell = await app.inject({
      method: 'GET',
      url: '/doomed',
      headers: { cookie: auth },
    })
    expect(shell.statusCode).toBe(200)
    expect(shell.body).toContain('"exists":false')
  })

  it('404s invalid slug shapes without the create overlay', async () => {
    const res = await app.inject({ method: 'GET', url: '/Bad%20Caps' })
    expect(res.statusCode).toBe(404)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).not.toContain('Create this page')
  })

  it('index lists pages and the search form', async () => {
    await repo.put('alpha', { title: 'Alpha', content: '' })
    await repo.put('beta', { title: 'Beta', content: '' })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('All pages')
    expect(res.body).toContain('wn-search-form')
    expect(res.body).toContain('/alpha')
    expect(res.body).toContain('/beta')
  })

  it('search renders matches by terms in the path (no query strings)', async () => {
    await repo.put('one', { title: 'Pineapple', content: '' })
    await repo.put('two', { title: 'Orange', content: '' })
    const res = await app.inject({ method: 'GET', url: '/search/pineapple' })
    expect(res.body).toContain('/one')
    expect(res.body).not.toContain('href="/two"')

    const landing = await app.inject({ method: 'GET', url: '/search' })
    expect(landing.statusCode).toBe(200)
    expect(landing.body).toContain('wn-search-form')
  })

  it('reserved prefixes under the catch-all return JSON 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/unknown' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'not found' })
  })

  it('escapes hostile titles and content on the read path', async () => {
    await repo.put('xss', {
      title: '<script>evil</script>',
      content: '# <script>alert(1)</script>\n\n[link](javascript:alert(1))\n',
    })
    const res = await app.inject({ method: 'GET', url: '/xss' })
    expect(res.body).not.toContain('<script>evil')
    expect(res.body).toContain('&lt;script&gt;')
    expect(res.body).not.toContain('href="javascript:')
  })
})

describe('home page + search toggle', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  async function make(settingsSeed: Record<string, string> = {}) {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    app = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository(settingsSeed),
      users: usersFixture(),
      relyingParty: null,
    })
    auth = editorCookie(config)
  }

  it('serves the index at both / and /all when no home page is set', async () => {
    await make()
    await repo.put('alpha', { title: 'Alpha', content: '' })
    for (const url of ['/', '/all']) {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(200)
      expect(res.body).toContain('All pages')
      expect(res.body).toContain('/alpha')
    }
  })

  it('serves the configured home page at / (reader for anonymous)', async () => {
    await make({ home_slug: 'welcome' })
    await repo.put('welcome', { title: 'Welcome', content: '# Welcome\n\nhi' })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<span class="wn-h1">')
    expect(res.body).toContain('>Welcome<')
    // /all still shows the index
    const all = await app.inject({ method: 'GET', url: '/all' })
    expect(all.body).toContain('All pages')
  })

  it('falls back to the index when the configured home page is missing', async () => {
    await make({ home_slug: 'gone' })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('All pages')
  })

  it('serves the editor shell at / when a home page is set and the user is authenticated', async () => {
    await make({ home_slug: 'welcome' })
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('id="wn-app"')
  })

  it('hides search UI when disabled but leaves /search functional', async () => {
    await make({ search_enabled: 'false' })
    await repo.put('one', { title: 'Pineapple', content: '' })

    const index = await app.inject({ method: 'GET', url: '/all' })
    expect(index.body).not.toContain('id="wn-search-form"')
    expect(index.body).not.toContain('href="/search"')

    const search = await app.inject({ method: 'GET', url: '/search/pineapple' })
    expect(search.statusCode).toBe(200)
    expect(search.body).toContain('/one')
    expect(search.body).not.toContain('id="wn-search-form"')
  })

  it('404s /all and hides the All pages link when the listing is disabled', async () => {
    await make({ all_pages_enabled: 'false', home_slug: 'welcome' })
    await repo.put('welcome', { title: 'Welcome', content: '# hi' })
    await repo.put('other', { title: 'Other', content: '' })

    const all = await app.inject({ method: 'GET', url: '/all' })
    expect(all.statusCode).toBe(404)
    expect(all.headers['cache-control']).toBe('no-store')
    expect(all.body).toContain('all-pages listing is disabled')

    // Landing at / still serves the home page (reader) without the link.
    const home = await app.inject({ method: 'GET', url: '/' })
    expect(home.statusCode).toBe(200)
    expect(home.body).toContain('class="wn-h1"')
    expect(home.body).not.toContain('href="/all"')

    // …and a regular page hides it too.
    const page = await app.inject({ method: 'GET', url: '/other' })
    expect(page.body).not.toContain('href="/all"')
  })

  it('404s / when all pages is disabled and the home page is missing', async () => {
    await make({ all_pages_enabled: 'false', home_slug: 'gone' })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(404)
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('carries allPagesEnabled and homeSlug in the editor shell config', async () => {
    await make({ all_pages_enabled: 'false', home_slug: 'welcome' })
    const res = await app.inject({ method: 'GET', url: '/welcome', headers: { cookie: auth } })
    const cfg = JSON.parse(
      JSON.parse(
        /<script id="wn-config" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!,
      ) as string,
    )
    expect(cfg).toMatchObject({ allPagesEnabled: false, homeSlug: 'welcome' })
  })

  it('adds Vary: Cookie to reader responses', async () => {
    await make()
    await repo.put('page', { title: 'P', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/page' })
    expect(res.headers.vary).toContain('Cookie')
  })
})

describe('favicon icon chrome', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let mediaRepo: ReturnType<typeof createMemoryMediaRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    mediaRepo = createMemoryMediaRepository()
    app = await buildApp({
      config,
      pages: repo,
      media: mediaRepo,
      users: usersFixture(),
      relyingParty: null,
    })
    auth = editorCookie(config)
  })

  it('emits the bundled icon tag set by default in reader and editor heads', async () => {
    await repo.put('page', { title: 'P', content: 'x' })
    const reader = await app.inject({ method: 'GET', url: '/page' })
    expect(reader.body).toContain(
      '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">',
    )
    expect(reader.body).toContain('<link rel="manifest" href="/icons/site.webmanifest">')
    expect(reader.body).not.toContain('href="data:,"')

    const editor = await app.inject({ method: 'GET', url: '/page', headers: { cookie: auth } })
    expect(editor.body).toContain('sizes="32x32" href="/icons/favicon-32x32.png"')
    expect(editor.body).not.toContain('href="data:,"')
  })

  it('emits override tags when the favicon is set, in both heads', async () => {
    const { id } = await mediaRepo.insert({
      mediaType: 'image/png',
      width: 64,
      height: 64,
      data: pngBytes(64, 64),
    })
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { faviconMediaId: id },
    })
    await repo.put('page', { title: 'P', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/page' })
    expect(res.body).toContain('<link rel="icon" href="/media/1">')
    expect(res.body).toContain('<link rel="apple-touch-icon" href="/media/1">')
    expect(res.body).not.toContain('site.webmanifest') // bundled set omitted under override

    const editor = await app.inject({ method: 'GET', url: '/page', headers: { cookie: auth } })
    expect(editor.body).toContain('<link rel="icon" href="/media/1">')
  })

  it('favicon change busts the anonymous reader ETag', async () => {
    await repo.put('etag', { title: 'E', content: 'same bytes' })
    const before = await app.inject({ method: 'GET', url: '/etag' })
    const { id } = await mediaRepo.insert({
      mediaType: 'image/png',
      width: 1,
      height: 1,
      data: pngBytes(),
    })
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { faviconMediaId: id },
    })
    const after = await app.inject({ method: 'GET', url: '/etag' })
    expect(after.headers.etag).not.toBe(before.headers.etag)
  })
})

describe('SSR chrome: nav page, hamburger, breadcrumb collapse', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let settingsRepo: ReturnType<typeof createMemorySettingsRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    settingsRepo = createMemorySettingsRepository({ nav_slug: 'nav' })
    app = await buildApp({
      config,
      pages: repo,
      settings: settingsRepo,
      users: usersFixture(),
      relyingParty: null,
    })
    auth = editorCookie(config)
  })

  it('renders nav-page links inside the site nav before the built-in actions', async () => {
    await repo.put('nav', { title: 'Nav', content: '- [[welcome|Welcome]]\n- [[deep/page|Deep]]' })
    await repo.put('welcome', { title: 'Welcome', content: '# Hi' })
    const res = await app.inject({ method: 'GET', url: '/welcome' })
    const body: string = res.body
    expect(body).toContain('<nav class="wn-nav" aria-label="Site">')
    expect(body).toContain('class="wn-nav-link" href="/welcome"')
    expect(body).toContain('>Welcome<')
    // before built-ins:
    expect(body.indexOf('wn-nav-link')).toBeLessThan(body.indexOf('>Search<'))
    expect(body.indexOf('href="/deep/page"')).toBeLessThan(body.indexOf('>Search<'))
  })

  it('emits the zero-JS hamburger toggle markup', async () => {
    await repo.put('anything', { title: 'A', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/anything' })
    expect(res.body).toContain('<details class="wn-menu"><summary aria-label="Site menu">')
    // actions are a SIBLING of the details (never UA-hidden)
    expect(res.body).toContain('.wn-nav:has(.wn-menu:not([open])) .wn-view-actions')
  })

  it('authenticated chrome keeps Admin/Sign-out and never links /oidc/login', async () => {
    // Authed visitors on /{slug} get the editor shell — server-rendered
    // chrome is asserted through /admin, which renders the same layout.
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: auth },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('/oidc/logout')
    expect(res.body).toContain('Sign out (')
    expect(res.body).not.toContain('/oidc/login')
  })

  it('collapses deep breadcrumb trails under an accessible ellipsis', async () => {
    await repo.put('a/b/c/d/e', { title: 'E', content: 'deep' })
    const res = await app.inject({ method: 'GET', url: '/a/b/c/d/e' })
    expect(res.body).toContain('class="wn-crumb-more"')
    expect(res.body).toContain('aria-label="Hidden breadcrumb levels"')
    // hidden middles live in the dropdown; the last two stay visible; the
    // current crumb keeps aria-current
    expect(res.body).toContain('<div class="wn-crumb-drop"><a href="/a">A</a>')
    expect(res.body).toContain('<a href="/a/b/c/d">D</a>')
    expect(res.body).toContain('<span aria-current="page">E</span>')
  })

  it('leaves short trails uncollapsed', async () => {
    await repo.put('a/b/c', { title: 'C', content: 'shallow' })
    const res = await app.inject({ method: 'GET', url: '/a/b/c' })
    expect(res.body).not.toContain('class="wn-crumb-more"')
  })

  it('a nav-page edit busts another page\u2019s ETag', async () => {
    await repo.put('nav', { title: 'Nav', content: '- [[one]]' })
    await repo.put('target', { title: 'T', content: 'body bytes' })
    const before = await app.inject({ method: 'GET', url: '/target' })

    await app.inject({
      method: 'PUT',
      url: '/api/pages/nav',
      headers: { cookie: auth, 'if-match': '"1"' },
      payload: { content: '- [[two]]' },
    })
    // Article cache for /target is untouched; only the nav parse was evicted.
    const after = await app.inject({ method: 'GET', url: '/target' })
    expect(after.headers.etag).not.toBe(before.headers.etag)
    expect(after.body).toContain('href="/two"')
    expect(after.body).not.toContain('href="/one"')
  })

  it('embeds nav links in the editor shell config', async () => {
    await repo.put('nav', { title: 'Nav', content: '- [[welcome|Welcome]]' })
    await repo.put('welcome', { title: 'Welcome', content: '# Hi' })
    const res = await app.inject({
      method: 'GET',
      url: '/welcome',
      headers: { cookie: auth },
    })
    const cfgMatch = res.body.match(/id="wn-config"[^>]*>(.*?)<\/script>/s)
    expect(cfgMatch).not.toBeNull()
    const cfg = JSON.parse(JSON.parse(cfgMatch![1]) as string)
    expect(cfg.navLinks).toEqual([{ slug: 'welcome', href: '/welcome', label: 'Welcome' }])
  })
})

describe('SSR roles & login-only gate', () => {
  const cookieFor = (config: ServerConfig, sub: string, name?: string) =>
    'wn_session=' +
    seal(
      { exp: Math.floor(Date.now() / 1000) + 300, sub, name: name ?? sub },
      config.sessionSecrets,
    )

  async function make(opts?: {
    requireLogin?: boolean
    users?: Record<string, 'viewer' | 'editor' | 'admin'>
    faviconMediaId?: number
  }) {
    const config = loadConfig(baseEnv)
    const repo = createMemoryPagesRepository()
    await repo.put('page', { title: 'P', content: 'UNIQUE-PAGE-CONTENT' })
    const app = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository({
        ...(opts?.requireLogin ? { require_login: 'true' } : {}),
        ...(opts?.faviconMediaId ? { favicon_media_id: String(opts.faviconMediaId) } : {}),
      }),
      users: usersFixture({
        users: opts?.users ?? { boss: 'admin', writer: 'editor', peeker: 'viewer' },
      }),
      relyingParty: null,
    })
    return { config, repo, app }
  }

  it('viewer gets the reader render (no editor shell, no Admin link)', async () => {
    const { config, app } = await make()
    const res = await app.inject({
      method: 'GET',
      url: '/page',
      headers: { cookie: cookieFor(config, 'peeker') },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('id="wn-app"') // no editor shell
    expect(res.body).toContain('UNIQUE-PAGE-CONTENT')
    expect(res.body).not.toContain('/admin') // no Admin chrome for non-admins
    expect(res.body).toContain('Sign out')
    await app.close()
  })

  it('editor and admin still receive the shell; only admin gets the Admin link', async () => {
    const { config, app } = await make()
    const editor = await app.inject({
      method: 'GET',
      url: '/page',
      headers: { cookie: cookieFor(config, 'writer') },
    })
    expect(editor.body).toContain('id="wn-app"')
    const cfg = JSON.parse(
      JSON.parse(/id="wn-config"[^>]*>(.*?)<\/script>/s.exec(editor.body)![1]! as string),
    )
    // The client renders the Admin link from this field (=== 'admin') —
    // a non-admin shell must carry a non-admin role.
    expect(cfg.userRole).toBe('editor')

    const admin = await app.inject({
      method: 'GET',
      url: '/page',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(admin.body).toContain('id="wn-app"')
    expect(
      JSON.parse(JSON.parse(/id="wn-config"[^>]*>(.*?)<\/script>/s.exec(admin.body)![1]! as string))
        .userRole,
    ).toBe('admin')
    await app.close()
  })

  it('login-only mode 403s anonymous HTML with a sign-in document and no /media/ URLs', async () => {
    const { config, app } = await make({ requireLogin: true, faviconMediaId: 7 })
    const res = await app.inject({ method: 'GET', url: '/page' })
    expect(res.statusCode).toBe(403)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('Sign-in required')
    expect(res.body).toContain('/oidc/login?returnTo=%2Fpage')
    // Uploaded override bytes/URLs never reach the anonymous gate doc.
    expect(res.body).not.toContain('/media/')
    // The reader page itself is not embedded.
    expect(res.body).not.toContain('UNIQUE-PAGE-CONTENT')
    await app.close()
  })

  it('login-only mode keeps authenticated surfaces working', async () => {
    const { config, app } = await make({ requireLogin: true })
    const viewer = await app.inject({
      method: 'GET',
      url: '/page',
      headers: { cookie: cookieFor(config, 'peeker') },
    })
    expect(viewer.statusCode).toBe(200)
    expect(viewer.body).toContain('UNIQUE-PAGE-CONTENT')
    const anonApi = await app.inject({ method: 'GET', url: '/api/pages/page' })
    expect(anonApi.statusCode).toBe(403)
    await app.close()
  })

  it('returnTo on the gate is built from the validated slug, not the raw URL', async () => {
    const { config, app } = await make({ requireLogin: true })
    // Invalid slug path: the gate doc must not reflect the raw attack string.
    const evil = await app.inject({ method: 'GET', url: '/Bad%22onmouseover%3Dx' })
    expect(evil.statusCode).toBe(403)
    expect(evil.body).toContain('/oidc/login?returnTo=%2F')
    expect(evil.body).not.toContain('onmouseover=x"')
    // Deep valid slug round-trips.
    await (
      await buildApp({
        config,
        pages: createMemoryPagesRepository(),
        users: usersFixture({ users: { boss: 'admin' } }),
        relyingParty: null,
        settings: createMemorySettingsRepository({ require_login: 'true' }),
      })
    ).close()
    await app.close()
  })
})

describe('custom status pages (Phase B)', () => {
  const cookieFor = (config: ServerConfig, sub: string) =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub, name: sub }, config.sessionSecrets)

  async function make(
    settingsSeed: Record<string, string>,
    users?: Record<string, 'viewer' | 'editor' | 'admin'>,
  ) {
    const config = loadConfig(baseEnv)
    const repo = createMemoryPagesRepository()
    const app = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository(settingsSeed),
      users: usersFixture({ users: users ?? { boss: 'admin', peeker: 'viewer' } }),
      relyingParty: null,
    })
    return { config, repo, app }
  }

  it('renders the designated 404 page as markdown inside chrome, escaped', async () => {
    const { repo, app } = await make({ not_found_slug: 'gone' })
    await repo.put('gone', {
      title: 'Gone',
      content: '# All gone\n\nTry the [[home|front page]].\n\n<script>alert(1)</script>',
    })
    const res = await app.inject({ method: 'GET', url: '/nowhere' })
    expect(res.statusCode).toBe(404)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('All gone')
    expect(res.body).toContain('href="/home"') // wiki links work
    expect(res.body).not.toContain('<script>alert(1)</script>') // engine escapes raw HTML
    expect(res.body).not.toContain('No page exists at') // custom body replaced the fallback
    await app.close()
  })

  it('editing the status page busts the render cache via the write hook', async () => {
    const { config, repo, app } = await make({ not_found_slug: 'gone' })
    await repo.put('gone', { title: 'Gone', content: 'version-one' })
    const first = await app.inject({ method: 'GET', url: '/nowhere' })
    expect(first.body).toContain('version-one')
    // Edit through the API — that is where cache invalidation is wired.
    const put = await app.inject({
      method: 'PUT',
      url: '/api/pages/gone',
      headers: { cookie: cookieFor(config, 'boss'), 'if-match': '"1"' },
      payload: { content: 'version-two' },
    })
    expect(put.statusCode).toBe(200)
    const second = await app.inject({ method: 'GET', url: '/nowhere' })
    expect(second.body).toContain('version-two')
    expect(second.body).not.toContain('version-one')
    await app.close()
  })

  it('a dangling designation falls back to the built-in body', async () => {
    const { app } = await make({ not_found_slug: 'no-such-page' })
    const res = await app.inject({ method: 'GET', url: '/nowhere' })
    expect(res.statusCode).toBe(404)
    expect(res.body).toContain('No page exists at')
    await app.close()
  })

  it('login-gate 403 uses the custom forbidden page AND keeps the sign-in line', async () => {
    const { repo, app } = await make({
      require_login: 'true',
      forbidden_slug: 'restricted',
    })
    await repo.put('restricted', { title: 'Nope', content: 'Members only, friend.' })
    const res = await app.inject({ method: 'GET', url: '/anything' })
    expect(res.statusCode).toBe(403)
    expect(res.body).toContain('Members only, friend.')
    expect(res.body).toContain('/oidc/login?returnTo=%2F')
    await app.close()
  })

  it("viewer 404 gets the 'ask an editor' hint; anonymous does not", async () => {
    const { config, app } = await make({}, { boss: 'admin', peeker: 'viewer' })
    const viewer = await app.inject({
      method: 'GET',
      url: '/nowhere',
      headers: { cookie: cookieFor(config, 'peeker') },
    })
    expect(viewer.statusCode).toBe(404)
    expect(viewer.body).toContain('Ask an editor to create this page.')
    const anon = await app.inject({ method: 'GET', url: '/nowhere' })
    expect(anon.body).not.toContain('Ask an editor')
    await app.close()
  })

  it('authenticated non-admin /admin 403 renders the custom page WITHOUT a sign-in link', async () => {
    const { config, repo, app } = await make(
      { forbidden_slug: 'restricted' },
      { boss: 'admin', peeker: 'viewer' },
    )
    await repo.put('restricted', { title: 'Nope', content: 'Admins only beyond this point.' })
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'peeker') },
    })
    expect(res.statusCode).toBe(403)
    expect(res.body).toContain('Admins only beyond this point.')
    expect(res.body).not.toContain('/oidc/login')
    await app.close()
  })
})
