// ─── Media upload & serving ──────────────────────────────────────────────────
// POST /api/media stores uploaded images as received (favicon overrides);
// POST /api/media/photos stores editor photos: the browser has already
// downscaled and converted them to PNG (or kept an animated GIF as is), and
// the server structurally validates and metadata-strips either one
// (png-sanitize.ts, shared/gif.ts) instead of trusting it. Rows
// are immutable and addressed by id — /media/{id} is cacheable forever;
// replacing an image is a new upload. The two blind-request routes
// (/favicon.ico, /apple-touch-icon.png) resolve the current favicon at
// request time: override row when set and healthy, bundled file from disk
// otherwise (deliberately not reply.sendFile: that decorator only exists when
// the /assets/ static mount registered, and tests run without a built bundle).

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireRole, requireSameOrigin } from '../auth/session'
import { cacheControlFor, requireLoginJson } from '../auth/login-gate'
import type { MediaRepository } from '../db/media-repository'
import type { SettingsService } from '../settings'
import { probeMedia } from '../media-types'
import { sanitizePng } from '../png-sanitize'
import { sanitizeGif } from '../../shared/gif'
import { PHOTO_MAX_SIDE } from '../../shared/media-policy'

export interface MediaDeps {
  media: MediaRepository
  settings: SettingsService
  /** Directory holding the bundled default icon set; null = not present. */
  iconsDir: string | null
  /** Raw-upload ceiling for POST /api/media/photos (the converted PNG/GIF). */
  photoMaxBytes: number
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

/** 413 text; a per-request ceiling is named so the browser can show it. */
function tooLargeMessage(limit?: number): string {
  if (limit === undefined) return 'file exceeds the upload size limit'
  return `file exceeds the upload size limit (${Number((limit / 1_048_576).toFixed(1))} MiB)`
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
  const { media, settings, iconsDir, photoMaxBytes } = deps
  const {
    RequestFileTooLargeError,
    FilesLimitError,
    PartsLimitError,
    FieldsLimitError,
    InvalidMultipartContentTypeError,
  } = app.multipartErrors

  /** Map multipart limit/format errors to 4xx; returns null when not one.
   *  `limit` (a per-request ceiling) is named in the 413 message. */
  function limitError(e: unknown, limit?: number): { code: number; message: string } | null {
    if (e instanceof RequestFileTooLargeError) {
      return { code: 413, message: tooLargeMessage(limit) }
    }
    if (e instanceof InvalidMultipartContentTypeError)
      return { code: 415, message: 'expected multipart/form-data' }
    if (e instanceof FilesLimitError)
      return { code: 400, message: 'exactly one file part is allowed' }
    if (e instanceof PartsLimitError)
      return { code: 400, message: 'unexpected extra multipart parts' }
    if (e instanceof FieldsLimitError) return { code: 400, message: 'text fields are not accepted' }
    return null
  }

  /**
   * Read exactly one multipart file part into memory. On any limit/format
   * problem the error reply is already sent and null is returned.
   * `fileSizeLimit` overrides the global multipart ceiling for THIS request
   * only (@fastify/multipart deep-merges per-call limits over the registered
   * ones, so files/parts/fields stay capped).
   */
  async function readUpload(
    req: FastifyRequest,
    reply: FastifyReply,
    fileSizeLimit?: number,
  ): Promise<Buffer | null> {
    const fail = (code: number, error: string): null => {
      void reply.code(code).send({ error })
      return null
    }

    let part
    try {
      part = await req.file(
        fileSizeLimit === undefined ? undefined : { limits: { fileSize: fileSizeLimit } },
      )
    } catch (e) {
      const mapped = limitError(e, fileSizeLimit) ?? {
        code: 400,
        message: 'malformed multipart request',
      }
      if (mapped.code === 400 && !(e instanceof Error && /malformed/i.test(e.message))) {
        req.log.warn({ err: e }, 'media upload rejected')
      }
      return fail(mapped.code, mapped.message)
    }
    if (!part) return fail(400, 'a file part is required')

    let buf: Buffer
    try {
      buf = await part.toBuffer()
    } catch (e) {
      const mapped = limitError(e, fileSizeLimit) ?? {
        code: 400,
        message: 'could not read upload',
      }
      return fail(mapped.code, mapped.message)
    }
    if (part.file.truncated) return fail(413, tooLargeMessage(fileSizeLimit))
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
    return buf
  }

  // ── Upload (auth + same-origin BEFORE parsing: onRequest, not preHandler —
  //    an anonymous caller must not be able to drive busboy at all) ─────────

  app.post(
    '/api/media',
    { onRequest: [requireSameOrigin, requireRole('editor', 'admin')] },
    async (req, reply) => {
      const buf = await readUpload(req, reply)
      if (!buf) return reply

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
    },
  )

  // ── Photo upload: PNG or GIF, sanitized, capped by PHOTO_MAX_BYTES ───────
  // Same guards as /api/media (auth + same-origin run at onRequest, before
  // the multipart parser). The size ceiling is per request, so the favicon
  // route keeps its 2 MiB cap. The type comes from magic bytes only: a PNG
  // signature -> sanitizePng, GIF87a/GIF89a -> sanitizeGif, else 415.

  const tooLarge = `image is larger than ${PHOTO_MAX_SIDE} px on a side`

  app.post(
    '/api/media/photos',
    { onRequest: [requireSameOrigin, requireRole('editor', 'admin')] },
    async (req, reply) => {
      const buf = await readUpload(req, reply, photoMaxBytes)
      if (!buf) return reply

      let mediaType: 'image/png' | 'image/gif'
      let data: Buffer
      let width: number
      let height: number

      const png = sanitizePng(buf)
      if (png.ok) {
        mediaType = 'image/png'
        data = png.png
        ;({ width, height } = png)
      } else if (png.reason === 'over-dimension') {
        return reply.code(422).send({ error: tooLarge })
      } else if (png.reason === 'invalid-png') {
        return reply.code(422).send({ error: 'invalid PNG' })
      } else {
        const gif = sanitizeGif(buf)
        if (!gif.ok) {
          switch (gif.reason) {
            case 'not-gif':
              return reply.code(415).send({ error: 'expected a PNG or GIF image' })
            case 'over-dimension':
              return reply.code(422).send({ error: tooLarge })
            case 'too-many-frames':
              return reply.code(422).send({ error: 'GIF has too many frames' })
            case 'invalid-gif':
              return reply.code(422).send({ error: 'invalid GIF' })
          }
        }
        mediaType = 'image/gif'
        data = Buffer.from(gif.gif.buffer, gif.gif.byteOffset, gif.gif.byteLength)
        ;({ width, height } = gif)
      }

      const { id } = await media.insert({
        mediaType,
        width,
        height,
        data,
        by: req.user?.sub ?? null,
      })
      return reply.code(201).send({
        id,
        url: `/media/${id}`,
        mediaType,
        sizeBytes: data.byteLength,
        width,
        height,
      })
    },
  )

  // ── Immutable serving ────────────────────────────────────────────────────

  app.get(
    '/media/:id',
    { preHandler: [requireLoginJson(() => settings.get())] },
    async (req, reply) => {
      const raw = (req.params as { id: string }).id
      const id = Number(raw)
      if (!Number.isInteger(id) || id < 1) return reply.code(404).send({ error: 'not found' })
      const row = await media.get(id)
      if (!row) return reply.code(404).send({ error: 'not found' })
      // Login-only mode: authenticated fetches become private (immutable
      // public bytes would outlive any later gate — already-cached copies
      // are un-retractable; the going-forward `private` flip plus the gate
      // itself (ids are sequential bigserials) is the honest posture).
      const gated = settings.get().requireLogin
      if (gated) reply.header('vary', 'Cookie')
      return sendBytes(
        reply,
        req,
        row.data,
        row.mediaType,
        `"m${row.id}"`,
        cacheControlFor(gated, 'public, max-age=31536000, immutable'),
      )
    },
  )

  // ── Blind browser icon requests ──────────────────────────────────────────
  // These URLs are mutable (they follow settings), so: revalidable short
  // cache, no immutable, no ETag (worst-case ≤1h staleness after a change;
  // browsers that parse <link> tags see changes immediately from fresh HTML).

  async function serveIcon(
    path: string,
    allowOverride: boolean,
  ): Promise<{ contentType: string; data: Buffer } | null> {
    const faviconId = allowOverride ? settings.get().faviconMediaId : null
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
      // One principle while login-only: uploaded bytes never reach anonymous
      // requests — blind icon routes serve bundled (public) assets instead.
      const icon = await serveIcon(path, !settings.get().requireLogin || !!req.user)
      if (!icon) return reply.code(404).send({ error: 'not found' })
      return sendBytes(reply, req, icon.data, icon.contentType, null, 'public, max-age=3600')
    })
  }
}
