// ─── Editor State ────────────────────────────────────────────────────────────

import type { EditorContext, StorageAdapter, EditorOptions } from './types'
import { decodePathSearch } from './navigation'
import { createYDocState, type YDocState } from './y-doc-state'

/**
 * Full API surface for editor mutable state.
 */
export interface EditorStateAPI {
  /** Return the Yjs-backed document state. */
  getYDocState(): YDocState
  /** Return a defensive copy of the breadcrumb trail. */
  getTrail(): string[]
  /** Return a defensive copy of the world cache (delegates to YDocState). */
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
  /**
   * Produce a readonly EditorContext for plugins.
   */
  toContext(navigate: (page: string) => void): EditorContext
}

export function createEditorState(
  _storage: StorageAdapter,
  options: EditorOptions = {},
): EditorStateAPI {
  const yDocState = createYDocState()
  const configuredInitialPage = options.initialPage ?? 'home'
  const initialTrail = decodePathSearch(window.location.search)
  const initialPage = initialTrail[initialTrail.length - 1] ?? configuredInitialPage

  // ── Mutable state ──────────────────────────────────────────────────────────

  let trail: string[] = initialTrail.length ? [...initialTrail] : [initialPage]
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  // ── API ────────────────────────────────────────────────────────────────────

  return {
    getYDocState(): YDocState {
      return yDocState
    },

    getTrail(): string[] {
      return [...trail]
    },

    getWorld(): Record<string, string> {
      return yDocState.getWorld()
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

    toContext(navigate: (page: string) => void): EditorContext {
      const context = yDocState.toContext(navigate)
      return {
        ...context,
        getTrail: () => [...trail],
      }
    },
  }
}
