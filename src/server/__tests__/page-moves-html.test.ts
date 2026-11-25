// ─── Page moves on the HTML read path (alias 301s, cache, home) ─────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
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

describe('page moves on the read path', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>

  const editorCookie = () =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'ed', name: 'Ed' }, config.sessionSecrets)

  async function make(settings: Record<string, string> = {}) {
    const app = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository(settings),
      users: usersFixture({ users: { ed: 'editor' } }),
      relyingParty: null,
    })
    const move = (from: string, to: string) =>
      app.inject({
        method: 'POST',
        url: '/api/page-moves',
        headers: { cookie: editorCookie() },
        payload: { from, to },
      })
    return { app, move }
  }

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    await repo.put('projects/acme', { title: 'Acme', content: '# Acme' })
    await repo.put('projects/acme/notes', { title: 'Notes', content: 'n' })
    await repo.put('linker', { title: 'L', content: 'go [[/projects/acme/notes]]' })
  })

  it('301s former slugs to the current address for readers and editors', async () => {
    const { app, move } = await make()
    expect((await move('projects/acme', 'clients/acme')).statusCode).toBe(200)

    const anon = await app.inject({ method: 'GET', url: '/projects/acme/notes' })
    expect(anon.statusCode).toBe(301)
    expect(anon.headers.location).toBe('/clients/acme/notes')
    // At most a minute and no stale-while-revalidate: moving the page back
    // (reclaiming the alias) must stop the redirect quickly.
    expect(anon.headers['cache-control']).toBe('public, max-age=60')

    // The editor must not get a seeded "new page" shell over an alias.
    const editor = await app.inject({
      method: 'GET',
      url: '/projects/acme',
      headers: { cookie: editorCookie() },
    })
    expect(editor.statusCode).toBe(301)
    expect(editor.headers.location).toBe('/clients/acme')

    // Truly unknown slugs still 404.
    expect((await app.inject({ method: 'GET', url: '/projects/nope' })).statusCode).toBe(404)
  })

  it('keeps the login-only gate in front of alias redirects', async () => {
    const { app, move } = await make({ require_login: 'true' })
    await move('projects/acme', 'clients/acme')
    const anon = await app.inject({ method: 'GET', url: '/projects/acme' })
    expect(anon.statusCode).toBe(403)
    expect(anon.headers.location).toBeUndefined()

    const editor = await app.inject({
      method: 'GET',
      url: '/projects/acme',
      headers: { cookie: editorCookie() },
    })
    expect(editor.statusCode).toBe(301)
    expect(editor.headers['cache-control']).toMatch(/^private/)
  })

  it('serves fresh reader HTML for linking pages after a move (cache cleared)', async () => {
    const { app, move } = await make()
    const before = await app.inject({ method: 'GET', url: '/linker' })
    expect(before.body).toContain('href="/projects/acme/notes"')

    await move('projects/acme', 'clients/acme')
    const after = await app.inject({ method: 'GET', url: '/linker' })
    // Rewritten link, rendered as an existing page (not marked missing).
    expect(after.body).toContain('<a class="wn-wiki-link" href="/clients/acme/notes"')
  })

  it('keeps serving a moved home page at /', async () => {
    const { app, move } = await make({ home_slug: 'projects/acme' })
    await move('projects/acme', 'clients/acme')
    const home = await app.inject({ method: 'GET', url: '/' })
    expect(home.statusCode).toBe(200)
    expect(home.body).toContain('>Acme<')
  })

  it('a home setting lagging behind a move still reaches the page at /', async () => {
    const { move } = await make({ home_slug: 'projects/acme' })
    await move('projects/acme', 'clients/acme')
    // Simulate the settings write having failed: home still names the old slug.
    const lagging = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository({ home_slug: 'projects/acme' }),
      users: usersFixture(),
      relyingParty: null,
    })
    const home = await lagging.inject({ method: 'GET', url: '/' })
    expect(home.statusCode).toBe(301)
    expect(home.headers.location).toBe('/clients/acme')
  })
})
