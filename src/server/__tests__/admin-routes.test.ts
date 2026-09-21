// ─── Admin settings route tests (memory repos, forged session cookies) ──────

import { describe, it, expect, beforeEach } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
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
      users: usersFixture(),
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

  it('renders the nav-page field and persists navSlug round-trip', async () => {
    const empty = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(empty.body).toContain('name="navSlug"')
    expect(empty.body).toContain('Nav page')

    const put = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { navSlug: 'navigation' },
    })
    expect(put.statusCode).toBe(200)
    expect(put.json()).toMatchObject({ navSlug: 'navigation' })

    const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    // The missing nav page must not fail silently — the form names the state.
    expect(res.body).toContain('No nav links found on')
    const value = res.body.match(/name="navSlug" value="([^"]*)"/)
    expect(value?.[1]).toBe('navigation')

    const bad = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { navSlug: 'Bad Slug' },
    })
    expect(bad.statusCode).toBe(400)
    expect((bad.json() as { error: string }).error).toContain('invalid nav slug')
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
      navSlug: null,
      allPagesEnabled: true,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
      faviconMediaId: null,
      requireLogin: false,
      notFoundSlug: null,
      forbiddenSlug: null,
    })
    expect(settingsRepo.dump()).toEqual({
      search_enabled: 'false',
      home_slug: 'blog/intro',
      nav_slug: '',
      all_pages_enabled: 'true',
      site_name: 'WorldNotes',
      header_html: '',
      footer_html: '',
      favicon_media_id: '',
      require_login: 'false',
      not_found_slug: '',
      forbidden_slug: '',
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
    expect((tooLong.json() as { error: string }).error).toContain('exceeds 200')

    const wrongType = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { headerHtml: 42 },
    })
    expect(wrongType.statusCode).toBe(400)
    expect((wrongType.json() as { error: string }).error).toContain('must be a string')
  })

  it('renders the all-pages checkbox and honours its state', async () => {
    const on = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: auth } })
    expect(on.body).toContain('<input type="checkbox" name="allPagesEnabled" checked>')

    // Disabling without a home page is rejected with an explanatory error.
    // (homeSlug '' clears the field on the write path — the service then
    // refuses an index-less site with no landing page.)
    const bad = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: auth, 'content-type': 'application/json' },
      payload: { allPagesEnabled: false, homeSlug: '' },
    })
    expect(bad.statusCode).toBe(400)
    expect((bad.json() as { error: string }).error).toContain('home page is required')

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
      expect((bad.json() as { error: string }).error).toContain('unknown media id')

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

describe('admin page roles & users section', () => {
  const cookieFor = (config: ServerConfig, sub: string) =>
    'wn_session=' +
    seal({ exp: Math.floor(Date.now() / 1000) + 300, sub, name: sub }, config.sessionSecrets)

  async function make(users: Record<string, 'viewer' | 'editor' | 'admin'>) {
    const config = loadConfig(baseEnv)
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository(),
      media: createMemoryMediaRepository(),
      users: usersFixture({ users }),
      relyingParty: null,
    })
    return { config, app }
  }

  it('names a dangling status-page designation on the form', async () => {
    const config = loadConfig(baseEnv)
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository({
        not_found_slug: 'gone',
        forbidden_slug: 'restricted',
      }),
      media: createMemoryMediaRepository(),
      users: usersFixture({ users: { boss: 'admin' } }),
      relyingParty: null,
    })
    // Neither designated page exists yet → both named; then create one →
    // its note disappears.
    const first = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(first.body).toContain('404 page \u201cgone\u201d does not exist yet')
    expect(first.body).toContain('403 page \u201crestricted\u201d does not exist yet')
    const repo = createMemoryPagesRepository()
    await repo.put('gone', { title: 'Gone', content: 'x' })
    const second = await buildApp({
      config,
      pages: repo,
      settings: createMemorySettingsRepository({
        not_found_slug: 'gone',
        forbidden_slug: 'restricted',
      }),
      media: createMemoryMediaRepository(),
      users: usersFixture({ users: { boss: 'admin' } }),
      relyingParty: null,
    })
    const again = await second.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(again.body).not.toContain('\u201cgone\u201d does not exist yet')
    expect(again.body).toContain('\u201crestricted\u201d does not exist yet')
    await app.close()
    await second.close()
  })

  it('authenticated viewer gets an HTML 403 document, not a JSON blob', async () => {
    const { config, app } = await make({ boss: 'admin', peeker: 'viewer' })
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'peeker') },
    })
    expect(res.statusCode).toBe(403)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('Forbidden')
    expect(res.body).not.toContain('id="wn-admin-form"') // no settings form DOM
    await app.close()
  })

  it('editor also 403s; admin renders the form', async () => {
    const { config, app } = await make({ boss: 'admin', writer: 'editor' })
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin',
          headers: { cookie: cookieFor(config, 'writer') },
        })
      ).statusCode,
    ).toBe(403)
    const admin = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(admin.statusCode).toBe(200)
    expect(admin.body).toContain('wn-admin-form')
    await app.close()
  })

  it('renders the Access fieldset with login-only and status-page controls', async () => {
    const { config, app } = await make({ boss: 'admin' })
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(res.body).toContain('name="requireLogin"')
    expect(res.body).toContain('name="notFoundSlug"')
    expect(res.body).toContain('name="forbiddenSlug"')
    expect(res.body).toContain('served to every visitor')
    await app.close()
  })

  it('lists users with escaped IdP-controlled fields and marks the current admin', async () => {
    const users = usersFixture()
    await users.recordLogin('boss', { email: 'boss@x.test', name: 'Boss' })
    await users.recordLogin('<img src=x onerror=alert(1)>', {
      email: 'evil@x.test',
      name: '<script>alert(2)</script>',
    })
    const config = loadConfig(baseEnv)
    const app = await buildApp({
      config,
      pages: createMemoryPagesRepository(),
      settings: createMemorySettingsRepository(),
      media: createMemoryMediaRepository(),
      users,
      relyingParty: null,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: cookieFor(config, 'boss') },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<h2>Users</h2>')
    expect(res.body).toContain('(you)')
    // Stored-XSS-to-admin sink: IdP fields must arrive escaped.
    expect(res.body).not.toContain('<script>alert(2)</script>')
    expect(res.body).toContain('&lt;script&gt;alert(2)&lt;/script&gt;')
    expect(res.body).not.toContain('<img src=x onerror=alert(1)>')
    await app.close()
  })
})
