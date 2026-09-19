// ─── /edit shell route tests ─────────────────────────────────────────────────

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

describe('/edit shell', () => {
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

  it('redirects anonymous visitors to the reading view', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/blog/post' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/blog/post')
  })

  it('redirects anonymous /edit through the shell to the reading view', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/edit/home')
    const anonHome = await app.inject({ method: 'GET', url: '/edit/home' })
    expect(anonHome.statusCode).toBe(302)
    expect(anonHome.headers.location).toBe('/home')
  })

  it('serves the SPA shell with embedded config to editors', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/blog/post', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('id="wn-app"')
    const cfg = JSON.parse(JSON.parse(/<script id="wn-config" type="application\/json">(.+?)<\/script>/.exec(res.body)![1]!) as string)
    expect(cfg).toEqual({ slug: 'blog/post', autosaveMs: 1234 })
    expect(res.body).toContain('client.js')
  })

  it('anonymous + malformed slug redirects to the site root', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/Bad%20Slug' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })

  it('404s malformed edit paths for editors', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/Bad%20Slug', headers: { cookie: auth } })
    expect(res.statusCode).toBe(404)
  })
})
