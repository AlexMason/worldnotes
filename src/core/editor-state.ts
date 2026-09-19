// ─── Editor State ────────────────────────────────────────────────────────────

import type { EditorContext, EditorOptions } from './types'
import { createPageBuffers, type PageBuffers } from './page-buffers'

/**
 * Full API surface for editor mutable state.
 */
export interface EditorStateAPI {
  /** Return the in-memory page content store. */
  getPageBuffers(): PageBuffers
  /** Return a defensive copy of the breadcrumb trail (flat path segments). */
  getTrail(): string[]
  /** Reconstruct the full current page name from trail segments. */
  getCurrentPage(): string
  /** Return a defensive copy of the world cache (delegates to PageBuffers). */
  getWorld(): Record<string, string>
  /** Append a page name to the trail. */
  pushTrail(page: string): void
  /** Replace the entire trail in place. */
  setTrail(trail: string[]): void
  /** Chop the trail down to (and including) the given index. */
  truncateTrail(index: number): void
  /** Set the is-navigating flag; returns the new value. */
  setNavigating(v: boolean): boolean
  /** Read the is-navigating flag. */
  isNavigating(): boolean
  /** Clear any pending save timer. */
  clearSaveTimer(): void
  /** Store a reference to the save timer. */
  setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void
  /** The page name that was requested before redirecting to 404. null otherwise. */
  getPendingRequestedPage(): string | null
  /** Set the pending requested page (for 404 overlay). Set to null to clear. */
  setPendingRequestedPage(page: string | null): void
  /**
   * Produce a readonly EditorContext for plugins.
   */
  toContext(navigate: (page: string) => void): EditorContext
}

export function createEditorState(
  options: EditorOptions = {},
  pageBuffers: PageBuffers = createPageBuffers({ historyDepth: options.historyDepth }),
): EditorStateAPI {
  const configuredInitialPage = options.initialPage ?? 'home'

  // ── Mutable state ──────────────────────────────────────────────────────────

  let trail: string[] = [configuredInitialPage]
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false
  let pendingRequestedPage: string | null = null

  // ── API ────────────────────────────────────────────────────────────────────

  return {
    getPageBuffers(): PageBuffers {
      return pageBuffers
    },

    getTrail(): string[] {
      return [...trail]
    },

    getCurrentPage(): string {
      if (trail.length <= 1) return trail[0] ?? ''
      return trail.slice(1).join('/')
    },

    getWorld(): Record<string, string> {
      return pageBuffers.getWorld()
    },

    pushTrail(page: string): void {
      trail.push(page)
    },

    setTrail(t: string[]): void {
      trail = t
    },

    truncateTrail(index: number): void {
      trail = trail.slice(0, index + 1)
    },

    setNavigating(v: boolean): boolean {
      isNavigating = v
      return v
    },

    isNavigating(): boolean {
      return isNavigating
    },

    clearSaveTimer(): void {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
    },

    setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void {
      saveTimer = timer
    },

    getPendingRequestedPage(): string | null {
      return pendingRequestedPage
    },

    setPendingRequestedPage(page: string | null): void {
      pendingRequestedPage = page
    },

    toContext(navigate: (page: string) => void): EditorContext {
      const context: EditorContext = {
        navigate,
        getTrail: () => [],
        getCurrentPage: () => '',
        getWorld: () => pageBuffers.getWorld(),
        getPageText: (page: string) => pageBuffers.getPageText(page),
        setPageText: (page: string, content: string) => pageBuffers.setPageText(page, content),
      }
      return {
        ...context,
        getTrail: () => [...trail],
        getCurrentPage: () => trail.length <= 1 ? (trail[0] ?? '') : trail.slice(1).join('/'),
      }
    },
  }
}
