// ─── Auth routes: /oidc/login | /oidc/callback | /oidc/logout | /api/me ──────

import type { FastifyInstance } from 'fastify'
import type { ServerConfig } from '../config'
import { PENDING_COOKIE, seal, open, sessionCookieOptions } from './session'
import type { OidcRelyingParty, PendingAuth } from './oidc'
import { sanitizeReturnTo } from './oidc'
import { escapeHtml } from '../render/layout'

export interface AuthRouteDeps {
  config: ServerConfig
  relyingParty: OidcRelyingParty | null
}

/**
 * openid-client surfaces provider errors as structured fields
 * (OPError.error / .error_description) under a generic message; compose the
 * most specific description available for operator diagnostics.
 */
export function formatAuthError(e: unknown): string {
  const errLike = e as {
    message?: string
    error?: string
    error_description?: string
  }
  const parts = [errLike?.error, errLike?.message, errLike?.error_description].filter(Boolean)
  return parts.length ? parts.join(' — ') : String(e)
}

export async function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps): Promise<void> {
  const { config } = deps
  const pendingMaxAge = 600
  // Scope the pending cookie to the callback's actual path so sub-path
  // deployments (https://host/worldnotes/oidc/callback) work too.
  const pendingPath = config.oidc ? new URL(config.oidc.redirectUrl).pathname : '/oidc/callback'

  app.get('/oidc/login', async (req, reply) => {
    if (config.authDisabled || !deps.relyingParty) return reply.redirect('/', 302)
    const { query } = req as { query: { returnTo?: string } }
    const { url, pending } = await deps.relyingParty.startLogin(sanitizeReturnTo(query.returnTo))
    reply.cookie(PENDING_COOKIE, seal(pending, config.sessionSecrets), {
      ...sessionCookieOptions(pendingMaxAge, config.isProduction),
      path: pendingPath, // scoped: only travels to the callback
    })
    return reply.redirect(url, 302)
  })

  app.get('/oidc/callback', async (req, reply) => {
    if (config.authDisabled || !deps.relyingParty) return reply.redirect('/', 302)

    const raw = req.cookies?.[PENDING_COOKIE]
    const pending = raw ? open<PendingAuth>(raw, config.sessionSecrets) : null
    reply.clearCookie(PENDING_COOKIE, { path: pendingPath })
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
      const detail = formatAuthError(e)
      req.log.error({ err: e }, 'OIDC callback rejected')
      // Browser navigations land here mid-login — answer with a readable page
      // carrying the verification detail (the log keeps the full error).
      return reply
        .code(401)
        .header('content-type', 'text/html; charset=utf-8')
        .send(
          `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
            `<title>Authentication failed</title></head>` +
            `<body style="font:16px/1.6 system-ui,sans-serif;margin:2rem">` +
            `<h1>Authentication failed</h1>` +
            `<p>Sign-in could not be completed: <code>${escapeHtml(detail)}</code></p>` +
            `<p><a href="/oidc/login">Try again</a> &middot; <a href="/">Home</a></p>` +
            `<p style="color:#666">The server log contains the full error.</p>` +
            `</body></html>`,
        )
    }

    reply.setSession(user)
    return reply.redirect(pending.returnTo ?? '/', 302)
  })

  app.get('/oidc/logout', async (req, reply) => {
    reply.clearSession()
    const end = config.authDisabled ? null : (deps.relyingParty?.endSessionUrl() ?? null)
    return reply.redirect(end ?? '/', 302)
  })

  app.get('/api/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'unauthorized' })
    return { user: req.user }
  })
}
