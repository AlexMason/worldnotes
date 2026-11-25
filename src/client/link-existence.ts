// ─── Link existence (client) ─────────────────────────────────────────────────
// Fetch-backed PageExistenceResolver for the editor's missing-page link
// styling. Answers come from the SSR embed (first paint), `GET /api/pages-exist`
// (batched, debounced) and the editor's own saves/deletes. Failure is silent to
// the user by design: an unanswered slug stays UNKNOWN, which renders like an
// existing page (a false "missing" marker is worse than a missed one).

import type { PageExistenceResolver } from '../core/types'

/** Wait this long to collect slugs from a burst of renders into one request. */
export const FLUSH_DELAY_MS = 150
/** A cached answer older than this is re-requested (when its link renders again). */
export const STALE_MS = 60_000
/** Server cap per request (`/api/pages-exist` answers 400 above it). */
export const BATCH_SIZE = 100
/** Query-string budget per request; slugs are ≤255 chars, so 100 of them could
 *  otherwise exceed common request-line limits (nginx 8 KB, Node 16 KB). */
export const BATCH_QUERY_BUDGET = 6000
/** `skipUntil` is pruned of expired entries once it grows past this. */
const SKIP_PRUNE_AT = 500

export interface LinkExistence extends PageExistenceResolver {
  /** Record a locally known fact (own save → exists, blank-save delete → missing). */
  set(slug: string, exists: boolean): void
}

export interface LinkExistenceDeps {
  fetchImpl?: typeof fetch
  now?: () => number
}

interface ExistsResponse {
  exists?: Record<string, unknown>
}

/** Split into requests of ≤ BATCH_SIZE slugs and ≤ BATCH_QUERY_BUDGET encoded characters. */
function toBatches(slugs: readonly string[]): string[][] {
  const batches: string[][] = []
  let batch: string[] = []
  let size = 0
  for (const slug of slugs) {
    const cost = encodeURIComponent(slug).length + 1
    if (batch.length > 0 && (batch.length >= BATCH_SIZE || size + cost > BATCH_QUERY_BUDGET)) {
      batches.push(batch)
      batch = []
      size = 0
    }
    batch.push(slug)
    size += cost
  }
  if (batch.length > 0) batches.push(batch)
  return batches
}

export function createLinkExistence(
  seed: Record<string, boolean> = {},
  deps: LinkExistenceDeps = {},
): LinkExistence {
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const now = deps.now ?? Date.now

  const answers = new Map<string, { exists: boolean; at: number }>()
  const queued = new Set<string>()
  const inflight = new Set<string>()
  /** Slugs the server did not answer (or the request failed): leave them alone
   *  until then, so a failing/unanswerable slug cannot trigger a request per render. */
  const skipUntil = new Map<string, number>()
  /** Sequence of the last local `set()` per slug. A response that was requested
   *  BEFORE that set is older than what this editor knows and must not win. */
  const localSetAt = new Map<string, number>()
  let sequence = 0
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | null = null

  for (const [slug, exists] of Object.entries(seed)) answers.set(slug, { exists, at: now() })

  function record(slug: string, exists: boolean): boolean {
    const changed = answers.get(slug)?.exists !== exists
    answers.set(slug, { exists, at: now() })
    skipUntil.delete(slug)
    return changed
  }

  function emit(): void {
    for (const listener of listeners) listener()
  }

  async function fetchBatch(batch: string[]): Promise<void> {
    const startedAt = ++sequence
    for (const slug of batch) inflight.add(slug)
    const answered = new Set<string>()
    let changed = false
    try {
      // no-store: the endpoint is browser-cacheable for the page list's sake,
      // but a refresh must never be answered with a pre-creation "missing".
      const url = `/api/pages-exist?slugs=${batch.map((s) => encodeURIComponent(s).replace(/%2F/gi, '/')).join(',')}`
      const res = await doFetch(url, { credentials: 'same-origin', cache: 'no-store' })
      if (!res.ok) {
        console.warn(`worldnotes: link-existence lookup failed (HTTP ${res.status})`)
      } else {
        const body = (await res.json()) as ExistsResponse
        for (const [slug, exists] of Object.entries(body.exists ?? {})) {
          if (typeof exists !== 'boolean') continue
          answered.add(slug)
          if ((localSetAt.get(slug) ?? 0) > startedAt) continue // a newer local fact wins
          if (record(slug, exists)) changed = true
        }
      }
    } catch (e) {
      console.warn('worldnotes: link-existence lookup failed', e)
    } finally {
      for (const slug of batch) {
        inflight.delete(slug)
        if (!answered.has(slug)) skipUntil.set(slug, now() + STALE_MS)
      }
    }
    if (changed) emit()
  }

  function flush(): void {
    timer = null
    const slugs = [...queued]
    queued.clear()
    for (const batch of toBatches(slugs)) void fetchBatch(batch)
  }

  function pruneSkips(t: number): void {
    if (skipUntil.size <= SKIP_PRUNE_AT) return
    for (const [slug, until] of skipUntil) if (until <= t) skipUntil.delete(slug)
  }

  return {
    exists: (slug) => answers.get(slug)?.exists,

    request(slugs) {
      const t = now()
      pruneSkips(t)
      let added = false
      for (const slug of slugs) {
        const known = answers.get(slug)
        if (known && t - known.at < STALE_MS) continue
        if ((skipUntil.get(slug) ?? 0) > t) continue
        if (inflight.has(slug) || queued.has(slug)) continue
        queued.add(slug)
        added = true
      }
      if (added && timer === null) timer = setTimeout(flush, FLUSH_DELAY_MS)
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    set(slug, exists) {
      localSetAt.set(slug, ++sequence)
      if (record(slug, exists)) emit()
    },
  }
}
