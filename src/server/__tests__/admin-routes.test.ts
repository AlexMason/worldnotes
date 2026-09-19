// ─── Admin settings route tests (memory repos, forged session cookies) ──────

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
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

function editorCookie(config: ServerConfig): string {
  return (
    'wn_session=' +
    seal(
      { exp: Math.floor(Date.now() / 1000) + 300, sub: 'user-1', email: 'e@x.test', name: 'E' },
      config.sessionSecrets,
    )
  )
}

describe('admin settings', () => {
  let config: ServerConfig
  let settingsRepo: ReturnType<typeof createMemorySettingsRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    settingsRepo = createMemorySettingsRepository()
    app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: settingsRepo,
      relyingParty: null,
    })
    auth = editorCookie(config)
  })

  it('requires auth for GET /admin and PUT /api/settings', async () => {
    expect((await app.inject({ method: 'GET', url: '/admin' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'PUT', url: '/api/settings', payload: {} })).statusCode).toBe(401)
  })

  it('renders the admin form with the current settings', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: false, homeSlug: 'welcome' },
    })

    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Admin settings')
    expect(res.body).toContain('<input type="checkbox" name="searchEnabled">')
    expect(res.body).toContain('value="welcome"')
  })

  it('shows search enabled by default', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(res.body).toContain('<input type="checkbox" name="searchEnabled" checked>')
    expect(res.body).toContain('value=""')
  })

  it('PUT updates and persists settings', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: false, homeSlug: 'blog/intro' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      searchEnabled: false,
      homeSlug: 'blog/intro',
      allPagesEnabled: true,
    })
    expect(settingsRepo.dump()).toEqual({
      search_enabled: 'false',
      home_slug: 'blog/intro',
      all_pages_enabled: 'true',
    })
  })

  it('renders the all-pages checkbox and honours its state', async () => {
    const on = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(on.body).toContain('<input type="checkbox" name="allPagesEnabled" checked>')

    // Disabling without a home page is rejected with an explanatory error.
    const bad = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { allPagesEnabled: false, homeSlug: '' },
    })
    expect(bad.statusCode).toBe(400)
    expect(bad.json()).toMatchObject({ error: /home page is required/ })

    const ok = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { allPagesEnabled: false, homeSlug: 'welcome' },
    })
    expect(ok.statusCode).toBe(200)
    const off = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(off.body).toContain('<input type="checkbox" name="allPagesEnabled">')
    // The admin page chrome itself hides the "All pages" link when disabled.
    expect(off.body).not.toContain('href="/all"')
  })

  it('rejects invalid values with 400', async () => {
    const badSlug = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { homeSlug: 'Bad Slug' },
    })
    expect(badSlug.statusCode).toBe(400)

    const badBool = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: 'yes' },
    })
    expect(badBool.statusCode).toBe(400)
  })
})
