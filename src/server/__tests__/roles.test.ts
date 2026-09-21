// ─── Role resolver + bootstrap tests (memory repo, forged cookies) ──────────

import { describe, it, expect } from 'vitest'
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

function cookie(config: ServerConfig, sub: string): string {
  return (
    'wn_session=' +
    seal(
      { exp: Math.floor(Date.now() / 1000) + 300, sub, email: `${sub}@x.test`, name: sub },
      config.sessionSecrets,
    )
  )
}

describe('role resolver', () => {
  it('provisions a rowless session and publishes its role on req.user', async () => {
    const config = loadConfig(baseEnv)
    const users = usersFixture()
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookie(config, 'fresh') },
    })
    expect(res.json().user).toMatchObject({ sub: 'fresh', role: 'admin' }) // empty-table bootstrap
    expect((await users.get('fresh'))!.role).toBe('admin')
    await app.close()
  })

  it('grants DEFAULT_ROLE to later accounts', async () => {
    const config = loadConfig({ ...baseEnv, DEFAULT_ROLE: 'viewer' })
    const users = usersFixture({ defaultRole: 'viewer', users: { boss: 'admin' } })
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookie(config, 'newcomer') },
    })
    expect(res.json().user.role).toBe('viewer')
    await app.close()
  })

  it('bootstrap-list subs get admin even with a populated table', async () => {
    const config = loadConfig({ ...baseEnv, BOOTSTRAP_ADMIN_SUBS: 'chosen-one' })
    const users = usersFixture({
      bootstrapAdminSubs: ['chosen-one'],
      defaultRole: 'editor',
      users: { boss: 'admin' },
    })
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookie(config, 'chosen-one') },
    })
    expect(res.json().user.role).toBe('admin')
    await app.close()
  })

  it('role changes take effect on the very next request (no cookie churn)', async () => {
    const config = loadConfig(baseEnv)
    const users = usersFixture({ users: { alice: 'admin', bob: 'admin' } })
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
    const ck = cookie(config, 'bob')
    expect(
      (await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: ck } })).json().user
        .role,
    ).toBe('admin')
    await users.setRoleGuarded('bob', 'viewer', 'alice')
    expect(
      (await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: ck } })).json().user
        .role,
    ).toBe('viewer')
    await app.close()
  })

  it('resolves from the users row, not cookie claims — and leaves the row untouched', async () => {
    const config = loadConfig(baseEnv)
    const users = usersFixture({ users: { alice: 'editor' } })
    const before = (await users.get('alice'))!
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      users,
      relyingParty: null,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookie(config, 'alice') },
    })
    expect(res.json().user).toMatchObject({ role: 'editor', name: 'alice' }) // name from claims
    expect((await users.get('alice'))!.lastLoginAt).toBe(before.lastLoginAt) // reads never write
    await app.close()
  })

  it('dev mode (authDisabled) publishes a fresh admin identity', async () => {
    const config = loadConfig({ ...baseEnv, NODE_ENV: 'development', AUTH_DISABLED: '1' })
    const app = await buildApp({ config, pages: createMemoryPagesRepository() })
    const first = await app.inject({ method: 'GET', url: '/api/me' })
    const second = await app.inject({ method: 'GET', url: '/api/me' })
    expect(first.json().user).toMatchObject({ sub: 'dev', role: 'admin' })
    expect(second.json().user).toEqual(first.json().user)
    await app.close()
  })

  it('buildApp refuses to boot an auth-enabled instance without a users store', async () => {
    const config = loadConfig(baseEnv)
    await expect(
      buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: null }),
    ).rejects.toThrow(/deps\.users is required/)
  })
})
