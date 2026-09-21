// ─── Users role API tests (memory repos, forged cookies) ────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { seal } from '../auth/session'
import { usersFixture } from './helpers/users-fixture'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://idp.test',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

const ORIGIN = 'http://localhost:80' // inject's default host

describe('PUT /api/users/role', () => {
  let config: ServerConfig
  let users: ReturnType<typeof usersFixture>
  let app: Awaited<ReturnType<typeof buildApp>>

  const cookie = (sub: string) =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub, name: sub }, config.sessionSecrets)

  const putRole = (opts: { sub?: string | null; body?: unknown; origin?: string | null }) => {
    const { sub = 'boss', body, origin = ORIGIN } = opts
    const headers: Record<string, string> = {}
    if (sub !== null) headers.cookie = cookie(sub)
    if (origin !== null) headers.origin = origin
    return app.inject({
      method: 'PUT',
      url: '/api/users/role',
      headers,
      payload: body as object,
    })
  }

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    users = usersFixture({
      users: { boss: 'admin', aux: 'admin', writer: 'editor', peeker: 'viewer' },
    })
    app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
  })

  it('401s anonymous requests', async () => {
    const res = await putRole({ sub: null, body: { sub: 'peeker', role: 'editor' } })
    expect(res.statusCode).toBe(401)
  })

  it('403s viewer and editor callers — only admin changes roles', async () => {
    expect(
      (await putRole({ sub: 'peeker', body: { sub: 'writer', role: 'admin' } })).statusCode,
    ).toBe(403)
    expect(
      (await putRole({ sub: 'writer', body: { sub: 'peeker', role: 'editor' } })).statusCode,
    ).toBe(403)
  })

  it('403s a missing Origin (strict CSRF: this endpoint grants admin)', async () => {
    const res = await putRole({ origin: null, body: { sub: 'peeker', role: 'editor' } })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toMatch(/Origin/)
  })

  it('403s a cross-origin request', async () => {
    const res = await putRole({
      origin: 'https://evil.test',
      body: { sub: 'peeker', role: 'editor' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('changes a role and returns the updated record', async () => {
    const res = await putRole({ body: { sub: 'peeker', role: 'editor' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ changed: true, user: { sub: 'peeker', role: 'editor' } })
    expect((await users.get('peeker'))!.role).toBe('editor')
    expect((await users.get('peeker'))!.updatedBy).toBe('boss')
  })

  it('treats a same-role write as a 200 no-op', async () => {
    const res = await putRole({ body: { sub: 'writer', role: 'editor' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ changed: false })
  })

  it('400s a malformed body before touching the store', async () => {
    expect((await putRole({ body: { sub: 'peeker', role: 'superuser' } })).statusCode).toBe(400)
    expect((await putRole({ body: { role: 'editor' } })).statusCode).toBe(400)
    expect((await putRole({ body: { sub: '   ', role: 'editor' } })).statusCode).toBe(400)
    expect((await putRole({ body: {} })).statusCode).toBe(400)
  })

  it('404s an unknown sub', async () => {
    const res = await putRole({ body: { sub: 'nobody', role: 'editor' } })
    expect(res.statusCode).toBe(404)
  })

  it('409s demoting the last remaining admin', async () => {
    // aux is the second admin; demote it, then boss is last.
    expect((await putRole({ body: { sub: 'aux', role: 'editor' } })).statusCode).toBe(200)
    const res = await putRole({ body: { sub: 'boss', role: 'viewer' } })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/last remaining admin/)
    expect((await users.get('boss'))!.role).toBe('admin')
  })
})
