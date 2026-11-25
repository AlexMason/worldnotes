// ─── Page moves API (POST /api/page-moves + alias answers) ──────────────────

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
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

describe('page moves API', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let settingsRepo: ReturnType<typeof createMemorySettingsRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  const writes: string[] = []

  const cookieFor = (sub: string) =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub, name: sub }, config.sessionSecrets)
  const editor = () => ({ cookie: cookieFor('writer') })
  const move = (from: string, to: string, headers: Record<string, string> = editor()) =>
    app.inject({ method: 'POST', url: '/api/page-moves', headers, payload: { from, to } })

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    settingsRepo = createMemorySettingsRepository({
      home_slug: 'projects/acme',
      nav_slug: 'projects/acme/nav',
      not_found_slug: 'projects/acme/notes',
      forbidden_slug: 'projects/acme/denied',
    })
    writes.length = 0
    app = await buildApp({
      config,
      pages: repo,
      settings: settingsRepo,
      users: usersFixture({ users: { writer: 'editor', peeker: 'viewer' } }),
      relyingParty: null,
      onPageWrite: (slug) => writes.push(slug),
    })
    await repo.put('projects/acme', { title: 'Acme', content: '# Acme\n\n[[notes]]' })
    await repo.put('projects/acme/notes', { title: 'Notes', content: 'n' })
    await repo.put('projects/acme/nav', { title: 'Nav', content: '- [[/projects/acme]]' })
    await repo.put('projects/acme/denied', { title: 'Denied', content: 'd' })
    await repo.put('linker', {
      title: 'Linker',
      content: '# See [[/Projects/Acme/Notes]]\n\n[x](/projects/acme)',
    })
  })

  it('moves the subtree, rewrites links, follows settings and invalidates caches', async () => {
    const res = await move('projects/acme', 'Clients/Acme Corp')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.moved).toEqual([
      { from: 'projects/acme', to: 'clients/acme-corp' },
      { from: 'projects/acme/denied', to: 'clients/acme-corp/denied' },
      { from: 'projects/acme/nav', to: 'clients/acme-corp/nav' },
      { from: 'projects/acme/notes', to: 'clients/acme-corp/notes' },
    ])
    expect(body.rewritten.sort()).toEqual(['clients/acme-corp/nav', 'linker'])
    expect(body.settings).toEqual(['homeSlug', 'navSlug', 'notFoundSlug', 'forbiddenSlug'])

    const linker = await repo.get('linker')
    expect(linker).toMatchObject({
      content: '# See [[/Clients/Acme Corp/Notes]]\n\n[x](/clients/acme-corp)',
      title: 'See [[/Clients/Acme Corp/Notes]]',
      version: 2,
    })
    // The nav page moved too; its link to its (moved) parent was rewritten.
    expect((await repo.get('clients/acme-corp/nav'))?.content).toBe('- [[/clients/acme-corp]]')
    // Relative [[notes]] on the moved page already follows the move.
    expect((await repo.get('clients/acme-corp'))?.content).toBe('# Acme\n\n[[notes]]')

    expect(await settingsRepo.getAll()).toMatchObject({
      home_slug: 'clients/acme-corp',
      nav_slug: 'clients/acme-corp/nav',
      not_found_slug: 'clients/acme-corp/notes',
      forbidden_slug: 'clients/acme-corp/denied',
    })
    expect(writes).toEqual(expect.arrayContaining(['projects/acme', 'clients/acme-corp', 'linker']))
  })

  it('a settings failure after the move still answers 200 and still invalidates', async () => {
    const failing = createMemorySettingsRepository()
    const brokenApp = await buildApp({
      config,
      pages: repo,
      settings: {
        ...failing,
        getAll: async () => ({ home_slug: 'projects/acme' }),
        set: async () => {
          throw new Error('settings store down')
        },
      },
      users: usersFixture({ users: { writer: 'editor' } }),
      relyingParty: null,
      onPageWrite: (slug) => writes.push(slug),
    })
    const res = await brokenApp.inject({
      method: 'POST',
      url: '/api/page-moves',
      headers: editor(),
      payload: { from: 'projects/acme', to: 'clients/acme' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().settings).toEqual([])
    expect(await repo.get('clients/acme')).not.toBeNull()
    expect(writes).toEqual(expect.arrayContaining(['projects/acme', 'clients/acme', 'linker']))
  })

  it('maps refusals to 400/404/409', async () => {
    expect((await move('projects/acme', 'projects/acme')).statusCode).toBe(400)
    expect((await move('projects/acme', 'projects/acme/inner')).statusCode).toBe(400)
    expect((await move('projects/acme', 'api/x')).statusCode).toBe(400)
    expect((await move('projects/acme', '中文')).statusCode).toBe(400)
    expect((await move('ghost', 'x')).statusCode).toBe(404)

    const taken = await move('projects/acme', 'linker')
    expect(taken.statusCode).toBe(409)
    expect(taken.json()).toMatchObject({ slug: 'linker' })

    const long = await move('projects/acme', 'a'.repeat(250))
    expect(long.statusCode).toBe(400)
    expect(long.json().slug).toMatch(/\/notes$|\/nav$|\/denied$/)

    expect((await move('projects/acme', 'clients/acme')).statusCode).toBe(200)
    const again = await move('projects/acme', 'other')
    expect(again.statusCode).toBe(409)
    expect(again.json()).toEqual({ error: 'page moved', movedTo: 'clients/acme' })
  })

  it('is an editor write: anonymous 401, viewer 403, cross-origin refused', async () => {
    expect((await move('projects/acme', 'x', {})).statusCode).toBe(401)
    expect((await move('projects/acme', 'x', { cookie: cookieFor('peeker') })).statusCode).toBe(403)
    const evil = await move('projects/acme', 'x', { ...editor(), origin: 'https://evil.test' })
    expect(evil.statusCode).toBe(403)
    expect(await repo.get('projects/acme')).not.toBeNull()
  })

  it('answers former slugs: GET 301, writes 409 movedTo (never 404), existence true', async () => {
    await move('projects/acme', 'clients/acme')

    const get = await app.inject({ method: 'GET', url: '/api/pages/projects/acme/notes' })
    expect(get.statusCode).toBe(301)
    expect(get.headers.location).toBe('/api/pages/clients/acme/notes')

    const put = await app.inject({
      method: 'PUT',
      url: '/api/pages/projects/acme',
      headers: { ...editor(), 'if-match': '"1"' },
      payload: { content: 'stale tab' },
    })
    expect(put.statusCode).toBe(409)
    expect(put.json()).toEqual({ error: 'page moved', movedTo: 'clients/acme' })

    const blank = await app.inject({
      method: 'PUT',
      url: '/api/pages/projects/acme',
      headers: { ...editor(), 'if-match': '"1"' },
      payload: { content: '  ' },
    })
    expect(blank.json()).toMatchObject({ movedTo: 'clients/acme' })

    const create = await app.inject({
      method: 'POST',
      url: '/api/pages',
      headers: editor(),
      payload: { slug: 'projects/acme', content: 'recreate' },
    })
    expect(create.statusCode).toBe(409)
    expect(create.json()).toMatchObject({ movedTo: 'clients/acme' })
    expect(await repo.get('projects/acme')).toBeNull()

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/pages/projects/acme',
      headers: editor(),
    })
    expect(del.statusCode).toBe(409)

    const exist = await app.inject({
      method: 'GET',
      url: '/api/pages-exist?slugs=projects/acme,clients/acme,nope',
    })
    expect(exist.json().exists).toEqual({
      'projects/acme': true,
      'clients/acme': true,
      nope: false,
    })
  })
})
