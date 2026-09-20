// ─── Encrypted cookie sessions ───────────────────────────────────────────────
// AES-256-GCM sealed payloads (encrypted, not merely signed — identity claims
// must not leak to the browser), comma-list keys for rotation: seal with the
// first key, open tries every key. exp enforced at open time.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'

export const SESSION_COOKIE = 'wn_session'
export const PENDING_COOKIE = 'wn_oidc_pending'

export interface SessionUser {
  sub: string
  email?: string
  name?: string
}

export interface SessionPayload extends SessionUser {
  /** Epoch seconds after which the session is rejected. */
  exp: number
}

export interface SealedFields {
  exp: number
}

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest()
}

const PFX = 'v1.'

export function seal<T extends SealedFields>(payload: T, secrets: string[]): string {
  if (secrets.length === 0) throw new Error('seal: no secrets configured')
  const key = deriveKey(secrets[0]!)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return PFX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64url')
}

export function open<T extends SealedFields>(value: string, secrets: string[]): T | null {
  if (!value.startsWith(PFX)) return null
  const raw = Buffer.from(value.slice(PFX.length), 'base64url')
  if (raw.length < 28) return null
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ct = raw.subarray(28)

  for (const secret of secrets) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv)
      decipher.setAuthTag(tag)
      const plain = Buffer.concat([decipher.update(ct), decipher.final()])
      const payload = JSON.parse(plain.toString('utf8')) as T
      if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
      return payload
    } catch {
      // try the next key
    }
  }
  return null
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user, or null for anonymous. */
    user: SessionUser | null
  }
  interface FastifyReply {
    setSession(user: SessionUser): void
    clearSession(): void
  }
}

export interface SessionPluginOptions {
  secrets: string[]
  /** seconds */
  maxAgeSeconds: number
  secure: boolean
  /** DEV ONLY fake editor identity; refuses to run in production. */
  authDisabled: boolean
}

export function sessionCookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: maxAgeSeconds,
  }
}

const DEV_USER: SessionUser = { sub: 'dev', email: 'dev@localhost', name: 'Dev Editor' }

export async function registerSessions(
  app: FastifyInstance,
  opts: SessionPluginOptions,
): Promise<void> {
  await app.register(cookie)

  if (opts.authDisabled) {
    app.addHook('onRequest', async (req) => {
      req.user = DEV_USER
    })
    app.decorateReply('setSession', () => {
      /* noop in dev mode */
    })
    app.decorateReply('clearSession', () => {
      /* noop in dev mode */
    })
    return
  }

  app.decorateRequest('user', null)
  app.addHook('onRequest', async (req) => {
    const cookieValue = req.cookies?.[SESSION_COOKIE]
    if (!cookieValue) return
    const payload = open<SessionPayload>(cookieValue, opts.secrets)
    if (!payload) return
    req.user = { sub: payload.sub, email: payload.email, name: payload.name }
  })

  app.decorateReply('setSession', function setSession(this: FastifyReply, user: SessionUser) {
    const payload: SessionPayload = {
      ...user,
      exp: Math.floor(Date.now() / 1000) + opts.maxAgeSeconds,
    }
    this.cookie(
      SESSION_COOKIE,
      seal(payload, opts.secrets),
      sessionCookieOptions(opts.maxAgeSeconds, opts.secure),
    )
  })

  app.decorateReply('clearSession', function clearSession(this: FastifyReply) {
    this.clearCookie(SESSION_COOKIE, { path: '/' })
  })
}

/**
 * CSRF posture: session cookies are SameSite=Lax (browsers withhold them on
 * cross-site PUT/POST/DELETE) and non-GET /api requests must carry a matching
 * Origin when one is present. Requests without an Origin header (curl,
 * server-to-server) are accepted — cookie-only auth is meaningless there
 * anyway; a hostile cross-site form post always carries a foreign Origin.
 */
export function sameOriginOrMissing(req: FastifyRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.hostname || new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/** PreHandler for auth-required routes. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.user) {
    await reply.code(401).send({ error: 'unauthorized' })
  }
}

/** PreHandler for state-changing /api routes. */
export async function requireSameOrigin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!sameOriginOrMissing(req)) {
    await reply.code(403).send({ error: 'cross-origin request rejected' })
  }
}
