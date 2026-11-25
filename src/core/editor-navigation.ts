// ─── Editor Navigation ────────────────────────────────────────────────────────
// Single convergence point for every in-editor navigation source (plugin link
// clicks, breadcrumb crumbs, header nav, popstate, the public navigate() API).
// Targets are folded to canonical slugs HERE (navTargetToSlug — the same fold
// the API store applies), so buffer keys, trail segments, the pushState URL
// and saves share one identity: `[x](/Blog/First-Post)` and `[[blog/first-post]]`
// open the SAME page. Unfoldable targets (empty, `[[中文]]`, reserved-route
// paths like `/api/x`) are REFUSED with a toast — the reader renders such
// targets as literal text, and opening a raw-keyed phantom buffer would only
// produce a page that can never persist. Missing pages are NOT a 404 dead-end:
// they open in a seeded editor (create-on-save persists the first edit).

import type { PageStore, EditorOptions } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { NotificationSystem } from './notifications'
import { classifyLinkTarget } from '../shared/url-policy'
import { navTargetToSlug, slugDisplayName } from '../shared/slug'

const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

/**
 * Canonical slug for a navigation target, or null when it is not a page
 * address. Only page-addresses navigate: scheme'd/protocol-relative URLs and
 * same-doc #fragments are not pages (the nav-link extractor applies the same
 * internal-only rule server-side). Note slugify would happily fold
 * 'https://x.com/y' into a junk 'https/x-com/y' key — refuse first.
 */
export function pageAddressToSlug(page: string): string | null {
  return classifyLinkTarget(page) === 'internal' ? navTargetToSlug(page) : null
}

/**
 * Seed for a page that exists nowhere. It opens in a SEEDED editor — the
 * create-on-save flow persists it on the first edit. There is no 404 dead-end
 * and no create dialog: the editor IS the create flow (the reader keeps its
 * plain 404 for anonymous visitors).
 */
export function seedContentFor(page: string, homeSlug: string | null | undefined): string {
  return page === (homeSlug ?? 'home') ? DEFAULT_HOME : `# ${slugDisplayName(page)}\n\n`
}

/**
 * Move the breadcrumb trail to the canonical slug `canonical`: home truncates
 * to the root; otherwise the longest matching path prefix of the current trail
 * is kept and the remaining segments pushed.
 */
export function applyTrailNavigation(state: EditorStateAPI, canonical: string): void {
  const trail = state.getTrail()

  if (canonical === trail[0]) {
    state.truncateTrail(0)
    return
  }

  const segments = canonical.split('/').filter(Boolean)

  let matchCount = 0
  for (let i = 1; i < trail.length && matchCount < segments.length; i++) {
    if (trail[i] === segments[matchCount]) {
      matchCount++
    } else {
      break
    }
  }

  state.truncateTrail(matchCount)
  for (let i = matchCount; i < segments.length; i++) {
    state.pushTrail(segments[i]!)
  }
}

export interface EditorNavigationAPI {
  navigateToPage(page: string): Promise<void>
  loadPage(page: string): Promise<void>
  setRenderAPI(render: EditorRenderAPI): void
}

export function createEditorNavigation(
  state: EditorStateAPI,
  pageStore: PageStore,
  dom: EditorDOM,
  options: EditorOptions,
  notifications?: NotificationSystem,
): EditorNavigationAPI {
  let _render: EditorRenderAPI | null = null

  function setRenderAPI(render: EditorRenderAPI): void {
    _render = render
  }

  function seedFor(page: string): string {
    return seedContentFor(page, options.homeSlug)
  }

  async function navigateToPage(page: string): Promise<void> {
    const canonical = pageAddressToSlug(page)
    if (canonical === null) {
      notifications?.notify({
        id: 'wn-nav',
        message: `"${page}" is not a valid page address.`,
        type: 'warning',
        duration: 3000,
      })
      return
    }

    // Hydrate (or seed a missing page) BEFORE touching the trail: a
    // rejecting store then leaves the editor exactly as it was — trail, DOM,
    // and current page stay consistent. Seeding here also means loadPage
    // never re-fetches: one GET per navigation, even for new pages.
    // Moved pages: a former slug is followed to where the page lives now —
    // known up front (the store saw the move), or learned from the load
    // (the server redirected it). One page, one buffer key.
    const buffers = state.getPageBuffers()
    let target = pageStore.canonicalOf?.(canonical) ?? canonical
    if (!buffers.hasPage(target)) {
      const stored = await pageStore.load(target)
      target = pageStore.canonicalOf?.(target) ?? target
      if (!buffers.hasPage(target)) {
        buffers.setPageText(target, stored !== null ? stored : seedFor(target))
        // Loaded/seeded state is the undo baseline — undo never goes back to
        // the empty pre-load buffer.
        buffers.clearHistory(target)
      }
    }
    if (target !== canonical) {
      notifications?.notify({
        id: 'wn-nav',
        message: `/${canonical} moved to /${target}`,
        type: 'info',
        duration: 3000,
      })
    }

    applyTrailNavigation(state, target)
    await loadPage(target)
  }

  async function loadPage(page: string): Promise<void> {
    state.setNavigating(true)
    try {
      const buffers = state.getPageBuffers()
      let pageExisted = buffers.hasPage(page)
      if (!pageExisted) {
        // The ONE hydration point (initial mounts land here directly;
        // navigateToPage always arrives with a canonical key the store
        // answers identically).
        const stored = await pageStore.load(page)
        if (stored !== null) {
          buffers.setPageText(page, stored)
          // Loaded state is the undo baseline — undo should never go
          // back to the empty pre-load buffer.
          buffers.clearHistory(page)
          pageExisted = true
        }
      }
      let content = buffers.getPageText(page)

      if (!content && !pageExisted) {
        // Direct callers (initial mount, breadcrumb clicks) seed here;
        // navigateToPage has already hydrated/seeded, so this is unreachable
        // on click navigation by construction.
        content = seedFor(page)
        buffers.setPageText(page, content)
        buffers.clearHistory(page) // seeded content is the undo baseline
      }

      // Force full re-render for page load
      dom.editorDiv.innerHTML = ''

      if (_render) {
        _render.render(true)
        _render.renderBreadcrumb()
      }

      // Move cursor to start
      try {
        const range = document.createRange()
        const sel = window.getSelection()
        if (sel) {
          const firstLine = dom.editorDiv.querySelector('[data-line="0"]')
          if (firstLine) {
            range.setStart(firstLine, 0)
          } else {
            range.setStart(dom.editorDiv, 0)
          }
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      } catch {
        /* best-effort */
      }

      options.onPageLoad?.(page, content)
    } finally {
      // A rejecting load must never leave isNavigating stuck true — the
      // input handler bails on it, which would freeze typing for the
      // session.
      state.setNavigating(false)
    }
  }

  /** loadPage + toast-on-failure: navigation callers (link clicks, popstate)
   *  run fire-and-forget, so a rejecting store must be reported, not float
   *  as an unhandled rejection. */
  async function navigateToPageSafe(page: string): Promise<void> {
    try {
      await navigateToPage(page)
    } catch (e) {
      console.error('worldnotes: navigation failed', e)
      notifications?.notify({
        id: 'wn-nav',
        message: 'Failed to load the page — you are still on the previous one.',
        type: 'error',
        duration: 3000,
      })
    }
  }

  return { navigateToPage: navigateToPageSafe, loadPage, setRenderAPI }
}
