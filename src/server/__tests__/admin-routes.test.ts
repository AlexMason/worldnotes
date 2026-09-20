// ─── Admin settings route tests (memory repos, forged session cookies) ──────

import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { createMemoryMediaRepository } from '../db/media-memory'
import { seal } from '../auth/session'
import { pngBytes } from './helpers/media-fixtures'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://idp.test',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

function editorCookie(config: ServerConfig): string {
  return (
    'wn_session=' +
    seal(
      { exp: Math.floor(Date.now() / 1000) + 300, sub: 'user-1', email: 'e@x.test', name: 'E' },
      config.sessionSecrets,
    )
  )
}

describe('admin settings', () => {
  let config: ServerConfig
  let settingsRepo: ReturnType<typeof createMemorySettingsRepository>
  let mediaRepo: ReturnType<typeof createMemoryMediaRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    settingsRepo = createMemorySettingsRepository()
    mediaRepo = createMemoryMediaRepository()
    app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: settingsRepo,
      media: mediaRepo,
      relyingParty: null,
    })
    auth = editorCookie(config)
  })

  it('requires auth for GET /admin and PUT /api/settings', async () => {
    expect((await app.inject({ method: 'GET', url: '/admin' })).statusCode).toBe(401)
    expect(
      (await app.inject({ method: 'PUT', url: '/api/settings', payload: {} })).statusCode,
    ).toBe(401)
  })

  it('renders the admin form with the current settings', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: false, homeSlug: 'welcome' },
    })

    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Admin settings')
    expect(res.body).toContain('<input type="checkbox" name="searchEnabled">')
    expect(res.body).toContain('value="welcome"')
  })

  it('shows search enabled by default', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(res.body).toContain('<input type="checkbox" name="searchEnabled" checked>')
    expect(res.body).toContain('value=""')
  })

  it('PUT updates and persists settings', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: false, homeSlug: 'blog/intro' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      searchEnabled: false,
      homeSlug: 'blog/intro',
      allPagesEnabled: true,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
      faviconMediaId: null,
    })
    expect(settingsRepo.dump()).toEqual({
      search_enabled: 'false',
      home_slug: 'blog/intro',
      all_pages_enabled: 'true',
      site_name: 'WorldNotes',
      header_html: '',
      footer_html: '',
      favicon_media_id: '',
    })
  })

  it('renders branding fields and persists raw header/footer HTML', async () => {
    const put = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: {
        siteName: 'My Wiki',
        headerHtml: '<p> welcome <b>in</b></p>',
        footerHtml: '\n<p>foot</p>',
      },
    })
    expect(put.statusCode).toBe(200)
    expect(put.json()).toMatchObject({
      siteName: 'My Wiki',
      headerHtml: '<p> welcome <b>in</b></p>',
      footerHtml: '\n<p>foot</p>',
    })

    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(res.body).toContain('name="siteName"')
    expect(res.body).toContain('value="My Wiki"')
    // textarea values are escaped; the leading synthetic newline guards the
    // parser's newline-strip so the stored leading \n survives the round trip
    expect(res.body).toContain(
      'name="headerHtml" rows="4">\n&lt;p&gt; welcome &lt;b&gt;in&lt;/b&gt;&lt;/p&gt;</textarea>',
    )
    expect(res.body).toContain('name="footerHtml" rows="4">\n\n&lt;p&gt;foot&lt;/p&gt;</textarea>')
    // D1: bands are deliberately NOT rendered on /admin itself…
    expect(res.body).not.toContain('<div class="wn-site-header">')
    // …but the site name still decorates the admin chrome
    expect(res.body).toContain('<title>Admin settings — My Wiki</title>')
  })

  it('rejects oversized and non-string branding values with 400', async () => {
    const tooLong = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { siteName: 'x'.repeat(201) },
    })
    expect(tooLong.statusCode).toBe(400)
    expect(tooLong.json()).toMatchObject({ error: /exceeds 200/ })

    const wrongType = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { headerHtml: 42 },
    })
    expect(wrongType.statusCode).toBe(400)
    expect(wrongType.json()).toMatchObject({ error: /must be a string/ })
  })

  it('renders the all-pages checkbox and honours its state', async () => {
    const on = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(on.body).toContain('<input type="checkbox" name="allPagesEnabled" checked>')

    // Disabling without a home page is rejected with an explanatory error.
    const bad = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { allPagesEnabled: false, homeSlug: '' },
    })
    expect(bad.statusCode).toBe(400)
    expect(bad.json()).toMatchObject({ error: /home page is required/ })

    const ok = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { allPagesEnabled: false, homeSlug: 'welcome' },
    })
    expect(ok.statusCode).toBe(200)
    const off = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(off.body).toContain('<input type="checkbox" name="allPagesEnabled">')
    // The admin page chrome itself hides the "All pages" link when disabled.
    expect(off.body).not.toContain('href="/all"')
  })

  it('rejects invalid values with 400', async () => {
    const badSlug = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { homeSlug: 'Bad Slug' },
    })
    expect(badSlug.statusCode).toBe(400)

    const badBool = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { searchEnabled: 'yes' },
    })
    expect(badBool.statusCode).toBe(400)
  })

  describe('favicon override', () => {
    async function uploadPng(size = 32): Promise<number> {
      const boundary = 'wn-boundary'
      const file = pngBytes(size, size)
      const payload = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="i.png"\r\nContent-Type: image/png\r\n\r\n`,
        ),
        file,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ])
      const res = await app.inject({
        method: 'POST',
        url: '/api/media',
        headers: {
          cookie: auth,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      })
      expect(res.statusCode).toBe(201)
      return res.json().id
    }

    it('sets an override and rejects unknown ids', async () => {
      const id = await uploadPng()
      const bad = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: 9999 },
      })
      expect(bad.statusCode).toBe(400)
      expect(bad.json()).toMatchObject({ error: /unknown media id/ })

      const ok = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: id },
      })
      expect(ok.statusCode).toBe(200)
      expect(ok.json().faviconMediaId).toBe(id)
      expect(await mediaRepo.get(id)).not.toBeNull()
    })

    it('replacing and clearing the override delete the old row', async () => {
      const first = await uploadPng()
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: first },
      })
      const second = await uploadPng(64)
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: second },
      })
      expect(await mediaRepo.get(first)).toBeNull() // replaced → deleted
      expect(await mediaRepo.get(second)).not.toBeNull()

      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: null },
      })
      expect(await mediaRepo.get(second)).toBeNull() // cleared → deleted
    })

    it('the admin page shows the override, the upload control and the main form is independent', async () => {
      const id = await uploadPng()
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: id },
      })
      const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
      expect(res.body).toContain('Custom icon in use')
      expect(res.body).toContain(`src="/media/${id}"`)
      expect(res.body).toContain('id="wn-icon-upload"')
      expect(res.body).toContain('id="wn-icon-remove"')
      expect(res.body).toContain('faviconMediaId') // icon script present
    })

    it('a dangling override (row lost after being set) surfaces a recovery note', async () => {
      const id = await uploadPng()
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: auth, 'content-type': 'application/json' },
        payload: { faviconMediaId: id },
      })
      // Simulate a partial restore / manual DB surgery: the setting survives,
      // the row doesn't. The admin page must name the state, not 500.
      await mediaRepo.delete(id)
      const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
      expect(res.statusCode).toBe(200)
      expect(res.body).toContain('which is missing')
    })
  })
})
