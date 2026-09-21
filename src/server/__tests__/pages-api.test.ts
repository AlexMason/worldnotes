// ─── Pages API route tests (memory repo, forged session cookies) ─────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { usersFixture } from './helpers/users-fixture'
import { loadConfig, type ServerConfig } from '../config'
import { buildApp } from '../app'
import { createMemoryPagesRepository } from '../db/pages-memory'
import { seal } from '../auth/session'

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

describe('pages API', () => {
  let config: ServerConfig
  let repo: ReturnType<typeof createMemoryPagesRepository>
  let app: Awaited<ReturnType<typeof buildApp>>
  let auth: string
  const writes: string[] = []

  beforeEach(async () => {
    config = loadConfig(baseEnv)
    repo = createMemoryPagesRepository()
    writes.length = 0
    app = await buildApp({
      config,
      pages: repo,
      users: usersFixture(),
      relyingParty: null,
      onPageWrite: (slug) => writes.push(slug),
    })
    auth = editorCookie(config)
  })

  describe('reads (public)', () => {
    it('lists pages and searches by query', async () => {
      await repo.put('one', { title: 'Alpha', content: 'body one' })
      await new Promise((r) => setTimeout(r, 2))
      await repo.put('two', { title: 'Beta', content: 'gamma text' })

      const all = await app.inject({ method: 'GET', url: '/api/pages' })
      expect(all.statusCode).toBe(200)
      expect(all.json().pages.map((p: { slug: string }) => p.slug)).toEqual(['two', 'one'])

      const hit = await app.inject({ method: 'GET', url: '/api/pages?q=Gamma' })
      expect(hit.json().pages.map((p: { slug: string }) => p.slug)).toEqual(['two'])
    })

    it('fetches a page with an ETag', async () => {
      await repo.put('blog/post', { title: 'Post', content: 'hello' })
      const res = await app.inject({ method: 'GET', url: '/api/pages/blog/post' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ slug: 'blog/post', content: 'hello', version: 1 })
      expect(res.headers.etag).toBe('"1"')
    })

    it('404s for unknown slugs and 400s for invalid ones', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/pages/nope' })).statusCode).toBe(404)
      expect((await app.inject({ method: 'GET', url: '/api/pages/Bad-Slug' })).statusCode).toBe(400)
    })
  })

  describe('POST /api/pages (create)', () => {
    it('requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/pages',
        payload: { slug: 'x', content: '' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('creates with derived title and bumps cache hook', async () => {
      const res = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'blog/hello world', title: 'Hello World', content: '# Hello\n\nbody' },
      })
      // slug validation rejects the space before anything else
      expect(res.statusCode).toBe(400)

      const ok = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'blog/hello-world', content: '# Hello There\n\nbody' },
      })
      expect(ok.statusCode).toBe(201)
      expect(ok.json()).toMatchObject({
        slug: 'blog/hello-world',
        title: 'Hello There',
        version: 1,
      })
      expect(writes).toEqual(['blog/hello-world'])
    })

    it('falls back to a humanized slug when no heading exists', async () => {
      const res = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'plain-page', content: 'no headings here' },
      })
      expect(res.json().title).toBe('Plain Page')
    })

    it('409 on duplicate slug', async () => {
      await repo.put('dup', { title: 'D', content: '' })
      const res = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'dup', content: 'x' },
      })
      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ error: 'page exists' })
    })

    it('rejects reserved slugs and oversized content', async () => {
      const reserved = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'api/stuff' },
      })
      expect(reserved.statusCode).toBe(400)

      const big = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'big', content: 'x'.repeat(1_000_001) },
      })
      expect(big.statusCode).toBe(413)
    })

    it('refuses to create blank pages (blank or omitted content)', async () => {
      const blank = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'never', content: '   ' },
      })
      expect(blank.statusCode).toBe(400)
      expect(blank.json()).toMatchObject({ error: 'cannot create an empty page' })

      const omitted = await app.inject({
        method: 'POST',
        headers: { cookie: auth },
        url: '/api/pages',
        payload: { slug: 'never' },
      })
      expect(omitted.statusCode).toBe(400)
      expect(await repo.get('never')).toBeNull()
      expect(writes).toEqual([])
    })
  })

  describe('PUT /api/pages/* (autosave)', () => {
    beforeEach(async () => {
      await repo.put('page', { title: 'P', content: 'v1', by: 'user-0' })
    })

    it('rejects anonymous and cross-origin writes', async () => {
      const anon = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'v2' },
        headers: { 'if-match': '"1"' },
      })
      expect(anon.statusCode).toBe(401)

      const csrf = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'v2' },
        headers: { cookie: auth, 'if-match': '"1"', origin: 'https://evil.test' },
      })
      expect(csrf.statusCode).toBe(403)
    })

    it('requires If-Match (428 when absent)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'v2' },
        headers: { cookie: auth },
      })
      expect(res.statusCode).toBe(428)
    })

    it('saves with a matching version', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'v2 edited' },
        headers: { cookie: auth, 'if-match': '"1"' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ version: 2, content: 'v2 edited', updatedBy: 'user-1' })
      expect(res.headers.etag).toBe('"2"')
      expect(writes).toEqual(['page'])
    })

    it('keeps the stored title when new content has no heading', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'just text' },
        headers: { cookie: auth, 'if-match': '"1"' },
      })
      expect(res.json().title).toBe('P')
    })

    it('adopts a new heading as title when content grows one', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: '# Brand New Title\n\nbody' },
        headers: { cookie: auth, 'if-match': '"1"' },
      })
      expect(res.json().title).toBe('Brand New Title')
    })

    it('409s with the live version on a stale write', async () => {
      await repo.put('page', { title: 'P', content: 'v2' }) // bump to 2
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/page',
        payload: { content: 'clobber attempt' },
        headers: { cookie: auth, 'if-match': '"1"' },
      })
      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ current: { version: 2 } })
      expect(res.headers.etag).toBe('"2"')
      expect(writes).toEqual([])
    })

    it('404s for unknown pages', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/pages/ghost',
        payload: { content: 'x' },
        headers: { cookie: auth, 'if-match': '"1"' },
      })
      expect(res.statusCode).toBe(404)
    })

    describe('blank content deletes the page (no-blank-pages invariant)', () => {
      it('deletes on a matching version — empty and whitespace-only alike', async () => {
        for (const blank of ['', '  \n ']) {
          await repo.delete('page') // reset to a clean generation (v1 after put)
          await repo.put('page', { title: 'P', content: 'v1' })
          const res = await app.inject({
            method: 'PUT',
            url: '/api/pages/page',
            payload: { content: blank },
            headers: { cookie: auth, 'if-match': '"1"' },
          })
          expect(res.statusCode).toBe(204)
          expect(await repo.get('page')).toBeNull()
          expect(writes).toEqual(['page'])

          const gone = await app.inject({ method: 'GET', url: '/api/pages/page' })
          expect(gone.statusCode).toBe(404)
          writes.length = 0
        }
      })

      it('stale If-Match conflicts without deleting, and does not bump onWrite', async () => {
        await repo.put('page', { title: 'P', content: 'v2' }) // bump to 2
        const res = await app.inject({
          method: 'PUT',
          url: '/api/pages/page',
          payload: { content: '' },
          headers: { cookie: auth, 'if-match': '"1"' },
        })
        expect(res.statusCode).toBe(409)
        expect(res.json()).toMatchObject({ current: { version: 2 } })
        expect(res.headers.etag).toBe('"2"')
        expect(await repo.get('page')).not.toBeNull()
        expect(writes).toEqual([])
      })

      it('never recreates: blank PUT to a missing row 404s without creating', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: '/api/pages/ghost',
          payload: { content: '   ' },
          headers: { cookie: auth, 'if-match': '"1"' },
        })
        expect(res.statusCode).toBe(404)
        expect(await repo.get('ghost')).toBeNull()
        expect(writes).toEqual([])
      })

      it('guards run first: missing If-Match is 428, bad content/title still 400', async () => {
        const noMatch = await app.inject({
          method: 'PUT',
          url: '/api/pages/page',
          payload: { content: '' },
          headers: { cookie: auth },
        })
        expect(noMatch.statusCode).toBe(428)

        const badContent = await app.inject({
          method: 'PUT',
          url: '/api/pages/page',
          payload: { content: 123 },
          headers: { cookie: auth, 'if-match': '"1"' },
        })
        expect(badContent.statusCode).toBe(400)

        const longTitle = await app.inject({
          method: 'PUT',
          url: '/api/pages/page',
          payload: { content: '', title: 'x'.repeat(201) },
          headers: { cookie: auth, 'if-match': '"1"' },
        })
        expect(longTitle.statusCode).toBe(400)
        expect(await repo.get('page')).not.toBeNull() // title guard blocks the delete
      })
    })
  })

  describe('DELETE /api/pages/*', () => {
    it('requires auth, removes the row, 404s after', async () => {
      await repo.put('gone', { title: 'G', content: '' })
      const anon = await app.inject({ method: 'DELETE', url: '/api/pages/gone' })
      expect(anon.statusCode).toBe(401)

      const ok = await app.inject({
        method: 'DELETE',
        url: '/api/pages/gone',
        headers: { cookie: auth },
      })
      expect(ok.statusCode).toBe(204)

      const again = await app.inject({
        method: 'DELETE',
        url: '/api/pages/gone',
        headers: { cookie: auth },
      })
      expect(again.statusCode).toBe(404)
    })
  })

  it('healthz still serves', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
  })
})
