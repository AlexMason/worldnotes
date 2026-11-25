import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BATCH_SIZE, FLUSH_DELAY_MS, STALE_MS, createLinkExistence } from '../link-existence'

interface Fetcher {
  fn: ReturnType<typeof vi.fn>
  urls(): string[]
}

function fetcher(answer: (slugs: string[]) => Response | Promise<Response>): Fetcher {
  const fn = vi.fn(async (url: string) => {
    const slugs = decodeURIComponent(new URL(url, 'http://x.test').searchParams.get('slugs') ?? '')
    return answer(slugs === '' ? [] : slugs.split(','))
  })
  return { fn, urls: () => fn.mock.calls.map((c) => c[0] as string) }
}

const respond = (map: Record<string, boolean>) => (slugs: string[]) =>
  Response.json({
    exists: Object.fromEntries(slugs.filter((s) => s in map).map((s) => [s, map[s]])),
  })

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
}

describe('createLinkExistence', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('seeds answers without any request', () => {
    const f = fetcher(respond({}))
    const le = createLinkExistence({ a: true, b: false }, { fetchImpl: f.fn as typeof fetch })
    expect(le.exists('a')).toBe(true)
    expect(le.exists('b')).toBe(false)
    expect(le.exists('c')).toBeUndefined()
    le.request(['a', 'b'])
    expect(f.fn).not.toHaveBeenCalled()
  })

  it('batches a burst of requests into one deduped call and notifies once', async () => {
    const f = fetcher(respond({ a: true, b: false }))
    const le = createLinkExistence({}, { fetchImpl: f.fn as typeof fetch })
    const changed = vi.fn()
    le.onChange(changed)

    le.request(['a'])
    le.request(['b', 'a'])
    le.request(['a'])
    expect(f.fn).not.toHaveBeenCalled() // debounced
    await settle()

    expect(f.fn).toHaveBeenCalledTimes(1)
    expect(f.urls()[0]).toBe('/api/pages-exist?slugs=a,b')
    expect(le.exists('a')).toBe(true)
    expect(le.exists('b')).toBe(false)
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('splits requests above the server batch cap', async () => {
    const f = fetcher(respond({}))
    const le = createLinkExistence({}, { fetchImpl: f.fn as typeof fetch })
    le.request(Array.from({ length: BATCH_SIZE + 1 }, (_, i) => `p${i}`))
    await settle()
    expect(f.fn).toHaveBeenCalledTimes(2)
  })

  it('re-requests an answer only after it goes stale', async () => {
    const f = fetcher(respond({ a: true }))
    const le = createLinkExistence({}, { fetchImpl: f.fn as typeof fetch })
    le.request(['a'])
    await settle()
    le.request(['a'])
    await settle()
    expect(f.fn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(STALE_MS)
    le.request(['a'])
    await settle()
    expect(f.fn).toHaveBeenCalledTimes(2)
  })

  it('keeps failed and unanswered slugs unknown and does not retry them every render', async () => {
    const f = fetcher(() => new Response('boom', { status: 500 }))
    const le = createLinkExistence({}, { fetchImpl: f.fn as typeof fetch })
    const changed = vi.fn()
    le.onChange(changed)

    le.request(['a'])
    await settle()
    le.request(['a']) // a render later — must not hit the server again yet
    await settle()
    expect(f.fn).toHaveBeenCalledTimes(1)
    expect(le.exists('a')).toBeUndefined()
    expect(changed).not.toHaveBeenCalled()

    // A thrown fetch behaves the same.
    const g = fetcher(() => Promise.reject(new Error('offline')))
    const le2 = createLinkExistence({}, { fetchImpl: g.fn as typeof fetch })
    le2.request(['z'])
    await settle()
    expect(le2.exists('z')).toBeUndefined()
  })

  it('set() records local facts and notifies only on a real change', () => {
    const le = createLinkExistence({ a: false })
    const changed = vi.fn()
    le.onChange(changed)
    le.set('a', true) // page was created by our own save
    le.set('a', true)
    expect(le.exists('a')).toBe(true)
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe stops notifications', () => {
    const le = createLinkExistence()
    const changed = vi.fn()
    const off = le.onChange(changed)
    off()
    le.set('a', true)
    expect(changed).not.toHaveBeenCalled()
  })
})
