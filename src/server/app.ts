// ─── Fastify app factory ─────────────────────────────────────────────────────
// Composition root for tests (app.inject) and production listen.

import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { PagesRepository } from './db/repository'
import { registerSessions } from './auth/session'
import { registerAuthRoutes } from './auth/routes'
import { registerPageApiRoutes } from './routes/pages-api'
import { registerPageHtmlRoutes } from './routes/pages-html'
import { createRenderCache, INDEX_CACHE_KEY } from './cache'
import { createViewerRenderer } from './render/markdown'
import { renderLayout } from './render/layout'
import type { OidcRelyingParty } from './auth/oidc'

export interface AppDeps {
  config: ServerConfig
  pages: PagesRepository
  /** Pre-built OIDC relying party (constructed async in the bootstrap;
   *  tests inject a mock-backed one). Null when auth is disabled. */
  relyingParty?: OidcRelyingParty | null
  /** Notified after any successful write (SSR cache invalidation). */
  onPageWrite?: (slug: string) => void
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  app.decorate('worldnotes', deps)

  const cache = createRenderCache({
    maxEntries: deps.config.env.CACHE_MAX_ENTRIES,
    ttlMs: deps.config.env.CACHE_TTL_SECONDS * 1000,
  })
  const invalidate = (slug: string): void => {
    cache.invalidate(`p:${slug}`)
    cache.invalidate(INDEX_CACHE_KEY)
    deps.onPageWrite?.(slug)
  }

  await registerSessions(app, {
    secrets: deps.config.sessionSecrets,
    maxAgeSeconds: deps.config.env.SESSION_MAX_AGE_SECONDS,
    secure: deps.config.isProduction,
    authDisabled: deps.config.authDisabled,
  })

  await registerAuthRoutes(app, {
    config: deps.config,
    relyingParty: deps.relyingParty ?? null,
  })

  await registerPageApiRoutes(app, {
    pages: deps.pages,
    onWrite: invalidate,
  })

  // SSR catch-all registers LAST (after static/api/auth in step 9).
  await registerPageHtmlRoutes(app, {
    config: deps.config,
    pages: deps.pages,
    cache,
    render: createViewerRenderer(),
    layout: renderLayout,
  })

  app.get('/healthz', async () => ({ ok: true }))

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    worldnotes: AppDeps
  }
}
