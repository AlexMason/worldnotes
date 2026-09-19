// ─── /edit redirect + editor-at-/{slug} route tests ─────────────────────────

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
  AUTOSAVE_DEBOUNCE_MS: '1234',
}

describe('/edit redirects', () => {
  let config: ServerConfig
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: null })
    auth =
      'wn_session=' +
      seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'u1', name: 'Ed' }, config.sessionSecrets)
  })

  it('redirects /edit/{slug} to the page (anonymous readers)', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/blog/post' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/blog/post')
  })

  it('redirects /edit to the site root', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })

  it('redirects /edit/{slug} to the page for editors too', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/blog/post', headers: { cookie: auth } })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/blog/post')
  })

  it('redirects malformed edit paths to the site root', async () => {
    const anon = await app.inject({ method: 'GET', url: '/edit/Bad%20Slug' })
    expect(anon.statusCode).toBe(302)
    expect(anon.headers.location).toBe('/')

    const editor = await app.inject({
      method: 'GET',
      url: '/edit/Bad%20Slug',
      headers: { cookie: auth },
    })
    expect(editor.statusCode).toBe(302)
    expect(editor.headers.location).toBe('/')
  })
})

describe('editor at /{slug}', () => {
  let config: ServerConfig
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: null })
    auth =
      'wn_session=' +
      seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'u1', name: 'Ed' }, config.sessionSecrets)
  })

  it('serves the editor shell to authenticated users at /{slug}', async () => {
    const res = await app.inject({ method: 'GET', url: '/blog/post', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('id="wn-app"')
    expect(res.body).toContain('100dvh')
    expect(res.body).toContain('viewport-fit=cover')
    expect(res.body).toContain('client.js')
    const cfg = JSON.parse(
      JSON.parse(/<script id="wn-config" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!) as string,
    )
    expect(cfg).toMatchObject({ slug: 'blog/post', autosaveMs: 1234, searchEnabled: true, authDisabled: false })
    expect(cfg.userName).toBe('Ed')
  })

  it('serves the reader (not the shell) to anonymous users at /{slug}', async () => {
    const res = await app.inject({ method: 'GET', url: '/blog/post' })
    expect(res.statusCode).toBe(404) // page doesn't exist yet
    expect(res.body).not.toContain('id="wn-app"')
  })

  it('embeds page content + version in the shell for an existing page', async () => {
    const pages = createMemoryPagesRepository()
    await pages.put('blog/post', { title: 'Post', content: '# Hi\n\nbody', by: 'u1' })
    const a = await buildApp({ config, pages, relyingParty: null })
    const res = await a.inject({ method: 'GET', url: '/blog/post', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    const page = JSON.parse(
      /<script id="wn-page" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!,
    )
    expect(page).toMatchObject({ slug: 'blog/post', content: '# Hi\n\nbody', version: 1, exists: true })
  })

  it('marks a missing page as non-existent in the embed', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope', headers: { cookie: auth } })
    const page = JSON.parse(
      /<script id="wn-page" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!,
    )
    expect(page).toMatchObject({ slug: 'nope', exists: false, content: null, version: null })
  })

  it('never emits a raw </script> breakout from page content into the shell (XSS guard)', async () => {
    const evil = 'x </script><script>alert(1)</script>'
    const pages = createMemoryPagesRepository()
    await pages.put('evil', { title: 'Evil', content: evil, by: 'u1' })
    const a = await buildApp({ config, pages, relyingParty: null })
    const res = await a.inject({ method: 'GET', url: '/evil', headers: { cookie: auth } })
    // Angle brackets in the payload are unicode-escaped, so no premature
    // </script> close or executable <script> element appears in the HTML...
    expect(res.body).not.toContain('<script>alert(1)')
    expect(res.body).not.toContain('</script><script>')
    // ...while the JSON embed still round-trips to the exact source content.
    const page = JSON.parse(
      /<script id="wn-page" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!,
    )
    expect(page.content).toBe(evil)
  })
})
