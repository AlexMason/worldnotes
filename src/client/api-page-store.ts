// ─── HTTP PageStore ──────────────────────────────────────────────────────────
// Bridges the editor's PageStore contract to the pages API, tracking per-page
// versions for optimistic concurrency and surfacing conflicts/absences to the
// client chrome through callbacks.

import type { PageStore } from '../core/types'
import { navTargetToSlug } from '../shared/slug'
import { isBlankContent } from '../shared/content'

export interface PageSnapshotDto {
  slug: string
  title: string
  content: string
  version: number
}

export interface ApiPageStoreEvents {
  /** Server held a newer version. `server === null` when the page vanished. */
  onConflict(page: string, server: PageSnapshotDto | null): void
  onSaved?(page: string, content: string): void
  /** A blank save deleted the page server-side. */
  onDeleted?(page: string): void
  onAuthLost?(): void
}

export interface ApiPageStore extends PageStore {
  versionOf(page: string): number | null
}

function apiUrl(slug: string): string {
  return `/api/pages/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Editors navigate by raw wiki-link text ([[Some Page]]); the API speaks
 * slugs. Fold via the ONE shared helper (navTargetToSlug — the same fold the
 * editor's navigation core applies before a page ever reaches this store),
 * keyed by the folded slug so load/save/versions stay consistent regardless
 * of the input form. The `?? page` pass-through only keeps unfurlable raw
 * strings addressable for error paths; navigation refuses them upstream.
 */
function normalize(page: string): string {
  return navTargetToSlug(page) ?? page
}

export interface PageVersionSeed {
  slug: string
  version: number
}

export function createApiPageStore(
  events: ApiPageStoreEvents,
  seed: PageVersionSeed[] = [],
): ApiPageStore {
  const versions = new Map<string, number>()
  for (const { slug, version } of seed) versions.set(normalize(slug), version)

  // Saves are not serialized (debounce clears timers, Ctrl+S bypasses them).
  // Each save stamps a token so a late-resolving blank-delete cannot drop a
  // version that a newer save just established.
  const saveTokens = new Map<string, number>()
  let lastToken = 0
  function beginSave(page: string): number {
    const token = ++lastToken
    saveTokens.set(page, token)
    return token
  }
  function isLatestSave(page: string, token: number): boolean {
    return saveTokens.get(page) === token
  }

  async function put(page: string, content: string): Promise<Response> {
    const version = versions.get(page)
    return fetch(apiUrl(page), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(version !== undefined ? { 'if-match': `"${version}"` } : {}),
      },
      body: JSON.stringify({ content }),
    })
  }

  async function fetchSnapshot(page: string): Promise<PageSnapshotDto | null> {
    const res = await fetch(apiUrl(page))
    if (res.status === 404 || res.status === 400) return null
    if (!res.ok) throw new Error(`GET page failed: ${res.status}`)
    return (await res.json()) as PageSnapshotDto
  }

  async function createWithContent(
    page: string,
    content: string,
  ): Promise<{ snapshot: PageSnapshotDto; existed: boolean } | null> {
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: page, content }),
    })
    if (res.status === 401) {
      events.onAuthLost?.()
      return null
    }
    if (res.status === 400) return null // unfurlable name or blank content — caller shows save failure
    if (res.ok || res.status === 409) {
      const snapshot = await fetchSnapshot(normalize(page))
      // 409: someone else holds the slug — the POST wrote nothing, but the
      // (ok:true) response alone would read as “saved”. Report `existed` so
      // the caller can surface a conflict instead of a false success.
      return snapshot ? { snapshot, existed: res.status === 409 } : null
    }
    throw new Error(`create page failed: ${res.status}`)
  }

  return {
    versionOf(page) {
      return versions.get(normalize(page)) ?? null
    },

    async load(rawPage) {
      const page = normalize(rawPage)
      const snapshot = await fetchSnapshot(page)
      if (snapshot) versions.set(page, snapshot.version)
      return snapshot ? snapshot.content : null
    },

    async save(rawPage, content) {
      const page = normalize(rawPage)
      const token = beginSave(page)
      const blank = isBlankContent(content)

      if (versions.get(page) === undefined) {
        // Nothing tracked: either a never-created page (blank buffer — no
        // row exists to delete, and POST would refuse it: stay silent) or
        // the fresh-creation flow: create it with this content.
        if (blank) return
        const created = await createWithContent(page, content)
        if (created) {
          versions.set(page, created.snapshot.version)
          if (created.existed) {
            // Slug already existed — our content was NOT written. Surface a
            // conflict (with the live snapshot) instead of a false "Saved".
            events.onConflict(page, created.snapshot)
          } else {
            events.onSaved?.(page, content)
          }
        }
        return
      }

      let res = await put(page, content)

      if (res.status === 204) {
        // Blank save deleted the row server-side. Drop the tracked version
        // so the next non-blank save recreates the page — unless a newer
        // save for this page has since started (it owns the map now).
        if (isLatestSave(page, token)) {
          versions.delete(page)
          events.onDeleted?.(page)
        }
        return
      }

      if (res.status === 404) {
        if (blank) {
          // Page already gone (deleted elsewhere) — a blank PUT must not
          // recreate it. Forget the stale version, quietly.
          if (isLatestSave(page, token)) versions.delete(page)
          return
        }
        // deleted underneath us — recreate
        const created = await createWithContent(page, content)
        if (created) {
          versions.set(page, created.snapshot.version)
          if (created.existed) {
            events.onConflict(page, created.snapshot)
          } else {
            events.onSaved?.(page, content)
          }
        }
        return
      }

      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as {
          current?: { version: number }
        } | null
        const currentVersion = body?.current?.version ?? null
        if (currentVersion !== null) versions.set(page, currentVersion)
        const server = await fetchSnapshot(page)
        if (server) versions.set(page, server.version)
        events.onConflict(page, server)
        return
      }

      if (res.status === 401) {
        events.onAuthLost?.()
        throw new Error('authentication lost')
      }

      if (res.status === 428) {
        // version lost client-side; refresh it and retry once
        const server = await fetchSnapshot(page)
        if (server) {
          versions.set(page, server.version)
          res = await put(page, content)
          if (!res.ok) {
            const snap = await fetchSnapshot(page)
            events.onConflict(page, snap)
            if (snap) versions.set(page, snap.version)
            return
          }
        }
      }

      if (!res.ok) throw new Error(`save failed: ${res.status}`)

      const saved = (await res.json()) as PageSnapshotDto
      versions.set(page, saved.version)
      events.onSaved?.(page, content)
    },
  }
}
