// ─── Fastify app factory ─────────────────────────────────────────────────────
// Composition root for tests (app.inject) and production listen.

import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { PagesRepository } from './db/repository'
import { registerSessions } from './auth/session'
import { registerAuthRoutes } from './auth/routes'
import type { OidcRelyingParty } from './auth/oidc'

export interface AppDeps {
  config: ServerConfig
  pages: PagesRepository
  /** Pre-built OIDC relying party (constructed async in the bootstrap;
   *  tests inject a mock-backed one). Null when auth is disabled. */
  relyingParty?: OidcRelyingParty | null
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  app.decorate('worldnotes', deps)

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

  app.get('/healthz', async () => ({ ok: true }))

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    worldnotes: AppDeps
  }
}
