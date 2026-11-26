// ─── Original-image fetcher (browser) ────────────────────────────────────────
// Implements core's ImageFetcher port for "Copy image" pastes: the clipboard
// only carries a still PNG plus the source URL, so the animated GIF itself is
// fetched here. The request is deliberately bare — CORS mode, no cookies, no
// referrer — and the response must really be a GIF of sane size. The server
// never fetches URLs (that would be an SSRF surface); the third-party host
// sees the editor's IP once, like viewing the page that hosted the GIF.

import type { ImageFetcher } from '../core/types'

export const FETCH_TIMEOUT_MS = 15_000
export const MAX_REMOTE_GIF_BYTES = 64 * 1024 * 1024

const FETCH_FAILED =
  "Couldn't fetch the original GIF (the site may block it). Save the file and drop it into the editor instead."
const TOO_LARGE =
  'The original GIF is too large (64 MiB maximum). Save a smaller copy and drop it in.'

/** A refusal with a user-presentable message and an optional log-only reason. */
class FetchRefusal extends Error {
  constructor(
    message: string,
    readonly reason?: string,
  ) {
    super(message)
  }
}

export interface ImageFetcherDeps {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/** `giphy.gif` from `https://host/media/abc/giphy.gif?x=1`; `image.gif` if none. */
function nameFromUrl(url: string): string {
  const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
  try {
    const name = decodeURIComponent(last)
    return name.toLowerCase().endsWith('.gif') ? name : 'image.gif'
  } catch {
    return 'image.gif'
  }
}

export function createImageFetcher(deps: ImageFetcherDeps = {}): ImageFetcher {
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const timeoutMs = deps.timeoutMs ?? FETCH_TIMEOUT_MS

  return async (url) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await doFetch(url, {
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
      if (!res.ok) throw new FetchRefusal(FETCH_FAILED, `HTTP ${res.status}`)
      if (Number(res.headers.get('content-length')) > MAX_REMOTE_GIF_BYTES) {
        throw new FetchRefusal(TOO_LARGE)
      }
      const blob = await res.blob()
      if (blob.size > MAX_REMOTE_GIF_BYTES) throw new FetchRefusal(TOO_LARGE)
      const sig = new TextDecoder('latin1').decode(await blob.slice(0, 6).arrayBuffer())
      if (sig !== 'GIF87a' && sig !== 'GIF89a') {
        throw new FetchRefusal(FETCH_FAILED, 'response is not a GIF')
      }
      return new File([blob], nameFromUrl(url), { type: 'image/gif' })
    } catch (e) {
      // The user sees one message; the console keeps the cause (CORS blocks,
      // timeouts and DNS failures are indistinguishable to fetch). Only the
      // origin is logged: GIF URLs often carry tracking/session parameters.
      console.warn(
        'worldnotes: original GIF fetch failed',
        new URL(url).origin,
        e instanceof FetchRefusal ? (e.reason ?? e.message) : e,
      )
      throw e instanceof FetchRefusal ? e : new Error(FETCH_FAILED)
    } finally {
      clearTimeout(timer)
    }
  }
}
