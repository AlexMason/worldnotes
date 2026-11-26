// ─── Media upload, serving & blind-icon routes ───────────────────────────────
// Multipart bodies are hand-built Buffers (inject takes raw payloads).

import { describe, it, expect, beforeEach } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { createMemoryMediaRepository } from '../db/media-memory'
import { seal } from '../auth/session'
import {
  pngBytes,
  pngBombBytes,
  pngChunk,
  ihdrData,
  buildPng,
  IDAT_DATA,
  JPEG_BYTES,
  GIF_BYTES,
  ICO_BYTES,
  SVG_BYTES,
} from './helpers/media-fixtures'
import {
  GIF_TRAILER,
  animatedGif,
  bytes as gifBytes,
  gifComment,
  gifFrame,
  gifHeader,
  GIF_GCE,
  GIF_NETSCAPE,
} from '../../shared/__tests__/gif-fixtures'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://idp.test',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

const BOUNDARY = 'wn-test-boundary-42'

function multipartBuf(buf: Buffer, filename = 'icon.png'): Buffer {
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`,
  )
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
  return Buffer.concat([head, buf, tail])
}

function multipartHeaders(): Record<string, string> {
  return { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` }
}

const iconsDir = mkdtempSync(join(tmpdir(), 'wn-icons-'))
writeFileSync(join(iconsDir, 'favicon.ico'), ICO_BYTES)
writeFileSync(join(iconsDir, 'apple-touch-icon.png'), pngBytes(180, 180))

