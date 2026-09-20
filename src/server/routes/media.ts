// ─── Media upload & serving ──────────────────────────────────────────────────
// POST /api/media stores uploaded images (favicon overrides today; editor-
// inserted images are the planned next consumer). Rows are immutable and
// addressed by id — /media/{id} is cacheable forever; replacing an image is
// a new upload. The two blind-request routes (/favicon.ico,
// /apple-touch-icon.png) resolve the current favicon at request time:
// override row when set and healthy, bundled file from disk otherwise
// (deliberately not reply.sendFile: that decorator only exists when the
// /assets/ static mount registered, and tests run without a built bundle).

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAuth, requireSameOrigin } from '../auth/session'
import type { MediaRepository } from '../db/media-repository'
import type { SettingsService } from '../settings'
import { probeMedia } from '../media-types'

export interface MediaDeps {
  media: MediaRepository
  settings: SettingsService
  /** Directory holding the bundled default icon set; null = not present. */
  iconsDir: string | null
}

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'",
  'x-frame-options': 'DENY',
}

const BUNDLED_FILES: Record<string, { file: string; contentType: string }> = {
  '/favicon.ico': { file: 'favicon.ico', contentType: 'image/vnd.microsoft.icon' },
  '/apple-touch-icon.png': { file: 'apple-touch-icon.png', contentType: 'image/png' },
}

function sendBytes(
  reply: FastifyReply,
  req: FastifyRequest,
  body: Buffer,
  contentType: string,
  etag: string | null,
  cacheControl: string,
): FastifyReply {
  if (etag && req.headers['if-none-match'] === etag) return reply.code(304).send()
  reply.header('content-type', contentType)
  reply.header('content-length', String(body.byteLength))
  reply.header('cache-control', cacheControl)
  if (etag) reply.header('etag', etag)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) reply.header(k, v)
  return reply.send(body)
}

export async function registerMediaRoutes(app: FastifyInstance, deps: MediaDeps): Promise<void> {
  const { media, settings, iconsDir } = deps
  const {
    RequestFileTooLargeError,
    FilesLimitError,
    PartsLimitError,
    FieldsLimitError,
    InvalidMultipartContentTypeError,
  } = app.multipartErrors

  /** Map multipart limit/format errors to 4xx; returns null when not one. */
  function limitError(e: unknown): { code: number; message: string } | null {
    if (e instanceof RequestFileTooLargeError)
      return { code: 413, message: 'file exceeds the upload size limit' }
    if (e instanceof InvalidMultipartContentTypeError)
      return { code: 415, message: 'expected multipart/form-data' }
    if (e instanceof FilesLimitError)
      return { code: 400, message: 'exactly one file part is allowed' }
    if (e instanceof PartsLimitError)
      return { code: 400, message: 'unexpected extra multipart parts' }
    if (e instanceof FieldsLimitError) return { code: 400, message: 'text fields are not accepted' }
    return null
  }

  // ── Upload (auth + same-origin BEFORE parsing: onRequest, not preHandler —
  //    an anonymous caller must not be able to drive busboy at all) ─────────

  app.post('/api/media', { onRequest: [requireSameOrigin, requireAuth] }, async (req, reply) => {
    let part
    try {
      part = await req.file()
    } catch (e) {
      const mapped = limitError(e) ?? { code: 400, message: 'malformed multipart request' }
      if (mapped.code === 400 && !(e instanceof Error && /malformed/i.test(e.message))) {
        req.log.warn({ err: e }, 'media upload rejected')
      }
      return reply.code(mapped.code).send({ error: mapped.message })
    }
    if (!part) return reply.code(400).send({ error: 'a file part is required' })

    let buf: Buffer
    try {
      buf = await part.toBuffer()
    } catch (e) {
      const mapped = limitError(e) ?? { code: 400, message: 'could not read upload' }
      return reply.code(mapped.code).send({ error: mapped.message })
    }
    if (part.file.truncated) {
      return reply.code(413).send({ error: 'file exceeds the upload size limit' })
    }
    // Drain any extra parts so busboy can finish the request cleanly.
    try {
      while (true) {
        const extra = await req.file()
        if (!extra) break
        await extra.toBuffer().catch(() => undefined)
      }
    } catch {
      /* limit errors on extras are fine — the single-part rule below wins */
    }

    const probed = probeMedia(buf)
    if (!probed.ok) {
      return reply.code(415).send({ error: `unsupported image: ${probed.reason}` })
    }

    const { id } = await media.insert({
      mediaType: probed.media.mediaType,
      width: probed.media.width,
      height: probed.media.height,
      data: buf,
      by: req.user?.sub ?? null,
    })
    return reply.code(201).send({
      id,
      url: `/media/${id}`,
      mediaType: probed.media.mediaType,
      sizeBytes: buf.byteLength,
      width: probed.media.width,
      height: probed.media.height,
    })
  })

  // ── Immutable serving ────────────────────────────────────────────────────

  app.get('/media/:id', async (req, reply) => {
    const raw = (req.params as { id: string }).id
    const id = Number(raw)
    if (!Number.isInteger(id) || id < 1) return reply.code(404).send({ error: 'not found' })
    const row = await media.get(id)
    if (!row) return reply.code(404).send({ error: 'not found' })
    return sendBytes(
      reply,
      req,
      row.data,
      row.mediaType,
      `"m${row.id}"`,
      'public, max-age=31536000, immutable',
    )
  })

  // ── Blind browser icon requests ──────────────────────────────────────────
  // These URLs are mutable (they follow settings), so: revalidable short
  // cache, no immutable, no ETag (worst-case ≤1h staleness after a change;
  // browsers that parse <link> tags see changes immediately from fresh HTML).

  async function serveIcon(path: string): Promise<{ contentType: string; data: Buffer } | null> {
    const faviconId = settings.get().faviconMediaId
    if (faviconId !== null) {
      const row = await media.get(faviconId)
      if (row) return { contentType: row.mediaType, data: row.data }
      // Dangling override (crashed two-step / partial restore): self-heal to
      // bundled bytes so the blind path never dead-ends.
    }
    const bundled = BUNDLED_FILES[path]
    if (!iconsDir || !bundled || !existsSync(join(iconsDir, bundled.file))) return null
    return { contentType: bundled.contentType, data: await readFile(join(iconsDir, bundled.file)) }
  }

  for (const path of Object.keys(BUNDLED_FILES)) {
    app.get(path, async (req, reply) => {
      const icon = await serveIcon(path)
      if (!icon) return reply.code(404).send({ error: 'not found' })
      return sendBytes(reply, req, icon.data, icon.contentType, null, 'public, max-age=3600')
    })
  }
}
