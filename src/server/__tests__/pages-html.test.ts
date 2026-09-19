// ─── SSR read-path route tests ───────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
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

  it('renders a page as semantic HTML for anonymous readers', async () => {
    await repo.put('blog/hello', { title: 'Hello There', content: '# Hello There\n\n**world**' })
    const res = await app.inject({ method: 'GET', url: '/blog/hello' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('<h1>Hello There</h1>')
    expect(res.body).toContain('<strong>world</strong>')
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

  it('shows Edit + sign-out chrome for authenticated editors', async () => {
    await repo.put('page', { title: 'P', content: 'x' })
    const res = await app.inject({ method: 'GET', url: '/page', headers: { cookie: auth } })
    expect(res.body).toContain('/edit/page')
    expect(res.body).toContain('Sign out')
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
    expect(res.body).toContain('/oidc/login?returnTo=%2Fedit%2Fnope%2Fmissing')
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