describe('media routes', () => {
  let config: ServerConfig
  let mediaRepo: ReturnType<typeof createMemoryMediaRepository>
  let settingsRepo: ReturnType<typeof createMemorySettingsRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    mediaRepo = createMemoryMediaRepository()
    settingsRepo = createMemorySettingsRepository()
    app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: settingsRepo,
      media: mediaRepo,
      users: usersFixture(),
      relyingParty: null,
      bundledIconsDir: iconsDir,
    })
    auth =
      'wn_session=' +
      seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'user-1' }, config.sessionSecrets)
  })

  // ── Upload ───────────────────────────────────────────────────────────────

  it('requires auth and same-origin (no row is created for anonymous uploads)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), origin: 'https://evil.test' },
      payload: multipartBuf(pngBytes()),
    })
    expect(res.statusCode).toBe(403)
    const anon = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: multipartHeaders(),
      payload: multipartBuf(pngBytes()),
    })
    expect(anon.statusCode).toBe(401)
    expect(mediaRepo.dump()).toEqual([])
  })

  it('accepts a valid PNG upload and returns its immutable URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(pngBytes(64, 32)),
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ id: 1, url: '/media/1', mediaType: 'image/png', width: 64 })
    const row = await mediaRepo.get(1)
    expect(row!.data.subarray(0, 8)).toEqual(pngBytes(64, 32).subarray(0, 8))
  })

  it('accepts JPEG/GIF/ICO uploads', async () => {
    for (const buf of [JPEG_BYTES, GIF_BYTES, ICO_BYTES]) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/media',
        headers: { ...multipartHeaders(), cookie: auth },
        payload: multipartBuf(buf),
      })
      expect(res.statusCode).toBe(201)
    }
    expect(mediaRepo.dump().length).toBe(3)
  })

  it('rejects SVG / spoofed content-types (415) regardless of declared type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(SVG_BYTES),
    })
    expect(res.statusCode).toBe(415)
    expect(res.json().error).toMatch(/unsupported image: unsupported-type/)
  })

  it('rejects dimension-bomb headers with 415', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(pngBombBytes()),
    })
    expect(res.statusCode).toBe(415)
    expect(res.json().error).toMatch(/over-dimension/)
  })

  it('rejects requests without a file part (400)', async () => {
    const empty = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: Buffer.from(`--${BOUNDARY}--\r\n`),
    })
    expect(empty.statusCode).toBe(400)
  })

  it('rejects a text-field part (fields limit → 400, no row)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="alt"\r\n\r\nmy icon\r\n` +
          `--${BOUNDARY}--\r\n`,
      ),
    })
    expect(res.statusCode).toBe(400)
    expect(mediaRepo.dump()).toEqual([])
  })

  it('rejects non-multipart content types (415)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { sneaky: true },
    })
    expect(res.statusCode).toBe(415)
    expect(mediaRepo.dump()).toEqual([])
  })

  it('serves the first part only when a second file sneaks in', async () => {
    const twoFiles = Buffer.concat([
      multipartBuf(pngBytes(8, 8)),
      multipartBuf(Buffer.from('pretender')), // beyond the parts limit
    ])
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: twoFiles,
    })
    // The extra part is drained/discarded; at most one row results.
    expect([200, 201, 400, 415]).toContain(res.statusCode)
    expect(mediaRepo.dump().length).toBeLessThanOrEqual(1)
  })

  it('rejects oversize uploads with 413', async () => {
    // MEDIA_MAX_BYTES = 2 MiB; the file part alone exceeds it.
    const big = Buffer.concat([
      pngBytes().subarray(0, 8), // fake signature is fine — the limit trips first
      Buffer.alloc(3 * 1024 * 1024, 7),
    ])
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(big),
    })
    expect(res.statusCode).toBe(413)
    expect(mediaRepo.dump()).toEqual([])
  })

  // ── Immutable serving ────────────────────────────────────────────────────

  it('serves /media/{id} with immutable cache, etag, 304 and hardening headers', async () => {
    const up = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(pngBytes(32, 32)),
    })
    const { id, url } = up.json()

    const res = await app.inject({ method: 'GET', url })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/png')
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(res.headers.etag).toBe(`"m${id}"`)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['content-security-policy']).toBe("default-src 'none'")
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(Buffer.from(res.rawPayload).subarray(0, 8)).toEqual(pngBytes(32, 32).subarray(0, 8))

    const reval = await app.inject({
      method: 'GET',
      url,
      headers: { 'if-none-match': `"m${id}"` },
    })
    expect(reval.statusCode).toBe(304)
  })

  it('404s unknown / malformed media ids', async () => {
    for (const url of ['/media/999', '/media/abc', '/media/-2']) {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(404)
    }
  })

  // ── Blind browser icon requests ──────────────────────────────────────────

  it('/favicon.ico serves bundled bytes until an override is set', async () => {
    const before = await app.inject({ method: 'GET', url: '/favicon.ico' })
    expect(before.statusCode).toBe(200)
    expect(before.headers['content-type']).toBe('image/vnd.microsoft.icon')
    expect(before.headers['cache-control']).toBe('public, max-age=3600')

    const up = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(pngBytes(48, 48)),
    })
    const { id } = up.json()
    const set = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { faviconMediaId: id },
    })
    expect(set.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: '/favicon.ico' })
    expect(after.headers['content-type']).toBe('image/png')
    expect(Buffer.from(after.rawPayload).subarray(0, 8)).toEqual(pngBytes(48, 48).subarray(0, 8))
  })

  it('/favicon.ico self-heals to bundled bytes when the override row is gone', async () => {
    const up = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: auth },
      payload: multipartBuf(pngBytes(48, 48)),
    })
    const { id } = up.json()
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { faviconMediaId: id },
    })
    await mediaRepo.delete(id) // partial restore / manual surgery
    const res = await app.inject({ method: 'GET', url: '/favicon.ico' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/vnd.microsoft.icon')
  })

  it('/apple-touch-icon.png serves the bundled PNG', async () => {
    const res = await app.inject({ method: 'GET', url: '/apple-touch-icon.png' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/png')
  })

  it('/icons/* is served by the static mount (bundled set)', async () => {
    const res = await app.inject({ method: 'GET', url: '/icons/favicon-32x32.png' })
    // iconsDir only contains the two blind-request files; 404 is a miss, but
    // the mount must not 500 or fall through to the SSR catch-all HTML.
    expect([200, 404]).toContain(res.statusCode)
    expect(res.headers['content-type'] ?? '').not.toContain('text/html')
  })

  it('/favicon.ico 404s when the icons dir is absent and no override is set', async () => {
    const bare = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository(),
      media: createMemoryMediaRepository(),
      users: usersFixture(),
      relyingParty: null,
      bundledIconsDir: null,
    })
    const res = await bare.inject({ method: 'GET', url: '/favicon.ico' })
    expect(res.statusCode).toBe(404)
    await bare.close()
  })
})

