// ─── Theme gallery: API authz/validation, render pipeline, preview ──────────
// Memory repos + forged session cookies. Exercises the whole path an admin
// takes (create → activate → reader/editor/admin output → delete guard).

import type { FastifyInstance } from 'fastify'
import type { PagesRepository } from '../db/repository'
import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { createMemoryThemesRepository } from '../db/themes-memory'
import { seal } from '../auth/session'
import { THEME_CSS_MAX } from '../themes'
import { usersFixture } from './helpers/users-fixture'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://x/y',
  OIDC_ISSUER: 'https://idp.test',
  OIDC_CLIENT_ID: 'wn',
  OIDC_CLIENT_SECRET: 's3cr3t-value-xxxxxxxxxxxxxxxxxxxxxx',
  OIDC_REDIRECT_URL: 'http://localhost:3000/oidc/callback',
  SESSION_SECRETS: 'a'.repeat(32),
}

function cookie(config: ServerConfig, sub: string): string {
  return (
    'wn_session=' +
    seal(
      { exp: Math.floor(Date.now() / 1000) + 300, sub, email: `${sub}@x.test`, name: sub },
      config.sessionSecrets,
    )
  )
}

const JSON_HEADERS = { 'content-type': 'application/json' }
const THEME_STYLE = '<style id="worldnotes-theme">'

