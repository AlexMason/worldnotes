import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { FETCH_TIMEOUT_MS, MAX_REMOTE_GIF_BYTES, createImageFetcher } from '../media-fetch'

const URL_OK = 'https://media.giphy.com/media/abc/giphy.gif?cid=1'
const GIF = new TextEncoder().encode('GIF89a\x01\x00\x01\x00')

const gifResponse = (init: ResponseInit = {}) =>
  new Response(GIF, { status: 200, headers: { 'content-type': 'image/gif' }, ...init })

function fetcherFor(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => respond(url, init))
  return {
    fetchImpl,
    fetch: createImageFetcher({ fetchImpl: fetchImpl as unknown as typeof fetch }),
  }
}

const FAILED = /Couldn't fetch the original GIF/

// Failures are logged (console.warn); keep test output clean and inspectable.
let warn: MockInstance
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.useRealTimers()
  warn.mockRestore()
})

describe('createImageFetcher', () => {
  it('returns the GIF as a File named from the URL path, forced to image/gif', async () => {
    const { fetch } = fetcherFor(() => new Response(GIF, { status: 200 })) // no content-type
    const file = await fetch(URL_OK)
    expect(file.name).toBe('giphy.gif')
    expect(file.type).toBe('image/gif')
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(GIF)
  })

  it('makes a bare CORS request: no cookies, no referrer', async () => {
    const { fetch, fetchImpl } = fetcherFor(() => gifResponse())
    await fetch(URL_OK)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(URL_OK)
    expect(init).toMatchObject({ mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    ['https://a.test/media/My%20Gif.gif', 'My Gif.gif'],
    ['https://a.test/a/b/', 'image.gif'],
    ['https://a.test/', 'image.gif'],
    ['https://a.test/blob.bin', 'image.gif'],
    ['https://a.test/bad%ZZ.gif', 'image.gif'],
  ])('names %s as %s', async (url, name) => {
    const { fetch } = fetcherFor(() => gifResponse())
    expect((await fetch(url)).name).toBe(name)
  })

  it('refuses a non-2xx response', async () => {
    const { fetch } = fetcherFor(() => new Response('nope', { status: 404 }))
    await expect(fetch(URL_OK)).rejects.toThrow(FAILED)
  })

  it('refuses a body that is not a GIF, whatever it claims to be', async () => {
    const { fetch } = fetcherFor(
      () => new Response('<html>blocked</html>', { headers: { 'content-type': 'image/gif' } }),
    )
    await expect(fetch(URL_OK)).rejects.toThrow(FAILED)
  })

  it('reports a network or CORS failure with the save-and-drop advice', async () => {
    const { fetch } = fetcherFor(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(fetch(URL_OK)).rejects.toThrow(/Save the file and drop it into the editor/)
  })

  it('logs the cause with the ORIGIN only (URLs often carry tracking parameters)', async () => {
    const { fetch } = fetcherFor(() => new Response('nope', { status: 403 }))
    await expect(fetch(URL_OK)).rejects.toThrow(FAILED)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      'worldnotes: original GIF fetch failed',
      'https://media.giphy.com',
      'HTTP 403',
    )
    expect(JSON.stringify(warn.mock.calls)).not.toContain('cid=1')

    warn.mockClear()
    const net = fetcherFor(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(net.fetch(URL_OK)).rejects.toThrow(FAILED)
    expect(warn.mock.calls[0][2]).toBeInstanceOf(TypeError)
  })

  it('rejects an oversized Content-Length before reading the body', async () => {
    const res = gifResponse({ headers: { 'content-length': String(MAX_REMOTE_GIF_BYTES + 1) } })
    const blob = vi.spyOn(res, 'blob')
    const { fetch } = fetcherFor(() => res)
    await expect(fetch(URL_OK)).rejects.toThrow(/too large/)
    expect(blob).not.toHaveBeenCalled()
  })

  it('rejects a body larger than the cap even without Content-Length', async () => {
    const res = gifResponse()
    vi.spyOn(res, 'blob').mockResolvedValue({ size: MAX_REMOTE_GIF_BYTES + 1 } as Blob)
    const { fetch } = fetcherFor(() => res)
    await expect(fetch(URL_OK)).rejects.toThrow(/too large/)
  })

  it('aborts after the timeout', async () => {
    vi.useFakeTimers()
    const { fetch } = fetcherFor(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )
    const result = fetch(URL_OK).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1)
    const err = await result
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(FAILED)
  })

  it('does not abort a request that finished in time', async () => {
    vi.useFakeTimers()
    const { fetch, fetchImpl } = fetcherFor(() => gifResponse())
    await fetch(URL_OK)
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS * 2)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal?.aborted).toBe(false)
  })
})