describe('media roles & login-only gate', () => {
  const cookieFor = (config: ServerConfig, sub: string) =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub, name: sub }, config.sessionSecrets)

  it('viewer cannot upload (403) while editor can (201)', async () => {
    const config = loadConfig(baseEnv)
    const mediaRepo = createMemoryMediaRepository()
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository(),
      media: mediaRepo,
      users: usersFixture({ users: { writer: 'editor', peeker: 'viewer' } }),
      relyingParty: null,
    })
    const viewer = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: cookieFor(config, 'peeker') },
      payload: multipartBuf(pngBytes()),
    })
    expect(viewer.statusCode).toBe(403)
    const editor = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie: cookieFor(config, 'writer') },
      payload: multipartBuf(pngBytes()),
    })
    expect(editor.statusCode).toBe(201)
    await app.close()
  })

  it('login-only mode: anonymous /media is 403 JSON, authed is private; blind icons serve bundled bytes only to anonymous', async () => {
    const config = loadConfig(baseEnv)
    const mediaRepo = createMemoryMediaRepository()
    // Seed an override favicon row + settings pointing at it, gated app.
    const { id } = await mediaRepo.insert({
      mediaType: 'image/png',
      width: 1,
      height: 1,
      data: pngBytes(),
      by: 'boss',
    })
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository({
        require_login: 'true',
        favicon_media_id: String(id),
      }),
      media: mediaRepo,
      users: usersFixture({ users: { boss: 'admin' } }),
      relyingParty: null,
      bundledIconsDir: iconsDir,
    })

    const anonMedia = await app.inject({ method: 'GET', url: `/media/${id}` })
    expect(anonMedia.statusCode).toBe(403)
    expect(anonMedia.json()).toEqual({ error: 'login required' })

    const authedMedia = await app.inject({
      method: 'GET',
      url: `/media/${id}`,
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(authedMedia.statusCode).toBe(200)
    expect(authedMedia.headers['cache-control']).toContain('private')
    expect(authedMedia.headers['vary']).toBe('Cookie')

    // Blind icon: anonymous gets the BUNDLED ico bytes, never the override.
    const anonIcon = await app.inject({ method: 'GET', url: '/favicon.ico' })
    expect(anonIcon.statusCode).toBe(200)
    expect(Buffer.compare(anonIcon.rawPayload, ICO_BYTES)).toBe(0)

    const authedIcon = await app.inject({
      method: 'GET',
      url: '/favicon.ico',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(Buffer.compare(authedIcon.rawPayload, pngBytes())).toBe(0)
    await app.close()
  })
})

