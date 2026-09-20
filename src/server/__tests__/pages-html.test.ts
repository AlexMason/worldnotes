// ─── SSR read-path route tests ───────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { seal } from '../auth/session'

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
    app = await buildApp({ config, pages: repo, relyingParty: null })
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
    expect(res.body).toContain('<title>Hello There</title>')
    // breadcrumb from slug segments
    expect(res.body).toContain('/blog')
    // anonymous: no edit affordance, has login link
    expect(res.body).not.toContain('/edit/blog/hello')
    expect(res.body).toContain('/oidc/login')
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

  it('404s unknown slugs with a create overlay', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope/missing' })
    expect(res.statusCode).toBe(404)
    expect(res.body).toContain('Page not found')
    expect(res.body).toContain('wn-create-btn')
    expect(res.body).toContain('data-slug="nope/missing"')
    expect(res.body).toContain('/oidc/login?returnTo=%2Fnope%2Fmissing')
  })

  it('404s invalid slug shapes without the create overlay', async () => {
    const res = await app.inject({ method: 'GET', url: '/Bad%20Caps' })
    expect(res.statusCode).toBe(404)
    expect(res.body).not.toContain('wn-create-btn')
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
