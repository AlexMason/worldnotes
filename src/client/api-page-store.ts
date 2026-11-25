// ─── HTTP PageStore ──────────────────────────────────────────────────────────
// Bridges the editor's PageStore contract to the pages API, tracking per-page
// versions for optimistic concurrency and surfacing conflicts/absences to the
// client chrome through callbacks. Page moves: `move` calls
// POST /api/page-moves; former slugs are remembered as aliases so loads,
// saves and versions follow a page to its new address (a save to a former
// slug is answered `409 {movedTo}` and retried there — never recreated).

import type { PageMoveResult, PageStore } from '../core/types'
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
  /** Server refused with 403 — the account lost its editorial role. */
  onForbidden?(): void
  /**
   * The page was moved elsewhere (another tab or editor): a save addressed
   * to its former slug was answered `409 {movedTo}` and has been retried at
   * `to`. The surface should re-key the page.
   */
  onMoved?(from: string, to: string): void
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
  // Former slug → the slug it moved to (as learned from moves, redirected
  // loads and `409 {movedTo}` answers).
  const aliases = new Map<string, string>()

  function rememberMove(from: string, to: string): void {
    aliases.set(from, to)
    aliases.delete(to) // moving back onto a former slug reclaims it
  }

  /** Where `page` lives now: the folded slug with known moves applied. */
  function canonical(page: string): string {
    let slug = normalize(page)
    for (let hops = 0; hops < 16 && aliases.has(slug); hops++) slug = aliases.get(slug)!
    return slug
  }

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
  ): Promise<{ snapshot: PageSnapshotDto; existed: boolean } | { movedTo: string } | null> {
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: page, content }),
    })
    if (res.status === 401) {
      events.onAuthLost?.()
      return null
    }
    if (res.status === 403) {
      // Demoted while the tab stayed open — the one NEW error state the
      // roles feature introduces into the editor's happy path.
      events.onForbidden?.()
      return null
    }
    if (res.status === 400) return null // unfurlable name or blank content — caller shows save failure
    if (res.status === 409) {
      // A former slug of a moved page: never "recreate" it — follow it.
      const body = (await res.json().catch(() => null)) as { movedTo?: string } | null
      if (body?.movedTo) return { movedTo: body.movedTo }
    }
    if (res.ok || res.status === 409) {
      const snapshot = await fetchSnapshot(normalize(page))
      // 409: someone else holds the slug — the POST wrote nothing, but the
      // (ok:true) response alone would read as “saved”. Report `existed` so
      // the caller can surface a conflict instead of a false success.
      return snapshot ? { snapshot, existed: res.status === 409 } : null
    }
    throw new Error(`create page failed: ${res.status}`)
  }

  /**
   * A save to `page` was answered "moved to `to`": carry the tracked version
   * over (a slug-only move keeps the version), remember the alias, tell the
   * surface, and retry the save ONCE at the new address.
   */
  async function followMove(page: string, to: string, content: string, hops: number) {
    const version = versions.get(page)
    versions.delete(page)
    if (version !== undefined) versions.set(to, version)
    rememberMove(page, to)
    events.onMoved?.(page, to)
    if (hops === 0) await save(to, content, 1)
  }

  /** Record where a created/recreated page landed and report the outcome. */
  async function settleCreate(
    page: string,
    content: string,
    created: Awaited<ReturnType<typeof createWithContent>>,
    hops: number,
  ): Promise<void> {
    if (!created) return
    if ('movedTo' in created) return followMove(page, created.movedTo, content, hops)
    versions.set(page, created.snapshot.version)
    if (created.existed) {
      // Slug already existed — our content was NOT written. Surface a
      // conflict (with the live snapshot) instead of a false "Saved".
      events.onConflict(page, created.snapshot)
    } else {
      events.onSaved?.(page, content)
    }
  }

  async function save(rawPage: string, content: string, hops = 0): Promise<void> {
    const page = canonical(rawPage)
    const token = beginSave(page)
    const blank = isBlankContent(content)

    if (versions.get(page) === undefined) {
      // Nothing tracked: either a never-created page (blank buffer — no
      // row exists to delete, and POST would refuse it: stay silent) or
      // the fresh-creation flow: create it with this content.
      if (blank) return
      return settleCreate(page, content, await createWithContent(page, content), hops)
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
      return settleCreate(page, content, await createWithContent(page, content), hops)
    }

    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as {
        current?: { version: number }
        movedTo?: string
      } | null
      if (body?.movedTo) return followMove(page, body.movedTo, content, hops)
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

    if (res.status === 403) {
      events.onForbidden?.()
      throw new Error('edit access revoked')
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
  }

  return {
    versionOf(page) {
      return versions.get(canonical(page)) ?? null
    },

    canonicalOf: canonical,

    async load(rawPage) {
      const page = canonical(rawPage)
      const snapshot = await fetchSnapshot(page)
      if (!snapshot) return null
      // A former slug's GET is redirected to the live page: its `slug` says
      // where the page lives now.
      if (snapshot.slug !== page) rememberMove(page, snapshot.slug)
      versions.set(snapshot.slug, snapshot.version)
      return snapshot.content
    },

    save: (page, content) => save(page, content),

    async move(rawFrom, to): Promise<PageMoveResult> {
      const from = canonical(rawFrom)
      const res = await fetch('/api/page-moves', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from, to }),
      })
      if (res.status === 401) events.onAuthLost?.()
      if (res.status === 403) events.onForbidden?.()
      const body = (await res.json().catch(() => null)) as {
        error?: string
        moved?: { from: string; to: string }[]
        rewritten?: string[]
      } | null
      if (!res.ok || !body?.moved) {
        return { ok: false, error: body?.error ?? `Move failed (${res.status})` }
      }
      for (const pair of body.moved) {
        const version = versions.get(pair.from)
        versions.delete(pair.from)
        if (version !== undefined) versions.set(pair.to, version)
        rememberMove(pair.from, pair.to)
      }
      // Rewritten pages got new versions server-side; the surface reloads
      // them (load() records the fresh version) before saving again.
      const rewritten = body.rewritten ?? []
      for (const slug of rewritten) versions.delete(slug)
      return { ok: true, moved: body.moved, rewritten }
    },
  }
}
