// ─── Fastify app factory ─────────────────────────────────────────────────────
// Composition root for tests (app.inject) and production listen.

import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { PagesRepository } from './db/repository'
import { registerSessions } from './auth/session'
import { registerAuthRoutes } from './auth/routes'
import { registerPageApiRoutes } from './routes/pages-api'
import { registerPageHtmlRoutes } from './routes/pages-html'
import { registerEditRoutes } from './routes/edit'
import { createRenderCache, INDEX_CACHE_KEY } from './cache'
import { createViewerRenderer } from './render/markdown'
import { renderLayout } from './render/layout'
import type { OidcRelyingParty } from './auth/oidc'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'

export interface AppDeps {
  config: ServerConfig
  pages: PagesRepository
  /** Pre-built OIDC relying party (constructed async in the bootstrap; *
   *  tests inject a mock-backed one). Null when auth is disabled. */
  relyingParty?: OidcRelyingParty | null
  /** Notified after any successful write (SSR cache invalidation). */
  onPageWrite?: (slug: string) => void
  /** Directory holding the built client bundle (dist/client); absent in tests. */
  clientAssetsDir?: string | null
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

  // Client bundle assets (present once `vite build` ran; skipped in tests)
  const assetsDir = deps.clientAssetsDir ?? null
  const assetsMounted = assetsDir !== null && existsSync(assetsDir)
  if (assetsMounted) {
    await app.register(fastifyStatic, {
      root: assetsDir,
      prefix: '/assets/',
      immutable: true,
      maxAge: '1h',
    })
  }

  await registerEditRoutes(app, {
    assetPrefix: assetsMounted ? '/assets' : '',
    autosaveMs: deps.config.env.AUTOSAVE_DEBOUNCE_MS,
  })

  // SSR catch-all registers LAST (after static/api/auth/edit).
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
