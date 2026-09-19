// ─── Page Buffers ────────────────────────────────────────────────────────────
//
// Plain in-memory content store replacing the former Yjs `Y.Map<Y.Text>` model.
// Each page is a whole-document string; every change is a full replacement.
// Undo/redo uses per-page snapshot stacks (`EditorHistory`), one step per
// recorded change — mirroring the old `Y.UndoManager(text, {captureTimeout: 0})`
// transaction granularity.

import { EditorHistory } from './editor-history'

export interface PageBuffersOptions {
  historyDepth?: number
}

export interface PageBuffers {
  /** True if the page exists in the in-memory world (loaded or created). */
  hasPage(page: string): boolean
  /** Current content of a page ('' if it does not exist). */
  getPageText(page: string): string
  /**
   * Replace a page's whole content. Records one undo step when the content
   * actually changes. No-op when identical.
   */
  setPageText(page: string, content: string): void
  /** Snapshot of all in-memory page content (values copied, keys shared). */
  getWorld(): Record<string, string>
  /** Undo one step on a page; returns the new content or null if nothing to undo. */
  undo(page: string): string | null
  /** Redo one step on a page; returns the new content or null if nothing to redo. */
  redo(page: string): string | null
  canUndo(page: string): boolean
  canRedo(page: string): boolean
  /** Discard undo/redo state for a page (e.g. after persisting a save). */
  clearHistory(page: string): void
}

export function createPageBuffers(
  options: PageBuffersOptions = {},
  seed: Record<string, string> = {},
): PageBuffers {
  const historyDepth = options.historyDepth ?? 50
  const contents = new Map<string, string>(Object.entries(seed))
  const histories = new Map<string, EditorHistory>()

  function historyFor(page: string): EditorHistory {
    let h = histories.get(page)
    if (!h) {
      h = new EditorHistory({ maxDepth: historyDepth })
      histories.set(page, h)
      // Base snapshot: content at first interaction, so the first user
      // change can be undone back to the loaded state.
      h.push(contents.get(page) ?? '')
    }
    return h
  }

  return {
    hasPage(page) {
      return contents.has(page)
    },

    getPageText(page) {
      return contents.get(page) ?? ''
    },

    setPageText(page, content) {
      const prev = contents.get(page)
      if (prev === content) return
      historyFor(page).push(content)
      contents.set(page, content)
    },

    getWorld() {
      return Object.fromEntries(contents)
    },

    undo(page) {
      const current = contents.get(page)
      if (current === undefined) return null
      const prev = historyFor(page).undo(current)
      if (prev === null || prev === current) return null
      contents.set(page, prev)
      return prev
    },

    redo(page) {
      const current = contents.get(page)
      if (current === undefined) return null
      const next = historyFor(page).redo(current)
      if (next === null || next === current) return null
      contents.set(page, next)
      return next
    },

    canUndo(page) {
      return historyFor(page).canUndo()
    },

    canRedo(page) {
      return historyFor(page).canRedo()
    },

    clearHistory(page) {
      histories.delete(page)
    },
  }
}
