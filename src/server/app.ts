// ─── Fastify app factory ─────────────────────────────────────────────────────
// Composition root for tests (app.inject) and production listen.

import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { PagesRepository } from './db/repository'

export interface AppDeps {
  config: ServerConfig
  pages: PagesRepository
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  app.decorate('worldnotes', deps)

  app.get('/healthz', async () => ({ ok: true }))

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    worldnotes: AppDeps
  }
}
