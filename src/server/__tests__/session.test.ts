import { describe, it, expect } from 'vitest'
import {
  seal,
  open,
  sameOriginOrMissing,
  requireAuth,
  requireRole,
  requireStrictOrigin,
} from '../auth/session'
import { formatAuthError } from '../auth/routes'

interface Payload {
  exp: number
  sub?: string
  note?: string
}

function futureExp(seconds = 60): number {
  return Math.floor(Date.now() / 1000) + seconds
}

describe('seal / open', () => {
  it('round-trips a payload', () => {
    const secrets = ['k'.repeat(32)]
    const value = seal<Payload>({ exp: futureExp(), sub: 'abc' }, secrets)
    expect(open<Payload>(value, secrets)).toMatchObject({ sub: 'abc' })
  })

  it('is not plaintext-readable', () => {
    const secrets = ['k'.repeat(32)]
    const value = seal<Payload>({ exp: futureExp(), note: 'alice@example.com' }, secrets)
    expect(value).not.toContain('alice')
  })

  it('rejects expired payloads', () => {
    const secrets = ['k'.repeat(32)]
    const value = seal<Payload>({ exp: Math.floor(Date.now() / 1000) - 1 }, secrets)
    expect(open<Payload>(value, secrets)).toBeNull()
  })

  it('rejects tampered ciphertext', () => {
    const secrets = ['k'.repeat(32)]
    const value = seal<Payload>({ exp: futureExp(), sub: 'x' }, secrets)
    const flipped = value.slice(0, -4) + (value.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    expect(open<Payload>(flipped, secrets)).toBeNull()
  })

  it('rejects values sealed with an unknown key', () => {
    const value = seal<Payload>({ exp: futureExp() }, ['a'.repeat(32)])
    expect(open<Payload>(value, ['b'.repeat(32)])).toBeNull()
  })

  it('supports rotation: any listed key opens', () => {
    const value = seal<Payload>({ exp: futureExp(), sub: 'old' }, ['a'.repeat(32)])
    expect(open<Payload>(value, ['b'.repeat(32), 'a'.repeat(32)])?.sub).toBe('old')
  })

  it('rejects malformed input', () => {
    expect(open('garbage', ['a'.repeat(32)])).toBeNull()
    expect(open('v1.###not-base64###', ['a'.repeat(32)])).toBeNull()
    expect(open('v1.a', ['a'.repeat(32)])).toBeNull()
  })

  it('throws when sealing with no keys', () => {
    expect(() => seal<Payload>({ exp: futureExp() }, [])).toThrow(/no secrets/)
  })
})

describe('sameOriginOrMissing', () => {
  const req = (headers: Record<string, string>, hostname = 'notes.example') =>
    ({ headers, hostname }) as never

  it('allows requests with no Origin header', () => {
    expect(sameOriginOrMissing(req({}))).toBe(true)
  })

  it('allows same-origin', () => {
    expect(
      sameOriginOrMissing(req({ origin: 'https://notes.example', host: 'notes.example' })),
    ).toBe(true)
    expect(
      sameOriginOrMissing(req({ origin: 'http://localhost:3000', host: 'localhost:3000' })),
    ).toBe(true)
  })

  it('rejects cross-origin', () => {
    expect(sameOriginOrMissing(req({ origin: 'https://evil.test', host: 'notes.example' }))).toBe(
      false,
    )
    expect(sameOriginOrMissing(req({ origin: 'not a url', host: 'notes.example' }))).toBe(false)
  })
})

describe('requireAuth', () => {
  it('401s anonymous requests', async () => {
    const sent: { code?: number; body?: unknown } = {}
    const reply = {
      code(c: number) {
        sent.code = c
        return this
      },
      async send(b: unknown) {
        sent.body = b
      },
    }
    await requireAuth({ user: null } as never, reply as never)
    expect(sent.code).toBe(401)
    expect(sent.body).toEqual({ error: 'unauthorized' })
  })

  it('passes authenticated requests through', async () => {
    let touched = false
    const reply = {
      code() {
        touched = true
        return this
      },
      async send() {
        touched = true
      },
    }
    await requireAuth({ user: { sub: 'x' } } as never, reply as never)
    expect(touched).toBe(false)
  })
})

describe('requireRole (fail-closed)', () => {
  const capture = async (guard: Awaited<ReturnType<typeof mkGuard>>, req: unknown) => {
    const sent: { code?: number; body?: unknown } = {}
    const reply = {
      code(c: number) {
        sent.code = c
        return this
      },
      async send(b: unknown) {
        sent.body = b
      },
    }
    await guard(req as never, reply as never)
    return sent
  }
  // tiny indirection so the helper above has a concrete type
  function mkGuard(...allowed: ('viewer' | 'editor' | 'admin')[]) {
    return requireRole(...allowed)
  }

  it('401s anonymous requests', async () => {
    const sent = await capture(mkGuard('editor'), { user: null })
    expect(sent).toMatchObject({ code: 401, body: { error: 'unauthorized' } })
  })

  it('403s a user whose role is missing (resolver did not run)', async () => {
    const sent = await capture(mkGuard('editor', 'admin'), { user: { sub: 'x' } })
    expect(sent).toMatchObject({ code: 403, body: { error: 'forbidden' } })
  })

  it('403s an insufficient role and passes an allowed one', async () => {
    const viewer = await capture(mkGuard('editor', 'admin'), { user: { sub: 'x', role: 'viewer' } })
    expect(viewer.code).toBe(403)
    const untouched = await capture(mkGuard('editor'), { user: { sub: 'x', role: 'editor' } })
    expect(untouched.code).toBeUndefined()
  })
})

describe('requireStrictOrigin', () => {
  const run = async (headers: Record<string, string>, hostname = 'notes.example') => {
    const sent: { code?: number; body?: unknown } = {}
    const reply = {
      code(c: number) {
        sent.code = c
        return this
      },
      async send(b: unknown) {
        sent.body = b
      },
    }
    await requireStrictOrigin({ headers, hostname } as never, reply as never)
    return sent.code
  }

  it('rejects requests with no Origin header', async () => {
    expect(await run({})).toBe(403)
  })

  it('rejects cross-origin and accepts same-origin', async () => {
    expect(await run({ origin: 'https://evil.test', host: 'notes.example' })).toBe(403)
    expect(await run({ origin: 'https://notes.example', host: 'notes.example' })).toBeUndefined()
  })
})

describe('formatAuthError', () => {
  it('composes provider fields', () => {
    expect(
      formatAuthError({
        error: 'invalid_grant',
        message: 'server responded with an error',
        error_description: 'Code not valid',
      }),
    ).toBe('invalid_grant — server responded with an error — Code not valid')
  })

  it('uses plain Error messages', () => {
    expect(formatAuthError(new Error('state mismatch'))).toBe('state mismatch')
  })

  it('falls back to stringification', () => {
    expect(formatAuthError('boom')).toBe('boom')
    expect(formatAuthError({})).toBe('[object Object]')
  })
})
