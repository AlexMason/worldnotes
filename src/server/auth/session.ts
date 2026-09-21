// ─── Encrypted cookie sessions ───────────────────────────────────────────────
// AES-256-GCM sealed payloads (encrypted, not merely signed — identity claims
// must not leak to the browser), comma-list keys for rotation: seal with the
// first key, open tries every key. exp enforced at open time.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '../../shared/roles'
import cookie from '@fastify/cookie'

export const SESSION_COOKIE = 'wn_session'
export const PENDING_COOKIE = 'wn_oidc_pending'

export interface SessionUser {
  sub: string
  email?: string
  name?: string
}

/**
 * Cookie claims plus the authoritative role. `req.user` is published ONLY by
 * the role resolver (auth/roles.ts) — the session parser writes
 * `req.sessionClaims` — so a user object can never exist without a role
 * (fail-open protection for every `req.user` consumer). The role lives in
 * the users table, resolved per request: demotions take effect immediately
 * rather than surviving in a sealed cookie until expiry.
 */
export interface AuthUser extends SessionUser {
  role: Role
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
    /** Authenticated user with resolved role, or null for anonymous. */
    user: AuthUser | null
    /** Raw cookie claims (pre-role); set by the session parser only. */
    sessionClaims: SessionUser | null
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
      // Fresh object per request: DEV_USER is a module const and the role
      // resolver is not registered in this mode — never mutate the shared.
      req.user = { ...DEV_USER, role: 'admin' }
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
  app.decorateRequest('sessionClaims', null)
  app.addHook('onRequest', async (req) => {
    const cookieValue = req.cookies?.[SESSION_COOKIE]
    if (!cookieValue) return
    const payload = open<SessionPayload>(cookieValue, opts.secrets)
    if (!payload) return
    // Claims only — the role resolver publishes req.user after this hook.
    req.sessionClaims = { sub: payload.sub, email: payload.email, name: payload.name }
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

/**
 * PreHandler for role-scoped routes. Fails closed: an absent user is 401, a
 * user whose role is missing (resolver did not run) or outside `allowed` is
 * 403 — elevation via a partially-populated identity is impossible.
 */
export function requireRole(
  ...allowed: Role[]
): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (req, reply) => {
    if (!req.user) {
      await reply.code(401).send({ error: 'unauthorized' })
      return
    }
    if (!allowed.includes(req.user.role)) {
      await reply.code(403).send({ error: 'forbidden' })
    }
  }
}

/** PreHandler for state-changing /api routes. */
export async function requireSameOrigin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!sameOriginOrMissing(req)) {
    await reply.code(403).send({ error: 'cross-origin request rejected' })
  }
}

/**
 * Stricter CSRF guard for the endpoint that grants admin (which is
 * script-execution-as-admin via raw branding HTML). Unlike
 * {@link sameOriginOrMissing}, an absent Origin is rejected: the admin form
 * always sends one, and Origin-less requests are exactly the ones a
 * Host-confused proxy or attacker-driven non-browser client would use.
 */
export async function requireStrictOrigin(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const origin = req.headers.origin
  const present =
    typeof origin === 'string' &&
    (() => {
      try {
        return new URL(origin).host === req.hostname || new URL(origin).host === req.headers.host
      } catch {
        return false
      }
    })()
  if (!present) {
    await reply.code(403).send({ error: 'a matching Origin header is required' })
  }
}
