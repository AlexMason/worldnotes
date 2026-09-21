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
  JPEG_BYTES,
  GIF_BYTES,
  ICO_BYTES,
  SVG_BYTES,
} from './helpers/media-fixtures'

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
