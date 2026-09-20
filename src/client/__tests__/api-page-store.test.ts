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
    const fn = stubFetch({ status: 200, body: { slug: 'blog/post', title: 'P', content: 'hello', version: 3 } })
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
    const store = createApiPageStore(
      { onConflict: vi.fn(), onSaved },
      [{ slug: 'A/B', version: 5 }],
    )

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
