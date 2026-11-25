// ─── Editor page moves ───────────────────────────────────────────────────────
// The editor side of moving a page (and its subtree) to a new slug. The store
// does the server work (`PageStore.move`); this module keeps the editor's own
// state consistent with it:
//
//   1. flush the pending/in-flight save FIRST — a debounced save captured
//      before the move would otherwise land on the old slug afterwards;
//   2. move: buffers of moved pages are re-keyed (undo history kept),
//      buffers of other pages whose links the server rewrote are dropped (the
//      next visit reloads them), and the current page reloads when its own
//      content was rewritten;
//   3. the trail follows, `onPageMoved` fires (hosts replace the URL), then
//      the editor repaints — in that order, so `onTrailChange` already sees
//      the new slug and never pushes a history entry for the old one.
//
// `pageMoved` is the same re-key for a move learned from the store (another
// tab moved the page; a save to the former slug was answered "moved").

import type { EditorOptions, PageMoveResult, PageStore } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorRenderAPI } from './editor-render'
import type { NotificationSystem } from './notifications'
import { applyTrailNavigation } from './editor-navigation'

export interface PageMoverDeps {
  state: EditorStateAPI
  pageStore: PageStore
  render: EditorRenderAPI
  notifications: NotificationSystem
  options: EditorOptions
  /** Run any pending debounced save now and await every in-flight save. */
  flushSaves(): Promise<void>
}

export interface PageMover {
  /** True when the store can move pages (the UI offers the affordance). */
  canMove(): boolean
  /** Move the current page to `to`; resolves null on success, else the error to show. */
  movePage(to: string): Promise<string | null>
  /** A move learned from elsewhere: re-key `from` → `to`, following it when current. */
  pageMoved(from: string, to: string): void
}

export function createPageMover(deps: PageMoverDeps): PageMover {
  const { state, pageStore, render, notifications, options } = deps

  function follow(from: string, to: string, result?: PageMoveResult): void {
    applyTrailNavigation(state, to)
    options.onPageMoved?.(from, to, result)
    render.render(true)
    render.renderBreadcrumb()
  }

  async function movePage(to: string): Promise<string | null> {
    if (!pageStore.move) return 'Moving pages is not supported here.'
    const from = state.getCurrentPage()
    await deps.flushSaves()

    let result: PageMoveResult
    try {
      result = await pageStore.move(from, to)
    } catch (e) {
      console.error('worldnotes: page move failed', e)
      return 'Could not reach the server — the page was not moved.'
    }
    if (!result.ok) return result.error

    const buffers = state.getPageBuffers()
    for (const pair of result.moved) buffers.renamePage(pair.from, pair.to)
    const current = result.moved.find((pair) => pair.from === from)?.to ?? from
    for (const slug of result.rewritten) if (slug !== current) buffers.dropPage(slug)
    if (result.rewritten.includes(current)) {
      // Its own links were rewritten server-side (e.g. absolute links into its
      // subtree): adopt the server text, which also records the new version.
      try {
        const fresh = await pageStore.load(current)
        if (fresh !== null) {
          buffers.setPageText(current, fresh)
          buffers.clearHistory(current)
        }
      } catch (e) {
        console.error('worldnotes: reloading the moved page failed', e)
      }
    }

    follow(from, current, result)
    const others = result.rewritten.filter((slug) => slug !== current).length
    notifications.notify({
      id: 'wn-move',
      message:
        others > 0
          ? `Moved to /${current} · links updated in ${others} ${others === 1 ? 'page' : 'pages'}`
          : `Moved to /${current}`,
      type: 'success',
      duration: 3000,
    })
    return null
  }

  function pageMoved(from: string, to: string): void {
    if (from === to) return
    state.getPageBuffers().renamePage(from, to)
    if (state.getCurrentPage() !== from) return
    follow(from, to)
    notifications.notify({
      id: 'wn-move',
      message: `This page was moved to /${to}`,
      type: 'info',
      duration: 4000,
    })
  }

  return { canMove: () => typeof pageStore.move === 'function', movePage, pageMoved }
}
