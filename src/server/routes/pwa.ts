// ─── GET /manifest.webmanifest, GET /sw.js ───────────────────────────────────
// Public, never gated by login-only mode: browsers fetch both without
// credentials, and they carry only the site name (already shown on the
// sign-in document) and bundled icon paths. Registered before the SSR
// catch-all (see render/pwa.ts for the rationale).

import type { FastifyInstance } from 'fastify'
import type { SettingsService } from '../settings'
import { MANIFEST_PATH, SERVICE_WORKER_PATH, SERVICE_WORKER_JS, buildManifest } from '../render/pwa'

export interface PwaDeps {
  settings: SettingsService
}

export async function registerPwaRoutes(app: FastifyInstance, deps: PwaDeps): Promise<void> {
  app.get(MANIFEST_PATH, async (_req, reply) => {
    reply.header('content-type', 'application/manifest+json; charset=utf-8')
    // Follows the siteName setting; short revalidating cache.
    reply.header('cache-control', 'public, max-age=300')
    return JSON.stringify(buildManifest(deps.settings.get().siteName))
  })

  app.get(SERVICE_WORKER_PATH, async (_req, reply) => {
    reply.header('content-type', 'text/javascript; charset=utf-8')
    // Browsers revalidate worker scripts regardless; no-cache keeps proxies honest.
    reply.header('cache-control', 'no-cache')
    return SERVICE_WORKER_JS
  })
}
