// ─── ApiPageStore unit tests (fetch stubbed) ─────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiPageStore } from '../api-page-store'

interface Stub {
  status: number
  body?: unknown
}

function stubFetch(...stubs: Stub[]): ReturnType<typeof vi.fn> {
  const calls: Request[] = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: url, ...init } as unknown as Request)
    const stub = stubs.shift() ?? { status: 500 }
    // 204 (and any null body) must be a REAL empty-body response —
    // Response.json() cannot produce null-status bodies.
    if (stub.body === null) return new Response(null, { status: stub.status })
    return Response.json(stub.body ?? {}, { status: stub.status })
  })
  const f = fn as unknown as ReturnType<typeof vi.fn>
  ;(f as unknown as { calls_: Request[] }).calls_ = calls
  vi.stubGlobal('fetch', fn)
  return f
}

function recordedCalls(fn: ReturnType<typeof vi.fn>): { url: string; init?: RequestInit }[] {
  return fn.mock.calls.map(([url, init]) => ({ url: url as string, init: init as RequestInit }))
}

describe('createApiPageStore', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('load fetches by slug-folded path and records the version', async () => {
    const fn = stubFetch({
      status: 200,
      body: { slug: 'blog/post', title: 'P', content: 'hello', version: 3 },
    })
    const store = createApiPageStore({ onConflict: vi.fn() })

    await expect(store.load('Blog/Post')).resolves.toBe('hello')
    expect(recordedCalls(fn)[0]!.url).toBe('/api/pages/blog/post')
    expect(store.versionOf('blog/post')).toBe(3)
    expect(store.versionOf('Blog/Post')).toBe(3) // folded key
  })

  it('load maps 404 and 400 to null', async () => {
    stubFetch({ status: 404 }, { status: 400, body: { error: 'bad slug' } })
    const store = createApiPageStore({ onConflict: vi.fn() })
    await expect(store.load('gone')).resolves.toBeNull()
    await expect(store.load('Bad Name!')).resolves.toBeNull()
  })

  it('save PUTs with If-Match and advances the version', async () => {
    const onSaved = vi.fn()
    const fn = stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 1 } }, // load
      { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 2 } }, // save
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onSaved })

    await store.load('a')
    await store.save('a', 'x')

    const put = recordedCalls(fn)[1]!
    expect(put.init?.method).toBe('PUT')
    expect((put.init?.headers as Record<string, string>)['if-match']).toBe('"1"')
    expect(store.versionOf('a')).toBe(2)
    expect(onSaved).toHaveBeenCalledWith('a', 'x')
  })

  it('save surfaces 409 conflicts with the server snapshot', async () => {
    const onConflict = vi.fn()
    stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 1 } }, // load
      { status: 409, body: { error: 'version conflict', current: { version: 5 } } }, // save
      { status: 200, body: { slug: 'a', title: 'A', content: 'theirs', version: 5 } }, // refetch
    )
    const store = createApiPageStore({ onConflict })

    await store.load('a')
    await store.save('a', 'mine')

    expect(onConflict).toHaveBeenCalledWith('a', {
      slug: 'a',
      title: 'A',
      content: 'theirs',
      version: 5,
    })
    expect(store.versionOf('a')).toBe(5)
  })

  it('saving an unsaved page creates it via POST', async () => {
    const onSaved = vi.fn()
    const fn = stubFetch(
      { status: 201, body: { slug: 'new', title: 'New', content: 'body', version: 1 } }, // POST
      { status: 200, body: { slug: 'new', title: 'New', content: 'body', version: 1 } }, // snapshot
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onSaved })

    await store.save('new', 'body')

    expect(recordedCalls(fn)[0]!.url).toBe('/api/pages')
    expect(recordedCalls(fn)[0]!.init?.method).toBe('POST')
    expect(onSaved).toHaveBeenCalledWith('new', 'body')
  })

  it('seeded versions send the right If-Match on the first save', async () => {
    const onSaved = vi.fn()
    const fn = stubFetch({
      status: 200,
      body: { slug: 'a/b', title: 'B', content: 'x', version: 6 }, // PUT response
    })
    // Seed keys fold through normalize, just like load/save keys.
    const store = createApiPageStore({ onConflict: vi.fn(), onSaved }, [
      { slug: 'A/B', version: 5 },
    ])

    await store.save('a/b', 'x')

    const put = recordedCalls(fn)[0]!
    expect(put.init?.method).toBe('PUT')
    expect((put.init?.headers as Record<string, string>)['if-match']).toBe('"5"')
    expect(store.versionOf('a/b')).toBe(6)
  })

  it('401 on save notifies auth loss', async () => {
    const onAuthLost = vi.fn()
    stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 1 } }, // load
      { status: 401, body: { error: 'unauthorized' } }, // save
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onAuthLost })

    await store.load('a')
    await expect(store.save('a', 'x')).rejects.toThrow(/authentication/)
    expect(onAuthLost).toHaveBeenCalled()
  })

  it('403 on save reports lost edit access', async () => {
    const onForbidden = vi.fn()
    stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 1 } }, // load
      { status: 403, body: { error: 'forbidden' } }, // save after demotion
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onForbidden })

    await store.load('a')
    await expect(store.save('a', 'x')).rejects.toThrow(/edit access revoked/)
    expect(onForbidden).toHaveBeenCalled()
  })

  it('retry once when the server demands a version (428)', async () => {
    const fn = stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 1 } }, // load
      { status: 428, body: { error: 'If-Match required' } }, // save #1
      { status: 200, body: { slug: 'a', title: 'A', content: '', version: 7 } }, // refetch
      { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 8 } }, // save #2
    )
    const store = createApiPageStore({ onConflict: vi.fn() })

    await store.load('a')
    store.versionOf('a')
    // simulate lost version knowledge while keeping the "known page" marker
    await store.save('a', 'x')

    const secondPut = recordedCalls(fn)[3]!
    expect(secondPut.init?.method).toBe('PUT')
    expect((secondPut.init?.headers as Record<string, string>)['if-match']).toBe('"7"')
  })

  describe('blank saves delete the page', () => {
    it('204 clears the tracked version and fires onDeleted, not onSaved', async () => {
      const onSaved = vi.fn()
      const onDeleted = vi.fn()
      const fn = stubFetch(
        { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 1 } }, // load
        { status: 204, body: null }, // blank save → server deleted the row
      )
      const store = createApiPageStore({ onConflict: vi.fn(), onSaved, onDeleted })

      await store.load('a')
      await store.save('a', '  \n ')

      const put = recordedCalls(fn)[1]!
      expect(put.init?.method).toBe('PUT')
      expect((put.init?.headers as Record<string, string>)['if-match']).toBe('"1"')
      expect(onDeleted).toHaveBeenCalledWith('a')
      expect(onSaved).not.toHaveBeenCalled()
      expect(store.versionOf('a')).toBeNull()
    })

    it('blank PUT that finds no row (404) clears the version without recreating', async () => {
      const onDeleted = vi.fn()
      const fn = stubFetch(
        { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 1 } }, // load
        { status: 404, body: { error: 'page not found' } }, // already gone
      )
      const store = createApiPageStore({ onConflict: vi.fn(), onDeleted })

      await store.load('a')
      await store.save('a', '')

      // Exactly two fetches: load + PUT — no POST recreate attempt.
      expect(fn).toHaveBeenCalledTimes(2)
      expect(store.versionOf('a')).toBeNull()
      expect(onDeleted).not.toHaveBeenCalled() // quiet: page vanished elsewhere
    })

    it('blank save of a never-created page performs no network at all', async () => {
      const fn = stubFetch()
      const store = createApiPageStore({ onConflict: vi.fn(), onDeleted: vi.fn() })

      await store.save('fresh', '   ')

      expect(fn).not.toHaveBeenCalled()
    })

    it('blank save conflicts flow through the normal 409 handling', async () => {
      const onConflict = vi.fn()
      const onDeleted = vi.fn()
      stubFetch(
        { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 1 } }, // load
        { status: 409, body: { error: 'version conflict', current: { version: 5 } } }, // blank PUT
        { status: 200, body: { slug: 'a', title: 'A', content: 'theirs', version: 5 } }, // refetch
      )
      const store = createApiPageStore({ onConflict, onDeleted })

      await store.load('a')
      await store.save('a', '')

      expect(onConflict).toHaveBeenCalledWith('a', expect.objectContaining({ version: 5 }))
      expect(onDeleted).not.toHaveBeenCalled()
      expect(store.versionOf('a')).toBe(5)
    })

    it('a late 204 cannot wipe a version a newer save established', async () => {
      const onDeleted = vi.fn()
      const snapshot = { slug: 'a', title: 'A', content: 'typed', version: 2 }
      let releaseBlank: ((r: Response) => void) | null = null
      const fn = vi.fn(async (url: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') === 'PUT' && (init?.body as string)?.includes('   ')) {
          // blank save: hangs until the test releases it
          return new Promise<Response>((resolve) => {
            releaseBlank = resolve
          })
        }
        return Response.json(snapshot, { status: 200 })
      })
      vi.stubGlobal('fetch', fn)
      const store = createApiPageStore({ onConflict: vi.fn(), onDeleted })

      await store.load('a') // version 1
      const blank = store.save('a', '   ') // in flight, holds token 1
      await store.save('a', 'typed') // newer save advances to version 2
      releaseBlank!(new Response(null, { status: 204 }))
      await blank

      expect(onDeleted).not.toHaveBeenCalled()
      expect(store.versionOf('a')).toBe(2)
    })

    it('after a blank delete, the next non-blank save recreates via POST', async () => {
      const onSaved = vi.fn()
      const fn = stubFetch(
        { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 1 } }, // load
        { status: 204, body: null }, // blank save → deleted
        { status: 201, body: { slug: 'a', title: 'A', content: 'undo!', version: 1 } }, // POST recreate
        { status: 200, body: { slug: 'a', title: 'A', content: 'undo!', version: 1 } }, // snapshot
      )
      const store = createApiPageStore({ onConflict: vi.fn(), onSaved, onDeleted: vi.fn() })

      await store.load('a')
      await store.save('a', '')
      await store.save('a', 'undo!') // e.g. after Ctrl+Z

      const post = recordedCalls(fn)[2]!
      expect(post.init?.method).toBe('POST')
      expect(store.versionOf('a')).toBe(1)
      expect(onSaved).toHaveBeenCalledWith('a', 'undo!')
    })

    it('a create racing an existing page reports a conflict, not success', async () => {
      const onSaved = vi.fn()
      const onConflict = vi.fn()
      stubFetch(
        { status: 409, body: { error: 'page exists', current: { version: 1 } } }, // POST
        { status: 200, body: { slug: 'a', title: 'A', content: 'theirs', version: 3 } }, // snapshot
      )
      const store = createApiPageStore({ onConflict, onSaved })

      await store.save('a', 'mine')

      expect(onSaved).not.toHaveBeenCalled()
      expect(onConflict).toHaveBeenCalledWith('a', expect.objectContaining({ version: 3 }))
      expect(store.versionOf('a')).toBe(3)
    })
  })
})

