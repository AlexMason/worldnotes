// ─── HTTP PageStore ──────────────────────────────────────────────────────────
// Bridges the editor's PageStore contract to the pages API, tracking per-page
// versions for optimistic concurrency and surfacing conflicts/absences to the
// client chrome through callbacks.

import type { PageStore } from '../core/types'
import { slugify, validateSlug } from '../shared/slug'

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
  onAuthLost?(): void
}

export interface ApiPageStore extends PageStore {
  versionOf(page: string): number | null
}

function apiUrl(slug: string): string {
  return `/api/pages/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Editors may navigate by raw wiki-link text ([[Some Page]]); the API speaks
 * slugs. Fold once and key everything (URLs + version map) by the folded
 * slug so load/save/versions stay consistent regardless of the input form.
 */
function normalize(page: string): string {
  const folded = slugify(page)
  return validateSlug(folded).ok ? folded : page
}

export function createApiPageStore(events: ApiPageStoreEvents): ApiPageStore {
  const versions = new Map<string, number>()

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

  async function createWithContent(page: string, content: string): Promise<PageSnapshotDto | null> {
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: page, content }),
    })
    if (res.status === 401) {
      events.onAuthLost?.()
      return null
    }
    if (res.status === 400) return null // unfurlable name — caller shows save failure
    if (res.ok || res.status === 409) {
      return await fetchSnapshot(normalize(page))
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
      if (versions.get(page) === undefined) {
        // Page never loaded through the store (fresh creation flow):
        // create it with this content, then save normally.
        const created = await createWithContent(page, content)
        if (created) {
          versions.set(page, created.version)
          events.onSaved?.(page, content)
        }
        return
      }

      let res = await put(page, content)

      if (res.status === 404) {
        // deleted underneath us — recreate
        const created = await createWithContent(page, content)
        if (created) {
          versions.set(page, created.version)
          events.onSaved?.(page, content)
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
