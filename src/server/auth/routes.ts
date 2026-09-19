// ─── Auth routes: /oidc/login | /oidc/callback | /oidc/logout | /api/me ──────

import type { FastifyInstance } from 'fastify'
import type { ServerConfig } from '../config'
import { PENDING_COOKIE, seal, open, sessionCookieOptions } from './session'
import type { OidcRelyingParty, PendingAuth } from './oidc'
import { sanitizeReturnTo } from './oidc'

export interface AuthRouteDeps {
  config: ServerConfig
  relyingParty: OidcRelyingParty | null
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthRouteDeps,
): Promise<void> {
  const { config } = deps
  const pendingMaxAge = 600

  app.get('/oidc/login', async (req, reply) => {
    if (config.authDisabled || !deps.relyingParty) return reply.redirect('/', 302)
    const { query } = req as { query: { returnTo?: string } }
    const { url, pending } = await deps.relyingParty.startLogin(
      sanitizeReturnTo(query.returnTo),
    )
    reply.cookie(
      PENDING_COOKIE,
      seal(pending, config.sessionSecrets),
      {
        ...sessionCookieOptions(pendingMaxAge, config.isProduction),
        path: '/oidc/callback', // scoped: only travels to the callback
      },
    )
    return reply.redirect(url, 302)
  })

  app.get('/oidc/callback', async (req, reply) => {
    if (config.authDisabled || !deps.relyingParty) return reply.redirect('/', 302)

    const raw = req.cookies?.[PENDING_COOKIE]
    const pending = raw ? open<PendingAuth>(raw, config.sessionSecrets) : null
    reply.clearCookie(PENDING_COOKIE, { path: '/oidc/callback' })
    if (!pending) {
      return reply.code(400).send({ error: 'missing or expired login state' })
    }

    // Reconstruct the absolute callback URL (behind proxies req.url lacks the
    // origin; the registered redirect_uri is authoritative).
    const callbackUrl = new URL(config.oidc!.redirectUrl)
    for (const [k, v] of new URLSearchParams(req.url.split('?')[1] ?? '')) {
      callbackUrl.searchParams.set(k, v)
    }

    let user
    try {
      user = await deps.relyingParty.completeLogin({ callbackUrl, pending })
    } catch (e) {
      req.log.warn({ err: e }, 'OIDC callback rejected')
      return reply.code(401).send({ error: 'authentication failed' })
    }

    reply.setSession(user)
    return reply.redirect(pending.returnTo ?? '/', 302)
  })

  app.get('/oidc/logout', async (req, reply) => {
    reply.clearSession()
    const end = config.authDisabled ? null : deps.relyingParty?.endSessionUrl() ?? null
    return reply.redirect(end ?? '/', 302)
  })

  app.get('/api/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'unauthorized' })
    return { user: req.user }
  })
}
