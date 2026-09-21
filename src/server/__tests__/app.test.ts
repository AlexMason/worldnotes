import { describe, it, expect } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
import { buildApp } from '../app'
import { loadConfig } from '../config'
import { createMemoryPagesRepository } from '../db/pages-memory'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://identity.example.com',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

describe('buildApp', () => {
  it('serves /healthz', async () => {
    const app = await buildApp({
      config: loadConfig(baseEnv),
      pages: createMemoryPagesRepository(),
      users: usersFixture(),
    })
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })
})