describe('createApiPageStore — page moves', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('move POSTs to /api/page-moves and re-keys versions of moved pages', async () => {
    const fn = stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 4 } }, // load
      {
        status: 200,
        body: { moved: [{ from: 'a', to: 'b' }], rewritten: ['other'], settings: [] },
      },
      { status: 200, body: { slug: 'b', title: 'A', content: 'y', version: 5 } }, // save
    )
    const store = createApiPageStore({ onConflict: vi.fn() })
    await store.load('a')

    await expect(store.move!('a', 'B')).resolves.toEqual({
      ok: true,
      moved: [{ from: 'a', to: 'b' }],
      rewritten: ['other'],
    })
    const post = recordedCalls(fn)[1]!
    expect(post.url).toBe('/api/page-moves')
    expect(JSON.parse(post.init?.body as string)).toEqual({ from: 'a', to: 'B' })
    expect(store.versionOf('b')).toBe(4)
    expect(store.canonicalOf!('a')).toBe('b')

    // A save still addressed to the old key goes to the new slug.
    await store.save('a', 'y')
    expect(recordedCalls(fn)[2]!.url).toBe('/api/pages/b')
  })

  it('move failures surface the server message and change nothing', async () => {
    stubFetch(
      { status: 200, body: { slug: 'a', title: 'A', content: 'x', version: 1 } },
      { status: 409, body: { error: 'a page already exists at /b', slug: 'b' } },
    )
    const store = createApiPageStore({ onConflict: vi.fn() })
    await store.load('a')
    await expect(store.move!('a', 'b')).resolves.toEqual({
      ok: false,
      error: 'a page already exists at /b',
    })
    expect(store.versionOf('a')).toBe(1)
    expect(store.canonicalOf!('a')).toBe('a')
  })

  it('a load redirected from a former slug records where the page lives', async () => {
    stubFetch({ status: 200, body: { slug: 'new/home', title: 'N', content: 'c', version: 2 } })
    const store = createApiPageStore({ onConflict: vi.fn() })
    await expect(store.load('old/home')).resolves.toBe('c')
    expect(store.canonicalOf!('old/home')).toBe('new/home')
    expect(store.versionOf('new/home')).toBe(2)
  })

  it('a save answered 409 movedTo follows the move and never recreates the old slug', async () => {
    const onMoved = vi.fn()
    const onSaved = vi.fn()
    const fn = stubFetch(
      { status: 409, body: { error: 'page moved', movedTo: 'moved/here' } }, // PUT old slug
      { status: 200, body: { slug: 'moved/here', title: 'T', content: 'typed', version: 3 } },
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onMoved, onSaved }, [
      { slug: 'stale', version: 3 },
    ])

    await store.save('stale', 'typed')

    expect(onMoved).toHaveBeenCalledWith('stale', 'moved/here')
    const calls = recordedCalls(fn)
    expect(calls.map((c) => [c.init?.method, c.url])).toEqual([
      ['PUT', '/api/pages/stale'],
      ['PUT', '/api/pages/moved/here'],
    ])
    expect((calls[1]!.init?.headers as Record<string, string>)['if-match']).toBe('"3"')
    expect(onSaved).toHaveBeenCalledWith('moved/here', 'typed')
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false)
  })

  it('a create answered 409 movedTo follows the move instead of conflicting', async () => {
    const onMoved = vi.fn()
    const onConflict = vi.fn()
    const fn = stubFetch(
      { status: 409, body: { error: 'page moved', movedTo: 'b' } }, // POST create at old slug
      { status: 201, body: { slug: 'b', title: 'B', content: 'x', version: 1 } }, // POST at b
      { status: 200, body: { slug: 'b', title: 'B', content: 'x', version: 1 } }, // snapshot
    )
    const store = createApiPageStore({ onConflict, onMoved })
    await store.save('a', 'x')
    expect(onMoved).toHaveBeenCalledWith('a', 'b')
    expect(onConflict).not.toHaveBeenCalled()
    // Retried once at the new slug (no tracked version → create flow there).
    expect(recordedCalls(fn)[1]!.init?.method).toBe('POST')
  })
})

