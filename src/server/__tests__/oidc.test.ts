import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig } from '../config'
import { createRelyingParty, sanitizeReturnTo } from '../auth/oidc'
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

function config() {
  return loadConfig(baseEnv())
}

beforeEach(() => {
  tokenEndpoint.response = () => ({ status: 500, body: { error: 'unconfigured' } })
})

describe('sanitizeReturnTo', () => {
  it('accepts app-relative paths', () => {
    expect(sanitizeReturnTo('/blog/post')).toBe('/blog/post')
    expect(sanitizeReturnTo('/')).toBe('/')
  })

  it('rejects open-redirect vectors', () => {
    expect(sanitizeReturnTo('https://evil.test/x')).toBeNull()
    expect(sanitizeReturnTo('//evil.test/x')).toBeNull()
    expect(sanitizeReturnTo('/\\evil.test')).toBeNull()
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull()
    expect(sanitizeReturnTo('/has space')).toBeNull()
    expect(sanitizeReturnTo(null)).toBeNull()
    expect(sanitizeReturnTo('')).toBeNull()
  })
})

describe('createRelyingParty', () => {
  it('startLogin produces an authorization URL with state, nonce, and PKCE', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { url, pending } = await rp.startLogin('/blog/one')

    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe(
      new URL(ISSUER).origin + new URL(ISSUER).pathname + '/protocol/openid-connect/auth',
    )
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('client_id')).toBe(CLIENT_ID)
    expect(parsed.searchParams.get('redirect_uri')).toBe(REDIRECT_URL)
    expect(parsed.searchParams.get('scope')).toContain('openid')
    expect(parsed.searchParams.get('state')).toBe(pending.state)
    expect(parsed.searchParams.get('nonce')).toBeTruthy()
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(pending.returnTo).toBe('/blog/one')
    expect(pending.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('startLogin sanitizes hostile returnTo', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { pending } = await rp.startLogin('//evil.test')
    expect(pending.returnTo).toBeNull()
  })

  it('completeLogin exchanges the code and maps claims to a user', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { pending } = await rp.startLogin(null)

    tokenEndpoint.response = () => ({
      status: 200,
      body: {
        access_token: 'at-1',
        token_type: 'Bearer',
        expires_in: 300,
        id_token: idTokenFor(pending.nonce),
      },
    })

    const callback = new URL(REDIRECT_URL)
    callback.searchParams.set('code', 'the-code')
    callback.searchParams.set('state', pending.state)

    const user = await rp.completeLogin({ callbackUrl: callback, pending })
    expect(user).toEqual({
      sub: 'user-42',
      email: 'alice@example.com',
      name: 'Alice Example',
    })
  })

  it('completeLogin rejects a state mismatch', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { pending } = await rp.startLogin(null)
    tokenEndpoint.response = () => ({
      status: 200,
      body: {
        access_token: 'at',
        token_type: 'Bearer',
        id_token: idTokenFor(pending.nonce),
      },
    })
    const callback = new URL(REDIRECT_URL)
    callback.searchParams.set('code', 'x')
    callback.searchParams.set('state', 'attacker-state')

    await expect(rp.completeLogin({ callbackUrl: callback, pending })).rejects.toThrow()
  })

  it('completeLogin rejects an id_token with the wrong nonce', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { pending } = await rp.startLogin(null)
    tokenEndpoint.response = () => ({
      status: 200,
      body: {
        access_token: 'at',
        token_type: 'Bearer',
        id_token: idTokenFor('someone-elses-nonce'),
      },
    })
    const callback = new URL(REDIRECT_URL)
    callback.searchParams.set('code', 'x')
    callback.searchParams.set('state', pending.state)

    await expect(rp.completeLogin({ callbackUrl: callback, pending })).rejects.toThrow()
  })

  it('completeLogin surfaces provider errors', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const { pending } = await rp.startLogin(null)
    tokenEndpoint.response = () => ({
      status: 400,
      body: { error: 'invalid_grant' },
    })
    const callback = new URL(REDIRECT_URL)
    callback.searchParams.set('code', 'expired')
    callback.searchParams.set('state', pending.state)

    await expect(rp.completeLogin({ callbackUrl: callback, pending })).rejects.toThrow()
  })

  it('endSessionUrl uses the advertised endpoint', async () => {
    const rp = await createRelyingParty(config(), { fetch: mockFetch })
    const url = rp.endSessionUrl()
    expect(url).toContain('/protocol/openid-connect/logout')
    expect(url).toContain(encodeURIComponent(REDIRECT_URL.split(':')[0]!))
  })
})
