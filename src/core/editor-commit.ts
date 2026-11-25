// ─── Model commits — the ONE path for buffer-defined edits ──────────────────
// Every edit the editor defines itself (keymap ops, selection replacement,
// plain-key fallbacks, clipboard) computes on the raw page string and lands
// here: setPageText (one undo step) → forced render → restore selection →
// scroll the caret into view → schedule the autosave. The browser never
// defines these edits through DOM surgery: native deletes of a multi-line
// selection leave empty `div[data-line]` shells (extraction then resurrects
// the deleted lines as blank ones), and text inserted inside a `data-raw`
// span is swallowed by extraction.

import { getSelectionOffsets, setSelectionOffsets, scrollCaretIntoView } from './caret-offset'

export interface ModelCommitDeps {
  editorEl: HTMLElement
  getCurrentPage(): string
  pageExists(page: string): boolean
  getPageText(page: string): string
  setPageText(page: string, text: string): void
  /** Forced re-render from the buffer; caret lands collapsed on cursorOffset. */
  render(cursorOffset: number): void
  scheduleSave(): void
}

/** A computed edit: the page's next text plus the selection to restore. */
export interface TextEdit {
  text: string
  start: number
  end: number
}

/**
 * Commit `edit` to `page`. Unchanged text skips the buffer/render/save and
 * only re-places the selection (pure motions share this path).
 */
export function commitModelEdit(deps: ModelCommitDeps, page: string, edit: TextEdit): void {
  if (edit.text !== deps.getPageText(page)) {
    deps.setPageText(page, edit.text)
    deps.render(edit.start)
    deps.scheduleSave()
  }
  setSelectionOffsets(deps.editorEl, edit.start, edit.end)
  scrollCaretIntoView(deps.editorEl)
}

/**
 * Replace the current selection's raw range with `insert` (a collapsed
 * caret inserts) and land the caret after it. Returns false — changing
 * nothing — when the selection is unmappable (outside the editor, e.g. a
 * page-wide select-all) or the page is not loaded; the caller decides
 * whether that consumes the event.
 */
export function replaceSelection(deps: ModelCommitDeps, insert: string): boolean {
  const page = deps.getCurrentPage()
  if (!deps.pageExists(page)) return false
  const sel = getSelectionOffsets(deps.editorEl)
  if (!sel) return false
  const raw = deps.getPageText(page)
  const caret = sel.start + insert.length
  commitModelEdit(deps, page, {
    text: raw.slice(0, sel.start) + insert + raw.slice(sel.end),
    start: caret,
    end: caret,
  })
  return true
}
