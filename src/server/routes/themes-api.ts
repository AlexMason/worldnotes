// ─── Themes API (admin only) ─────────────────────────────────────────────────
// CRUD for the theme gallery: admin-authored CSS stylesheets appended after
// the default stylesheet on the reader and editor. ADMIN ONLY + same-origin
// on writes (mirrors /api/settings): theme CSS is raw and admin-trusted, so
// the write surface is a site privilege boundary. Activation is NOT here — the
// pointer is the `activeThemeId` setting (PUT /api/settings), so it rides the
// same revision/ETag bump as every other chrome change.
//
// GET   /api/themes         → { themes, activeThemeId }
// POST  /api/themes         → 201 theme            (name, css required)
// GET   /api/themes/:id     → theme
// PUT   /api/themes/:id     → theme                (partial)
// DELETE /api/themes/:id    → 204 | 409 when the theme is active

import type { FastifyInstance, FastifyReply } from 'fastify'
import { requireRole, requireSameOrigin } from '../auth/session'
import { ThemeNameTakenError } from '../db/themes-repository'
import type { SettingsService } from '../settings'
import {
  ThemeActiveError,
  ThemeValidationError,
  type ThemeFieldsInput,
  type ThemeService,
} from '../themes'

export interface ThemesApiDeps {
  themes: ThemeService
  settings: SettingsService
}

/** Path ids are decimal positive integers only (no `1e3`, `0x1`, ` 1`). */
function parseId(raw: string): number | null {
  if (!/^[1-9]\d{0,15}$/.test(raw)) return null
  return Number(raw)
}

function bodyFields(body: unknown): ThemeFieldsInput | null {
  if (body === undefined || body === null) return {}
  if (typeof body !== 'object' || Array.isArray(body)) return null
  return body
}

export async function registerThemesApiRoutes(
  app: FastifyInstance,
  deps: ThemesApiDeps,
): Promise<void> {
  const { themes, settings } = deps
  const admin = requireRole('admin')

  /** Service failures with operator-facing messages → 4xx; the rest → 500
   *  without leaking driver internals. */
  function fail(reply: FastifyReply, e: unknown, log: { error(o: object, m: string): void }) {
    if (e instanceof ThemeValidationError) return reply.code(400).send({ error: e.message })
    if (e instanceof ThemeNameTakenError || e instanceof ThemeActiveError) {
      return reply.code(409).send({ error: e.message })
    }
    log.error({ err: e }, 'theme request failed')
    return reply.code(500).send({ error: 'theme request failed' })
  }

  app.get('/api/themes', { preHandler: [admin] }, async (_req, reply) => {
    return reply
      .header('cache-control', 'no-store')
      .send({ themes: await themes.list(), activeThemeId: settings.get().activeThemeId })
  })

  app.get<{ Params: { id: string } }>(
    '/api/themes/:id',
    { preHandler: [admin] },
    async (req, reply) => {
      const id = parseId(req.params.id)
      if (id === null) return reply.code(400).send({ error: 'invalid theme id' })
      const theme = await themes.get(id)
      if (!theme) return reply.code(404).send({ error: 'theme not found' })
      return reply.header('cache-control', 'no-store').send(theme)
    },
  )

  app.post('/api/themes', { preHandler: [admin, requireSameOrigin] }, async (req, reply) => {
    const fields = bodyFields(req.body)
    if (!fields) return reply.code(400).send({ error: 'body must be a JSON object' })
    try {
      const theme = await themes.create(fields, req.user?.sub ?? null)
      return reply.code(201).send(theme)
    } catch (e) {
      return fail(reply, e, req.log)
    }
  })

  app.put<{ Params: { id: string } }>(
    '/api/themes/:id',
    { preHandler: [admin, requireSameOrigin] },
    async (req, reply) => {
      const id = parseId(req.params.id)
      if (id === null) return reply.code(400).send({ error: 'invalid theme id' })
      const fields = bodyFields(req.body)
      if (!fields) return reply.code(400).send({ error: 'body must be a JSON object' })
      try {
        const theme = await themes.update(id, fields, req.user?.sub ?? null)
        if (!theme) return reply.code(404).send({ error: 'theme not found' })
        return theme
      } catch (e) {
        return fail(reply, e, req.log)
      }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/themes/:id',
    { preHandler: [admin, requireSameOrigin] },
    async (req, reply) => {
      const id = parseId(req.params.id)
      if (id === null) return reply.code(400).send({ error: 'invalid theme id' })
      try {
        if (!(await themes.remove(id))) return reply.code(404).send({ error: 'theme not found' })
        return reply.code(204).send()
      } catch (e) {
        return fail(reply, e, req.log)
      }
    },
  )
}