describe('createApiPageStore — move edge cases', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('a page moved twice during one save fails the save loudly instead of dropping it', async () => {
    const onMoved = vi.fn()
    stubFetch(
      { status: 409, body: { error: 'page moved', movedTo: 'b' } }, // PUT a
      { status: 409, body: { error: 'page moved', movedTo: 'c' } }, // retry PUT b
    )
    const store = createApiPageStore({ onConflict: vi.fn(), onMoved }, [{ slug: 'a', version: 1 }])
    await expect(store.save('a', 'text')).rejects.toThrow(/moved again/)
    expect(onMoved).toHaveBeenNthCalledWith(1, 'a', 'b')
    expect(onMoved).toHaveBeenNthCalledWith(2, 'b', 'c')
    // The next save goes straight to the latest address with the carried version.
    expect(store.canonicalOf!('a')).toBe('c')
    expect(store.versionOf('c')).toBe(1)
  })

  it('move reports lost sessions and revoked access', async () => {
    const onAuthLost = vi.fn()
    const onForbidden = vi.fn()
    stubFetch({ status: 401, body: { error: 'unauthenticated' } }, { status: 403, body: {} })
    const store = createApiPageStore({ onConflict: vi.fn(), onAuthLost, onForbidden })
    await expect(store.move!('a', 'b')).resolves.toEqual({ ok: false, error: 'unauthenticated' })
    expect(onAuthLost).toHaveBeenCalledTimes(1)
    await expect(store.move!('a', 'b')).resolves.toEqual({ ok: false, error: 'Move failed (403)' })
    expect(onForbidden).toHaveBeenCalledTimes(1)
  })
})

describe('createApiPageStore — suggest', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('asks for name-scoped matches and returns slug/title pairs', async () => {
    const fn = stubFetch({
      status: 200,
      body: { pages: [{ slug: 'lore/old-gods', title: 'The Old Gods', updatedAt: 1 }] },
    })
    const store = createApiPageStore({ onConflict: vi.fn() })
    await expect(store.suggest!('old gods', 8)).resolves.toEqual([
      { slug: 'lore/old-gods', title: 'The Old Gods' },
    ])
    expect(recordedCalls(fn)[0]!.url).toBe('/api/pages?q=old+gods&scope=name&limit=8')
  })

  it('failures are just "no suggestions" — never thrown', async () => {
    stubFetch({ status: 403, body: { error: 'login required' } })
    const store = createApiPageStore({ onConflict: vi.fn() })
    await expect(store.suggest!('x', 8)).resolves.toEqual([])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    await expect(store.suggest!('x', 8)).resolves.toEqual([])
  })
})