describe('themes', () => {
  let config: ServerConfig
  let app: FastifyInstance
  let pages: PagesRepository
  let admin: string
  let editor: string
  let viewer: string

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    pages = createMemoryPagesRepository()
    await pages.put('home', { title: 'Home', content: '# Home' })
    app = await buildApp({
      config,
      pages,
      settings: createMemorySettingsRepository({ home_slug: 'home' }),
      themes: createMemoryThemesRepository(),
      users: usersFixture({ users: { boss: 'admin', ed: 'editor', vi: 'viewer' } }),
      relyingParty: null,
    })
    admin = cookie(config, 'boss')
    editor = cookie(config, 'ed')
    viewer = cookie(config, 'vi')
  })

  async function createTheme(
    body: Record<string, unknown>,
    who = admin,
  ): Promise<{ id: number; [k: string]: unknown }> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/themes',
      headers: { cookie: who, ...JSON_HEADERS },
      payload: body,
    })
    expect(res.statusCode).toBe(201)
    return res.json()
  }

  function activate(id: number | null) {
    return app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: { cookie: admin, ...JSON_HEADERS },
      payload: { activeThemeId: id },
    })
  }

  describe('authorization matrix', () => {
    it('only admins can read or write the gallery', async () => {
      const theme = await createTheme({ name: 'T', css: 'a{}' })
      const calls: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string }[] = [
        { method: 'GET', url: '/api/themes' },
        { method: 'GET', url: `/api/themes/${theme.id}` },
        { method: 'POST', url: '/api/themes' },
        { method: 'PUT', url: `/api/themes/${theme.id}` },
        { method: 'DELETE', url: `/api/themes/${theme.id}` },
      ]
      for (const call of calls) {
        const anon = await app.inject({ ...call, payload: call.method === 'GET' ? undefined : {} })
        expect(anon.statusCode, `anon ${call.method} ${call.url}`).toBe(401)
        for (const who of [editor, viewer]) {
          const res = await app.inject({
            ...call,
            headers: { cookie: who, ...JSON_HEADERS },
            payload: call.method === 'GET' ? undefined : { name: 'x', css: 'a{}' },
          })
          expect(res.statusCode, `non-admin ${call.method} ${call.url}`).toBe(403)
        }
      }
      // Nothing above mutated the theme.
      const still = await app.inject({
        method: 'GET',
        url: `/api/themes/${theme.id}`,
        headers: { cookie: admin },
      })
      expect(still.json()).toMatchObject({ name: 'T', css: 'a{}' })
    })

    it('only admins can activate a theme', async () => {
      const theme = await createTheme({ name: 'T', css: 'a{}' })
      const res = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { cookie: editor, ...JSON_HEADERS },
        payload: { activeThemeId: theme.id },
      })
      expect(res.statusCode).toBe(403)
    })

    it('rejects cross-origin writes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/themes',
        headers: { cookie: admin, origin: 'https://evil.test', ...JSON_HEADERS },
        payload: { name: 'T', css: 'a{}' },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('validation', () => {
    const bad = async (payload: unknown) =>
      app.inject({
        method: 'POST',
        url: '/api/themes',
        headers: { cookie: admin, ...JSON_HEADERS },
        payload: payload as Record<string, unknown>,
      })

    it('requires a non-empty name and string css', async () => {
      expect((await bad({ css: 'a{}' })).statusCode).toBe(400)
      expect((await bad({ name: '   ', css: 'a{}' })).statusCode).toBe(400)
      expect((await bad({ name: 'T', css: 5 })).statusCode).toBe(400)
    })

    it('caps css at 64 KiB (exactly the cap is accepted)', async () => {
      expect(THEME_CSS_MAX).toBe(65_536)
      expect((await bad({ name: 'edge', css: 'a'.repeat(THEME_CSS_MAX) })).statusCode).toBe(201)
      const over = await bad({ name: 'over', css: 'a'.repeat(THEME_CSS_MAX + 1) })
      expect(over.statusCode).toBe(400)
      expect(over.json().error).toContain('exceeds')
    })

    it.each(['</style>', '</STYLE ', 'a{}</sTyLe\n>', '</style/'])(
      'rejects the inline-sink break-out %j',
      async (css) => {
        const res = await bad({ name: 'x', css })
        expect(res.statusCode).toBe(400)
        expect(res.json().error).toContain('</style')
      },
    )

    it('rejects control characters but keeps tabs/newlines verbatim', async () => {
      expect((await bad({ name: 'nul', css: 'a{}\u0000' })).statusCode).toBe(400)
      const css = '.a {\r\n\tcolor: red;\n}\n'
      const ok = await bad({ name: 'ws', css })
      expect(ok.statusCode).toBe(201)
      expect(ok.json().css).toBe(css)
    })

    it('collapses name whitespace and enforces uniqueness (409), also on rename', async () => {
      const first = await createTheme({ name: '  Dark   mode ', css: 'a{}' })
      expect(first.name).toBe('Dark mode')
      const dup = await bad({ name: 'Dark mode', css: 'b{}' })
      expect(dup.statusCode).toBe(409)

      const other = await createTheme({ name: 'Other', css: 'a{}' })
      const rename = await app.inject({
        method: 'PUT',
        url: `/api/themes/${other.id}`,
        headers: { cookie: admin, ...JSON_HEADERS },
        payload: { name: 'Dark mode' },
      })
      expect(rename.statusCode).toBe(409)
    })

    it('partial PUT changes only the provided fields', async () => {
      const t = await createTheme({ name: 'T', description: 'd', css: 'a{}' })
      const res = await app.inject({
        method: 'PUT',
        url: `/api/themes/${t.id}`,
        headers: { cookie: admin, ...JSON_HEADERS },
        payload: { css: 'b{}' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        name: 'T',
        description: 'd',
        css: 'b{}',
        updatedBy: 'boss',
      })
    })

    it('404s unknown ids and 400s malformed ones', async () => {
      const get = (id: string) =>
        app.inject({ method: 'GET', url: `/api/themes/${id}`, headers: { cookie: admin } })
      expect((await get('999')).statusCode).toBe(404)
      expect((await get('1e3')).statusCode).toBe(400)
      expect((await get('0')).statusCode).toBe(400)
    })

    it('refuses to activate an unknown theme', async () => {
      const res = await activate(42)
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toContain('unknown theme id')
    })
  })

  describe('application', () => {
    it('appends the active theme AFTER the default stylesheet on the reader', async () => {
      const theme = await createTheme({ name: 'Red', css: ':root{--wn-palette-accent:#c00}' })
      const before = await app.inject({ method: 'GET', url: '/' })
      expect(before.body).not.toContain('worldnotes-theme')

      expect((await activate(theme.id)).statusCode).toBe(200)
      const res = await app.inject({ method: 'GET', url: '/' })
      expect(res.statusCode).toBe(200)
      const at = res.body.indexOf(`${THEME_STYLE}:root{--wn-palette-accent:#c00}</style>`)
      expect(at).toBeGreaterThan(-1)
      // Default sheet closes before the theme opens (cascade order).
      expect(res.body.lastIndexOf('</style>', at)).toBeGreaterThan(res.body.indexOf('<style>'))
      expect(res.body.indexOf('<style>')).toBeLessThan(at)
      // Viewers and status pages get it too.
      const viewerPage = await app.inject({ method: 'GET', url: '/', headers: { cookie: viewer } })
      expect(viewerPage.body).toContain(THEME_STYLE)
      const missing = await app.inject({ method: 'GET', url: '/nope' })
      expect(missing.statusCode).toBe(404)
      expect(missing.body).toContain(THEME_STYLE)
    })

    it('busts reader ETags on activation and on editing the active theme', async () => {
      const theme = await createTheme({ name: 'T', css: 'a{color:red}' })
      const etag0 = (await app.inject({ method: 'GET', url: '/home' })).headers.etag
      await activate(theme.id)
      const etag1 = (await app.inject({ method: 'GET', url: '/home' })).headers.etag
      expect(etag1).not.toBe(etag0)

      // Revalidating with the old tag must NOT 304.
      const stale = await app.inject({
        method: 'GET',
        url: '/home',
        headers: { 'if-none-match': etag0 as string },
      })
      expect(stale.statusCode).toBe(200)

      await app.inject({
        method: 'PUT',
        url: `/api/themes/${theme.id}`,
        headers: { cookie: admin, ...JSON_HEADERS },
        payload: { css: 'a{color:blue}' },
      })
      const after = await app.inject({ method: 'GET', url: '/home' })
      expect(after.headers.etag).not.toBe(etag1)
      expect(after.body).toContain('a{color:blue}')
      expect(after.body).not.toContain('a{color:red}')
      // Same state revalidates to 304.
      const again = await app.inject({
        method: 'GET',
        url: '/home',
        headers: { 'if-none-match': after.headers.etag as string },
      })
      expect(again.statusCode).toBe(304)
    })

    it('embeds the theme in the editor shell config', async () => {
      const theme = await createTheme({ name: 'T', css: 'a{content:"</script>"}' })
      await activate(theme.id)
      const res = await app.inject({ method: 'GET', url: '/home', headers: { cookie: editor } })
      expect(res.statusCode).toBe(200)
      // Escaped like every embedded payload: no raw </script> can terminate it.
      expect(res.body).not.toContain('a{content:"</script>"}')
      const raw = res.body.match(/<script id="wn-config" type="application\/json">(.*?)<\/script>/s)
      const config = JSON.parse(JSON.parse(raw![1]!))
      expect(config.themeCss).toBe('a{content:"</script>"}')
    })

    it('never applies the theme to /admin (anti-lockout)', async () => {
      const theme = await createTheme({ name: 'Broken', css: 'body{display:none}' })
      await activate(theme.id)
      const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: admin } })
      expect(res.statusCode).toBe(200)
      expect(res.body).not.toContain('worldnotes-theme')
      // The CSS appears only as editable text inside the gallery textarea.
      expect(res.body).toContain('spellcheck="false">\nbody{display:none}</textarea>')
      // The gallery itself is on the page and names the active theme.
      expect(res.body).toContain('Active theme: \u201cBroken\u201d')
      expect(res.body).toContain('class="wn-theme-badge"')
    })

    it('a dangling pointer degrades to the default look', async () => {
      const settings = createMemorySettingsRepository({ active_theme_id: '77', home_slug: 'home' })
      const dangling = await buildApp({
        config,
        pages,
        settings,
        themes: createMemoryThemesRepository(),
        users: usersFixture({ users: { boss: 'admin' } }),
        relyingParty: null,
      })
      const res = await dangling.inject({ method: 'GET', url: '/' })
      expect(res.statusCode).toBe(200)
      expect(res.body).not.toContain('worldnotes-theme')
      const adminPage = await dangling.inject({
        method: 'GET',
        url: '/admin',
        headers: { cookie: admin },
      })
      expect(adminPage.body).toContain('no longer exists')
    })

    it('escapes gallery fields on /admin', async () => {
      await createTheme({
        name: '<img src=x onerror=alert(1)>',
        description: '"><script>alert(2)</script>',
        css: '</textarea><script>alert(3)</script>',
      })
      const res = await app.inject({ method: 'GET', url: '/admin', headers: { cookie: admin } })
      expect(res.body).not.toContain('<img src=x')
      expect(res.body).not.toContain('<script>alert(')
    })
  })

  describe('deleting', () => {
    it('409s while active; succeeds once deactivated; 404s afterwards', async () => {
      const theme = await createTheme({ name: 'T', css: 'a{}' })
      await activate(theme.id)
      const del = () =>
        app.inject({
          method: 'DELETE',
          url: `/api/themes/${theme.id}`,
          headers: { cookie: admin },
        })
      const blocked = await del()
      expect(blocked.statusCode).toBe(409)
      expect(blocked.json().error).toContain('active')

      expect((await activate(null)).statusCode).toBe(200)
      expect((await del()).statusCode).toBe(204)
      expect((await del()).statusCode).toBe(404)
      const reader = await app.inject({ method: 'GET', url: '/' })
      expect(reader.body).not.toContain('worldnotes-theme')
    })
  })

  describe('preview', () => {
    it('lets an admin preview any theme without caching, and nobody else', async () => {
      const active = await createTheme({ name: 'Live', css: '/*live*/' })
      const trial = await createTheme({ name: 'Trial', css: '/*trial*/' })
      await activate(active.id)

      const url = `/all?previewTheme=${trial.id}`
      const adminRes = await app.inject({ method: 'GET', url, headers: { cookie: admin } })
      expect(adminRes.body).toContain('/*trial*/')
      expect(adminRes.body).not.toContain('/*live*/')
      expect(adminRes.headers['cache-control']).toBe('no-store')

      for (const headers of [{}, { cookie: editor }, { cookie: viewer }]) {
        const res = await app.inject({ method: 'GET', url, headers })
        expect(res.body).toContain('/*live*/')
        expect(res.body).not.toContain('/*trial*/')
      }
    })

    it('previews in the editor shell and never negotiates a 304', async () => {
      const trial = await createTheme({ name: 'Trial', css: '/*trial*/' })
      const res = await app.inject({
        method: 'GET',
        url: `/home?previewTheme=${trial.id}`,
        headers: { cookie: admin },
      })
      expect(res.headers['cache-control']).toBe('no-store')
      const raw = res.body.match(/<script id="wn-config" type="application\/json">(.*?)<\/script>/s)
      expect(JSON.parse(JSON.parse(raw![1]!)).themeCss).toBe('/*trial*/')
    })

    it('ignores unknown or malformed preview ids', async () => {
      const live = await createTheme({ name: 'Live', css: '/*live*/' })
      await activate(live.id)
      for (const id of ['999', 'abc', '1e1', '-1']) {
        const res = await app.inject({
          method: 'GET',
          url: `/all?previewTheme=${id}`,
          headers: { cookie: admin },
        })
        expect(res.body).toContain('/*live*/')
        expect(res.headers['cache-control']).not.toBe('no-store')
      }
    })
  })
})
