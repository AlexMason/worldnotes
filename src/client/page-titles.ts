// ─── Page titles (client) ────────────────────────────────────────────────────
// Fetch-backed PageTitleResolver for the editor's breadcrumb labels of pages
// it has not loaded (ancestors). Answers come from the SSR embed (first paint)
// and `GET /api/page-titles`. Each slug is asked about once per session: the
// trail is a handful of slugs, and the pages this editor edits are named from
// their live buffers instead. Failure is silent to the user by design — the
// crumb keeps its humanized-slug label.

import type { PageTitleResolver } from '../core/types'

/** Server cap per request (`/api/page-titles` answers 400 above it). */
export const BATCH_SIZE = 100

export interface PageTitlesDeps {
  fetchImpl?: typeof fetch
}

interface TitlesResponse {
  titles?: Record<string, unknown>
}

export function createPageTitles(
  seed: Record<string, string> = {},
  deps: PageTitlesDeps = {},
): PageTitleResolver {
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const answers = new Map(Object.entries(seed))
  /** Every slug ever requested (or seeded): never asked about again. */
  const asked = new Set(answers.keys())
  const listeners = new Set<() => void>()

  async function fetchBatch(batch: string[]): Promise<void> {
    let changed = false
    try {
      const url = `/api/page-titles?slugs=${batch.map((s) => encodeURIComponent(s).replace(/%2F/gi, '/')).join(',')}`
      const res = await doFetch(url, { credentials: 'same-origin', cache: 'no-store' })
      if (!res.ok) {
        console.warn(`worldnotes: page-title lookup failed (HTTP ${res.status})`)
        return
      }
      const body = (await res.json()) as TitlesResponse
      for (const [slug, title] of Object.entries(body.titles ?? {})) {
        if (typeof title !== 'string' || answers.get(slug) === title) continue
        answers.set(slug, title)
        changed = true
      }
    } catch (e) {
      console.warn('worldnotes: page-title lookup failed', e)
    }
    if (changed) for (const listener of listeners) listener()
  }

  return {
    title: (slug) => answers.get(slug),

    request(slugs) {
      const fresh: string[] = []
      for (const slug of slugs) {
        if (asked.has(slug)) continue
        asked.add(slug)
        fresh.push(slug)
      }
      for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
        void fetchBatch(fresh.slice(i, i + BATCH_SIZE))
      }
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