describe('POST /api/media/photos', () => {
  const iend = () => pngChunk('IEND', Buffer.alloc(0))
  const pngWithIdat = (idat: Buffer, extra: Buffer[] = [], w = 4, h = 3) =>
    buildPng([pngChunk('IHDR', ihdrData(w, h)), ...extra, pngChunk('IDAT', idat), iend()])

  async function setup(env: Record<string, string> = {}) {
    const config = loadConfig({ ...baseEnv, ...env })
    const mediaRepo = createMemoryMediaRepository()
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository(),
      media: mediaRepo,
      users: usersFixture(),
      relyingParty: null,
    })
    const cookie =
      'wn_session=' +
      seal({ exp: Math.floor(Date.now() / 1000) + 300, sub: 'user-1' }, config.sessionSecrets)
    const post = (payload: Buffer, headers: Record<string, string> = {}) =>
      app.inject({
        method: 'POST',
        url: '/api/media/photos',
        headers: { ...multipartHeaders(), cookie, ...headers },
        payload,
      })
    return { app, mediaRepo, post, cookie }
  }

  it('stores a PNG as image/png and serves it back from /media/{id}', async () => {
    const { app, mediaRepo, post } = await setup()
    const png = pngBytes(64, 32)
    const res = await post(multipartBuf(png, 'photo.png'))
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({
      id: 1,
      url: '/media/1',
      mediaType: 'image/png',
      sizeBytes: png.byteLength,
      width: 64,
      height: 32,
    })
    const row = await mediaRepo.get(1)
    expect(row).toMatchObject({ mediaType: 'image/png', width: 64, height: 32 })
    expect(row!.data.equals(png)).toBe(true)

    const served = await app.inject({ method: 'GET', url: '/media/1' })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toContain('image/png')
    expect(served.headers['cache-control']).toContain('immutable')
    await app.close()
  })

  it('strips metadata and trailing bytes before storing', async () => {
    const { app, mediaRepo, post } = await setup()
    const dirty = Buffer.concat([
      pngWithIdat(IDAT_DATA, [
        pngChunk('eXIf', Buffer.from('GPS-COORDS')),
        pngChunk('tEXt', Buffer.from('Comment\0private')),
      ]),
      Buffer.from('trailing-payload'),
    ])
    const res = await post(multipartBuf(dirty))
    expect(res.statusCode).toBe(201)
    const stored = (await mediaRepo.get(1))!.data
    expect(stored.includes(Buffer.from('GPS-COORDS'))).toBe(false)
    expect(stored.includes(Buffer.from('private'))).toBe(false)
    expect(stored.includes(Buffer.from('trailing-payload'))).toBe(false)
    expect(stored.equals(pngWithIdat(IDAT_DATA))).toBe(true)
    expect(res.json().sizeBytes).toBe(stored.byteLength)
    await app.close()
  })

  it('accepts a 3 MiB PNG although MEDIA_MAX_BYTES is 2 MiB (favicon route stays capped)', async () => {
    const { app, mediaRepo, post, cookie } = await setup()
    const big = pngWithIdat(Buffer.alloc(3 * 1024 * 1024, 7))
    const res = await post(multipartBuf(big))
    expect(res.statusCode).toBe(201)
    expect((await mediaRepo.get(1))!.data.byteLength).toBe(big.byteLength)

    const viaMedia = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { ...multipartHeaders(), cookie },
      payload: multipartBuf(big),
    })
    expect(viaMedia.statusCode).toBe(413)
    await app.close()
  })

  it('rejects a PNG over PHOTO_MAX_BYTES with 413 naming the limit', async () => {
    const { app, mediaRepo, post } = await setup({ PHOTO_MAX_BYTES: '1048576' })
    const res = await post(multipartBuf(pngWithIdat(Buffer.alloc(1024 * 1024 + 1024, 7))))
    expect(res.statusCode).toBe(413)
    expect(res.json().error).toBe('file exceeds the upload size limit (1 MiB)')
    expect(mediaRepo.dump()).toEqual([])
    await app.close()
  })

  it('requires auth and same-origin before the parser runs (no row created)', async () => {
    const { app, mediaRepo, post } = await setup()
    const crossOrigin = await post(multipartBuf(pngBytes()), { origin: 'https://evil.test' })
    expect(crossOrigin.statusCode).toBe(403)
    const anon = await app.inject({
      method: 'POST',
      url: '/api/media/photos',
      headers: multipartHeaders(),
      payload: multipartBuf(pngBytes()),
    })
    expect(anon.statusCode).toBe(401)
    expect(mediaRepo.dump()).toEqual([])
    await app.close()
  })

  it('rejects non-PNG/GIF bytes with 415 regardless of declared type', async () => {
    const { app, mediaRepo, post } = await setup()
    for (const bytes of [JPEG_BYTES, ICO_BYTES, SVG_BYTES, Buffer.from('plain text')]) {
      const res = await post(multipartBuf(bytes, 'photo.png'))
      expect(res.statusCode).toBe(415)
      expect(res.json()).toEqual({ error: 'expected a PNG or GIF image' })
    }
    expect(mediaRepo.dump()).toEqual([])
    await app.close()
  })

  describe('GIF', () => {
    const asBuffer = (u: Uint8Array) => Buffer.from(u)

    it('stores an animated GIF as image/gif and serves it back', async () => {
      const { app, mediaRepo, post } = await setup()
      const gif = asBuffer(animatedGif(3, 40, 30))
      const res = await post(multipartBuf(gif, 'giphy.gif'))
      expect(res.statusCode).toBe(201)
      expect(res.json()).toEqual({
        id: 1,
        url: '/media/1',
        mediaType: 'image/gif',
        sizeBytes: gif.byteLength,
        width: 40,
        height: 30,
      })
      expect(await mediaRepo.get(1)).toMatchObject({
        mediaType: 'image/gif',
        width: 40,
        height: 30,
      })

      const served = await app.inject({ method: 'GET', url: '/media/1' })
      expect(served.statusCode).toBe(200)
      expect(served.headers['content-type']).toContain('image/gif')
      expect(served.headers['cache-control']).toContain('immutable')
      expect(Buffer.compare(served.rawPayload, gif)).toBe(0)
      await app.close()
    })

    it('strips comments, XMP-style blocks and trailing bytes before storing', async () => {
      const { app, mediaRepo, post } = await setup()
      const dirty = Buffer.from(
        gifBytes(
          gifHeader(4, 4),
          gifComment('private-note'),
          GIF_NETSCAPE,
          GIF_GCE,
          gifFrame(4, 4),
          GIF_GCE,
          gifFrame(4, 4),
          GIF_TRAILER,
          Array.from(Buffer.from('trailing-payload')),
        ),
      )
      const res = await post(multipartBuf(dirty))
      expect(res.statusCode).toBe(201)
      const stored = (await mediaRepo.get(1))!.data
      expect(stored.includes(Buffer.from('private-note'))).toBe(false)
      expect(stored.includes(Buffer.from('trailing-payload'))).toBe(false)
      expect(stored.equals(asBuffer(animatedGif(2, 4, 4)))).toBe(true)
      expect(res.json().sizeBytes).toBe(stored.byteLength)
      await app.close()
    })

    it('applies PHOTO_MAX_BYTES to GIFs with the limit in the message', async () => {
      const { app, mediaRepo, post } = await setup({ PHOTO_MAX_BYTES: '1048576' })
      // Valid structure, padded past 1 MiB with comment blocks before the trailer.
      const pad = gifBytes(...Array.from({ length: 5000 }, () => gifComment('x'.repeat(250))))
      const big = Buffer.from(
        gifBytes(Array.from(animatedGif(1)).slice(0, -1), Array.from(pad), GIF_TRAILER),
      )
      expect(big.byteLength).toBeGreaterThan(1024 * 1024)
      const res = await post(multipartBuf(big))
      expect(res.statusCode).toBe(413)
      expect(res.json().error).toBe('file exceeds the upload size limit (1 MiB)')
      expect(mediaRepo.dump()).toEqual([])
      await app.close()
    })

    it('rejects invalid, oversized and over-long GIFs with 422', async () => {
      const { app, mediaRepo, post } = await setup()
      const truncated = asBuffer(animatedGif(2)).subarray(0, 30)
      const bad = await post(multipartBuf(truncated))
      expect(bad.statusCode).toBe(422)
      expect(bad.json()).toEqual({ error: 'invalid GIF' })

      const wide = await post(multipartBuf(asBuffer(animatedGif(1, 2049, 10))))
      expect(wide.statusCode).toBe(422)
      expect(wide.json()).toEqual({ error: 'image is larger than 2048 px on a side' })

      const long = await post(multipartBuf(asBuffer(animatedGif(501))))
      expect(long.statusCode).toBe(422)
      expect(long.json()).toEqual({ error: 'GIF has too many frames' })
      expect(mediaRepo.dump()).toEqual([])
      await app.close()
    })

    it('keeps requiring auth and same-origin for GIFs', async () => {
      const { app, mediaRepo, post } = await setup()
      const res = await post(multipartBuf(asBuffer(animatedGif(2))), {
        origin: 'https://evil.test',
      })
      expect(res.statusCode).toBe(403)
      expect(mediaRepo.dump()).toEqual([])
      await app.close()
    })
  })

  it('rejects malformed PNGs and oversized dimensions with 422', async () => {
    const { app, mediaRepo, post } = await setup()
    const corrupt = Buffer.from(pngBytes(4, 3))
    corrupt[corrupt.length - 20] ^= 0xff
    const bad = await post(multipartBuf(corrupt))
    expect(bad.statusCode).toBe(422)
    expect(bad.json()).toEqual({ error: 'invalid PNG' })

    for (const png of [pngBytes(2049, 10), pngBytes(10, 2049), pngBombBytes()]) {
      const res = await post(multipartBuf(png))
      expect(res.statusCode).toBe(422)
      expect(res.json()).toEqual({ error: 'image is larger than 2048 px on a side' })
    }
    expect(mediaRepo.dump()).toEqual([])
    await app.close()
  })

  it('rejects requests without a file part (400) and extra text fields', async () => {
    const { app, post } = await setup()
    const none = await post(Buffer.from(`--${BOUNDARY}--\r\n`))
    expect(none.statusCode).toBe(400)
    const field = await post(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="x"\r\n\r\nhi\r\n--${BOUNDARY}--\r\n`,
      ),
    )
    expect(field.statusCode).toBe(400)
    await app.close()
  })
})
