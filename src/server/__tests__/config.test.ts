import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../config'

const REAL_ENV = { ...process.env }

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://x/y',
    OIDC_ISSUER: 'https://identity.example.com/realms/main',
    OIDC_CLIENT_ID: 'worldnotes',
    OIDC_CLIENT_SECRET: 'secret',
    OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
    SESSION_SECRETS: 'a'.repeat(32),
    ...overrides,
  }
}

describe('loadConfig', () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key]
  })
  afterEach(() => {
    process.env = { ...REAL_ENV }
  })

  it('defaults the cache, debounce and media knobs when unset', () => {
    const config = loadConfig(baseEnv())
    expect(config.env.CACHE_MAX_ENTRIES).toBe(200)
    expect(config.env.CACHE_TTL_SECONDS).toBe(55)
    expect(config.env.AUTOSAVE_DEBOUNCE_MS).toBe(1500)
    expect(config.env.MEDIA_MAX_BYTES).toBe(2_097_152)
  })

  it('accepts a complete OIDC configuration', () => {
    const config = loadConfig(baseEnv())
    expect(config.oidc).toEqual({
      issuer: 'https://identity.example.com/realms/main',
      clientId: 'worldnotes',
      clientSecret: 'secret',
      redirectUrl: 'http://localhost:3000/oidc/callback',
    })
    expect(config.authDisabled).toBe(false)
    expect(config.sessionSecrets).toEqual(['a'.repeat(32)])
  })

  it('rejects missing OIDC settings when auth is enabled', () => {
    const env = baseEnv()
    delete env.OIDC_ISSUER
    expect(() => loadConfig(env)).toThrow(/OIDC_ISSUER/)
  })

  it('rejects short session secrets', () => {
    expect(() => loadConfig(baseEnv({ SESSION_SECRETS: 'tooshort' }))).toThrow()
  })

  it('supports multiple secrets for rotation', () => {
    const config = loadConfig(baseEnv({ SESSION_SECRETS: `${'a'.repeat(32)},${'b'.repeat(40)}` }))
    expect(config.sessionSecrets).toHaveLength(2)
  })

  it('AUTH_DISABLED bypasses OIDC requirements outside production', () => {
    const env = baseEnv()
    delete env.OIDC_ISSUER
    delete env.OIDC_CLIENT_ID
    delete env.OIDC_CLIENT_SECRET
    delete env.OIDC_REDIRECT_URL
    delete env.SESSION_SECRETS
    const config = loadConfig({ ...env, NODE_ENV: 'development', AUTH_DISABLED: '1' })
    expect(config.authDisabled).toBe(true)
    expect(config.oidc).toBeNull()
  })

  it('refuses AUTH_DISABLED in production', () => {
    expect(() => loadConfig(baseEnv({ NODE_ENV: 'production', AUTH_DISABLED: '1' }))).toThrow(
      /not permitted/,
    )
  })

  it('coerces numeric settings', () => {
    const config = loadConfig(baseEnv({ PORT: '8080', CACHE_MAX_ENTRIES: '50' }))
    expect(config.env.PORT).toBe(8080)
    expect(config.env.CACHE_MAX_ENTRIES).toBe(50)
  })

  it('rejects non-numeric PORT', () => {
    expect(() => loadConfig(baseEnv({ PORT: 'not-a-number' }))).toThrow(/PORT/)
  })
})
