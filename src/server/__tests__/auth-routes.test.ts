// ─── Auth route integration tests (mocked issuer, real crypto) ──────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig } from '../config'
import { buildApp } from '../app'
import { createRelyingParty } from '../auth/oidc'
import { createMemoryPagesRepository } from '../db/pages-memory'
import {
  mockFetch,
  tokenEndpoint,
  idTokenFor,
  ISSUER,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL,
} from './helpers/mock-oidc-provider'

const baseEnv = () => ({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: ISSUER,
  OIDC_CLIENT_ID: CLIENT_ID,
  OIDC_CLIENT_SECRET: CLIENT_SECRET,
  OIDC_REDIRECT_URL: REDIRECT_URL,
  SESSION_SECRETS: 'a'.repeat(32),
})

function cookieOf(setCookie: string[] | string | undefined, name: string): string | null {
  const lines = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  for (const line of lines) {
    if (line.startsWith(`${name}=`)) return line.split(';')[0]!
  }
  return null
}

describe('auth routes (OIDC)', () => {
  beforeEach(() => {
    tokenEndpoint.response = () => ({ status: 500, body: { error: 'unconfigured' } })
  })

  it('runs the full login → session → whoami flow', async () => {
    const config = loadConfig(baseEnv())
    const rp = await createRelyingParty(config, { fetch: mockFetch })
    const app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: rp })

    // 1. login redirects to the provider with pending state cookie
    const login = await app.inject({ method: 'GET', url: '/oidc/login?returnTo=/blog/one' })
    expect(login.statusCode).toBe(302)
    const authUrl = new URL(login.headers.location as string)
    expect(authUrl.pathname).toBe(
      new URL(ISSUER).pathname + '/protocol/openid-connect/auth',
    )
    const state = authUrl.searchParams.get('state')!
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')

    const pendingCookie = cookieOf(login.headers['set-cookie'] as never, 'wn_oidc_pending')

    // 2. callback exchanges code; we replay with the nonce the RP generated
    // (derive the nonce from the mock provider's expectations by grabbing it
    //  from the auth URL — the RP sealed it into the pending cookie)
    const nonce = authUrl.searchParams.get('nonce')!
    tokenEndpoint.response = () => ({
      status: 200,
      body: {
        access_token: 'at',
        token_type: 'Bearer',
        expires_in: 300,
        id_token: idTokenFor(nonce),
      },
    })

    const cb = await app.inject({
      method: 'GET',
      url: `/oidc/callback?code=abc&state=${state}`,
      headers: { cookie: pendingCookie! },
    })
    expect(cb.statusCode).toBe(302)
    expect(pendingCookie).not.toBeNull()
    expect(cb.headers.location).toBe('/blog/one')

    const sessionCookie = cookieOf(cb.headers['set-cookie'] as never, 'wn_session')
    expect(sessionCookie).not.toBeNull()

    // 3. authenticated /api/me
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: sessionCookie! } })
    expect(me.statusCode).toBe(200)
    expect(me.json().user).toEqual({ sub: 'user-42', email: 'alice@example.com', name: 'Alice Example' })

    // 4. logout clears the session cookie
    const out = await app.inject({ method: 'GET', url: '/oidc/logout' })
    expect(out.statusCode).toBe(302)
    const cleared = cookieOf(out.headers['set-cookie'] as never, 'wn_session')
    expect(cleared).toBe('wn_session=')

    // 5. hostile returnTo is ignored (open-redirect guard)
    const evil = await app.inject({ method: 'GET', url: '/oidc/login?returnTo=//evil.test/x' })
    expect(evil.statusCode).toBe(302)
    const evilPending = cookieOf(evil.headers['set-cookie'] as never, 'wn_oidc_pending')
    const evilNonce = new URL(evil.headers.location as string).searchParams.get('nonce')!
    tokenEndpoint.response = () => ({
      status: 200,
      body: { access_token: 'at', token_type: 'Bearer', id_token: idTokenFor(evilNonce) },
    })
    const evilCb = await app.inject({
      method: 'GET',
      url: `/oidc/callback?code=x&state=${new URL(evil.headers.location as string).searchParams.get('state')}`,
      headers: { cookie: evilPending! },
    })
    expect(evilCb.headers.location).toBe('/')

    await app.close()
  })

  it('rejects callbacks without pending state', async () => {
    const config = loadConfig(baseEnv())
    const rp = await createRelyingParty(config, { fetch: mockFetch })
    const app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: rp })

    const cb = await app.inject({ method: 'GET', url: '/oidc/callback?code=x&state=y' })
    expect(cb.statusCode).toBe(400)
    await app.close()
  })

  it('rejects callbacks whose state does not match', async () => {
    const config = loadConfig(baseEnv())
    const rp = await createRelyingParty(config, { fetch: mockFetch })
    const app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: rp })

    const login = await app.inject({ method: 'GET', url: '/oidc/login' })
    const pendingCookie = cookieOf(login.headers['set-cookie'] as never, 'wn_oidc_pending')!

    const cb = await app.inject({
      method: 'GET',
      url: '/oidc/callback?code=x&state=WRONG',
      headers: { cookie: pendingCookie },
    })
    expect(cb.statusCode).toBe(401)
    await app.close()
  })

  it('anonymous /api/me gets 401', async () => {
    const config = loadConfig(baseEnv())
    const rp = await createRelyingParty(config, { fetch: mockFetch })
    const app = await buildApp({ config, pages: createMemoryPagesRepository(), relyingParty: rp })
    const me = await app.inject({ method: 'GET', url: '/api/me' })
    expect(me.statusCode).toBe(401)
    await app.close()
  })
})

describe('auth routes (AUTH_DISABLED dev mode)', () => {
  it('fakes an editor identity and skips OIDC', async () => {
    const config = loadConfig({
      ...baseEnv(),
      NODE_ENV: 'development',
      AUTH_DISABLED: '1',
    })
    const app = await buildApp({ config, pages: createMemoryPagesRepository() })

    const me = await app.inject({ method: 'GET', url: '/api/me' })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.sub).toBe('dev')

    const login = await app.inject({ method: 'GET', url: '/oidc/login' })
    expect(login.statusCode).toBe(302)
    expect(login.headers.location).toBe('/')
    await app.close()
  })
})
