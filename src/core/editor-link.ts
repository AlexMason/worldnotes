// ─── Link controller — selection capture + edit around the link field ────────
// The Link button and Ctrl+K both call open(). It captures the selection (raw
// offsets) AND the page text before the field takes the DOM selection, opens
// the field in the toolbar row, and on a valid answer applies the link through
// the model-commit path (one undo step, render, restore caret, autosave).
//
// The captured text is the contract: if the page or its text changed while the
// field was open (a navigation, autosave `setContent`, a move), the field
// closes and the pending link is dropped — never applied at stale offsets.
// Staleness is noticed on `selectionchange` (navigation and re-renders always
// move the selection) and re-checked on submit.

import type { PageSuggestion, TokenDef } from './types'
import { commitModelEdit, type ModelCommitDeps } from './editor-commit'
import { getSelectionOffsets, selectionInBlock, setSelectionOffsets } from './caret-offset'
import { applyLink, findLinkAt } from './link-input'
import { openLinkField, type LinkField } from './link-field'

export interface LinkControllerDeps extends ModelCommitDeps {
  /** The `.wn-toolbar` row the field mounts into. */
  host: HTMLElement
  defs: readonly TokenDef[]
  getLinkBase(): string | null
  suggest?(query: string, limit: number): Promise<PageSuggestion[]>
  /** The field opened/closed — the toolbar hides its buttons while it is open. */
  onOpenChange(open: boolean): void
  /** A pending link was dropped because the page changed under the field. */
  onDropped(): void
}

export interface LinkController {
  /**
   * Open the link field for the current selection. True when the event is
   * consumed (including inert-in-block / unmappable selections); false when
   * no page is loaded.
   */
  open(): boolean
  /** Close without applying (editor teardown). */
  destroy(): void
}

export function createLinkController(deps: LinkControllerDeps): LinkController {
  let field: LinkField | null = null
  let stopWatching: (() => void) | null = null

  function teardown(): void {
    stopWatching?.()
    stopWatching = null
    field = null
    deps.onOpenChange(false)
  }

  function open(): boolean {
    if (field) {
      field.focus()
      return true
    }
    const page = deps.getCurrentPage()
    if (!deps.pageExists(page)) return false
    if (selectionInBlock(deps.editorEl)) return true
    const sel = getSelectionOffsets(deps.editorEl)
    if (!sel) return true

    const text = deps.getPageText(page)
    const existing = findLinkAt(text, sel.start, sel.end, deps.defs)
    const isStale = (): boolean => deps.getCurrentPage() !== page || deps.getPageText(page) !== text

    deps.onOpenChange(true)
    field = openLinkField(deps.host, {
      initial: existing?.target ?? '',
      linkBase: deps.getLinkBase(),
      suggest: deps.suggest,
      apply(input) {
        if (isStale()) {
          deps.onDropped()
          return null
        }
        const result = applyLink(text, sel.start, sel.end, input, deps.defs)
        if ('error' in result) return result.error
        commitModelEdit(deps, page, result)
        return null
      },
      close(reason) {
        teardown()
        if (reason === 'blur') return
        // Back to the document; a cancel restores the captured selection.
        if (reason === 'cancel') setSelectionOffsets(deps.editorEl, sel.start, sel.end)
        deps.editorEl.focus({ preventScroll: true })
      },
    })

    const onSelectionChange = (): void => {
      if (!isStale()) return
      field?.destroy()
      teardown()
      deps.onDropped()
    }
    document.addEventListener('selectionchange', onSelectionChange)
    stopWatching = () => document.removeEventListener('selectionchange', onSelectionChange)
    return true
  }

  return {
    open,
    destroy() {
      field?.destroy()
      if (field) teardown()
    },
  }
}
