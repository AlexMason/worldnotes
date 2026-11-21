// ─── PWA: manifest, service worker, head wiring ──────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { usersFixture } from './helpers/users-fixture'
import { loadConfig } from '../config'
import { buildApp } from '../app'
import type { PagesRepository } from '../db/repository'
import type { SettingsRepository } from '../db/settings-repository'
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

describe('PWA', () => {
  const config = loadConfig(baseEnv)
  let pages: PagesRepository
  let settings: SettingsRepository

  // Settings load at buildApp time, so seed the repo first.
  const build = (): Promise<FastifyInstance> =>
    buildApp({ config, pages, settings, users: usersFixture(), relyingParty: null })

  beforeEach(() => {
    pages = createMemoryPagesRepository()
    settings = createMemorySettingsRepository()
  })

  it('serves a root-scoped manifest following siteName', async () => {
    await settings.set('site_name', 'My World')
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/manifest.webmanifest' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/manifest+json')
    const m = res.json()
    expect(m).toMatchObject({
      name: 'My World',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })

  it('serves a parseable worker that never uses the Cache API', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/sw.js' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('javascript')
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.body).not.toMatch(/\bcaches\b/)
    expect(() => new Function(res.body)).not.toThrow()
  })

  it('stays reachable anonymously in login-only mode', async () => {
    await settings.set('require_login', 'true')
    const app = await build()
    expect((await app.inject({ method: 'GET', url: '/manifest.webmanifest' })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/sw.js' })).statusCode).toBe(200)
    // Control: the gate really is on.
    expect((await app.inject({ method: 'GET', url: '/anything' })).statusCode).toBe(403)
  })

  it('links the manifest and registers the worker on reader and editor surfaces', async () => {
    await pages.put('page', { title: 'P', content: 'x' })
    const app = await build()
    const cookie =
      'wn_session=' +
      seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'user-1' }, config.sessionSecrets)
    for (const headers of [{}, { cookie }]) {
      const res = await app.inject({ method: 'GET', url: '/page', headers })
      expect(res.body).toContain('<link rel="manifest" href="/manifest.webmanifest">')
      expect(res.body).toContain("navigator.serviceWorker.register('/sw.js')")
      expect(res.body).toContain('name="theme-color"')
    }
  })
})
