// ─── Login-only read gate ────────────────────────────────────────────────────
// Dynamic (settings.requireLogin flips at runtime, so these are closures
// reading the settings snapshot per request, never static route wiring).
// The gate runs at preHandler — BEFORE any handler touches the render cache,
// so no gated bytes can leak through cached answers. HTML surfaces receive
// the sign-in status document; /api and /media surfaces receive 403 JSON.
// Existing 401 behavior for unauthenticated WRITES is untouched (the editor
// session-expiry toast depends on it).

import type { FastifyReply, FastifyRequest } from 'fastify'
import { validateSlug } from '../../shared/slug'
import type { AppSettings } from '../settings'

/** Mirrors the SSR catch-all's exemption: unmatched /api, /oidc and /assets
 *  wildcards answer JSON even on the HTML route. */
const JSON_PREFIXES = /^(api|oidc|assets)\//

function catchAllStar(req: FastifyRequest): string | undefined {
  return (req.params as { '*'?: string })['*']
}

/**
 * The sign-in link's returnTo, built ONLY from validated values: the raw
 * wildcard param is validated as a slug (invalid → '/'), static routes use
 * their fixed path. Never req.url verbatim — it is reflected into an href
 * of a document served to anonymous readers (no CSP).
 */
export function returnToFor(req: FastifyRequest): string {
  const star = catchAllStar(req)
  if (star === undefined) return req.url.split('?')[0] || '/'
  const validated = validateSlug(star)
  return validated.ok ? `/${validated.slug}` : '/'
}

export function requireLoginJson(getSettings: () => AppSettings) {
  return async function gate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (getSettings().requireLogin && !req.user) {
      await reply.code(403).header('cache-control', 'no-store').send({ error: 'login required' })
    }
  }
}

export function requireLoginHtml(deps: {
  getSettings: () => AppSettings
  /** Renders the 403 sign-in document for this request (async: Phase B's
   *  custom-page path fetches the designated page). */
  document: (req: FastifyRequest, returnTo: string) => Promise<string> | string
}) {
  return async function gate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!deps.getSettings().requireLogin || req.user) return
    const star = catchAllStar(req)
    if (typeof star === 'string' && JSON_PREFIXES.test(star)) return
    const html = await deps.document(req, returnToFor(req))
    await reply
      .code(403)
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .header('vary', 'Cookie')
      .send(html)
  }
}

/** Cache posture flip while the site is login-required: authenticated
 *  public-cache responses become shared-cache-hostile (`private` + Vary),
 *  so intermediaries never hold gated bytes on anonymous visitors' behalf. */
export function cacheControlFor(gated: boolean, publicDirective: string): string {
  return gated ? publicDirective.replace(/^public\b/, 'private') : publicDirective
}
