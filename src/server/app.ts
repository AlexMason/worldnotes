// ─── Fastify app factory ─────────────────────────────────────────────────────
// Composition root for tests (app.inject) and production listen.

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { ServerConfig } from './config'
import type { PagesRepository } from './db/repository'
import type { SettingsRepository } from './db/settings-repository'
import type { MediaRepository } from './db/media-repository'
import type { UsersRepository } from './db/users-repository'
import { createMemorySettingsRepository } from './db/settings-memory'
import { createMemoryMediaRepository } from './db/media-memory'
import { createMemoryUsersRepository } from './db/users-memory'
import { createSettingsService } from './settings'
import { registerSessions } from './auth/session'
import { registerRoleResolver } from './auth/roles'
import { registerAuthRoutes } from './auth/routes'
import { registerPageApiRoutes } from './routes/pages-api'
import { registerSettingsApiRoutes } from './routes/settings-api'
import { registerUsersApiRoutes } from './routes/users-api'
import { registerMediaRoutes } from './routes/media'
import { registerAdminRoutes } from './routes/admin'
import { registerPageHtmlRoutes } from './routes/pages-html'
import { registerEditRoutes } from './routes/edit'
import { createRenderCache, INDEX_CACHE_KEY } from './cache'
import { createNavLinksService } from './render/nav'
import { createReaderRenderer } from './render/reader'
import { renderLayout } from './render/layout'
import type { OidcRelyingParty } from './auth/oidc'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'
import { existsSync } from 'node:fs'

export interface AppDeps {
  config: ServerConfig
  pages: PagesRepository
  /** Instance settings store; defaults to an in-memory store in tests. */
  settings?: SettingsRepository
  /** Pre-built OIDC relying party (constructed async in the bootstrap; *
   *  tests inject a mock-backed one). Null when auth is disabled. */
  relyingParty?: OidcRelyingParty | null
  /** Notified after any successful write (SSR cache invalidation). */
  onPageWrite?: (slug: string) => void
  /** Directory holding the built client bundle (dist/client); absent in tests. */
  clientAssetsDir?: string | null
  /** Directory holding the bundled default icon set (public/icons). */
  bundledIconsDir?: string | null
  /** Uploaded-media store; defaults to an in-memory store in tests. */
  media?: MediaRepository
  /** Identity/role store. REQUIRED whenever auth is enabled — an
   *  authorization store that silently defaults to memory would make every
   *  promotion per-process and evaporate on restart. */
  users?: UsersRepository | null
  /** Fastify logger; omitted = silent (tests). Bootstrap passes real config. */
  logger?: FastifyServerOptions['logger']
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false })

  app.decorate('worldnotes', deps)

  const cache = createRenderCache({
    maxEntries: deps.config.env.CACHE_MAX_ENTRIES,
    ttlMs: deps.config.env.CACHE_TTL_SECONDS * 1000,
  })

  if (!deps.users && !deps.config.authDisabled) {
    throw new Error('buildApp: deps.users is required when auth is enabled')
  }
  const usersRepo =
    deps.users ??
    createMemoryUsersRepository({
      bootstrapAdminSubs: deps.config.bootstrapAdminSubs,
      defaultRole: deps.config.defaultRole,
    })

  await registerSessions(app, {
    secrets: deps.config.sessionSecrets,
    maxAgeSeconds: deps.config.env.SESSION_MAX_AGE_SECONDS,
    secure: deps.config.isProduction,
    authDisabled: deps.config.authDisabled,
  })

  // Single writer of req.user (claims + role). Must be registered after the
  // session parser hook and before any route guards can run.
  if (!deps.config.authDisabled) {
    await registerRoleResolver(app, { users: usersRepo })
  }

  await registerAuthRoutes(app, {
    config: deps.config,
    relyingParty: deps.relyingParty ?? null,
    users: deps.config.authDisabled ? null : usersRepo,
  })

  const settingsRepo = deps.settings ?? createMemorySettingsRepository()
  const settingsService = await createSettingsService(settingsRepo)
  const mediaRepo = deps.media ?? createMemoryMediaRepository()

  // Nav-page links: memoized over the shared render cache (a write to the
  // nav page is a chrome write — evicted by the same hook that busts the
  // article cache; a nav_slug change is self-busting via the key + settings
  // revision, which reader ETags already mix in).
  const navLinks = createNavLinksService({
    pages: deps.pages,
    settings: settingsService,
    cache,
  })

  const invalidate = (slug: string): void => {
    cache.invalidate(`p:${slug}`)
    cache.invalidate(INDEX_CACHE_KEY)
    navLinks.onPageWrite(slug)
    deps.onPageWrite?.(slug)
  }

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

  // Bundled default icon set (ships in the image). decorateReply MUST stay
  // false: @fastify/static is skip-override, so a second decorator of
  // reply.sendFile on the root instance would throw FST_ERR_DEC_ALREADY_PRESENT.
  // No immutable — filenames are stable across deploys while bytes change.
  const iconsDir = deps.bundledIconsDir ?? null
  const iconsMounted = iconsDir !== null && existsSync(iconsDir)
  if (iconsMounted) {
    await app.register(fastifyStatic, {
      root: iconsDir,
      prefix: '/icons/',
      immutable: false,
      maxAge: '1h',
      decorateReply: false,
    })
  }

  // Multipart upload parsing; per-request ceilings enforced here (the route
  // maps violations to 413/400). Guards run at onRequest, so an unauthenticated
  // caller never reaches this parser.
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: deps.config.env.MEDIA_MAX_BYTES,
      files: 1,
      fields: 0,
      parts: 1,
      headerPairs: 20,
    },
  })

  await registerSettingsApiRoutes(app, { settings: settingsService, media: mediaRepo })
  await registerUsersApiRoutes(app, { users: usersRepo })
  await registerAdminRoutes(app, {
    config: deps.config,
    settings: settingsService,
    media: mediaRepo,
    nav: navLinks,
  })
  await registerMediaRoutes(app, {
    media: mediaRepo,
    settings: settingsService,
    iconsDir: iconsMounted ? iconsDir : null,
  })

  await registerPageApiRoutes(app, {
    pages: deps.pages,
    getSettings: () => settingsService.get(),
    onWrite: invalidate,
  })

  await registerEditRoutes(app)

  // SSR catch-all registers LAST (after static/api/auth/edit).
  await registerPageHtmlRoutes(app, {
    config: deps.config,
    pages: deps.pages,
    cache,
    render: createReaderRenderer(),
    layout: renderLayout,
    assetPrefix: assetsMounted ? '/assets' : '',
    autosaveMs: deps.config.env.AUTOSAVE_DEBOUNCE_MS,
    getSettings: () => settingsService.get(),
    getSettingsRevision: () => settingsService.getRevision(),
    getNavLinks: () => navLinks.links(),
  })

  app.get('/healthz', async () => ({ ok: true }))

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    worldnotes: AppDeps
  }
}
