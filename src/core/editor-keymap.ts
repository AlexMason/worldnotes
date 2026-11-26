// ─── Editor keymap — VS Code-style editing shortcuts over the line model ────
//
// Generic editing operations (line move/dup/delete, word delete/motion,
// markdown wrapping, save flush) that are NOT syntax-specific — the syntax
// ones (list Tab/Enter continuation) stay in content plugins. The lifecycle
// calls handle() after undo/redo and before plugin dispatch; every text-
// changing op commits through setPageText (one snapshot = one Ctrl+Z) and
// schedules the debounced save. Selection semantics live in the pure
// modules (editor-text-ops / editor-format); this file only wires DOM
// selection ↔ raw offsets.
//
// Modifier policy: Ctrl = Ctrl or Cmd (matches the existing undo/redo
// convention) and NEVER alone-with-alt on line/format ops. Word ops also
// accept Alt (macOS swallows Ctrl+arrows in Mission Control, Cmd+← is
// browser-back, and Option+⌫ is the classic delete-words combo).
// Ctrl+/ + Escape are owned by the shortcuts-help overlay plugin, NOT here.

import {
  getSelectionOffsets,
  getSelectionFocusEnd,
  setSelectionOffsets,
  selectionInBlock,
} from './caret-offset'
import {
  moveLines,
  duplicateLines,
  deleteLines,
  deleteWordLeft,
  moveWord,
  wordExtend,
} from './editor-text-ops'
import { toggleWrap, toggleList, wrapLink } from './editor-format'
import { commitModelEdit, type ModelCommitDeps, type TextEdit } from './editor-commit'

// ─── Binding table — the SINGLE source for keymap, help overlay, and docs ──

export interface ShortcutBinding {
  group: 'Lines' | 'Words' | 'Formatting' | 'Document'
  keys: string
  action: string
}

export const SHORTCUT_BINDINGS: ShortcutBinding[] = [
  { group: 'Lines', keys: 'Alt+↑ / Alt+↓', action: 'Move selected line(s) up / down' },
  { group: 'Lines', keys: 'Ctrl+Shift+D', action: 'Duplicate selected line(s)' },
  { group: 'Lines', keys: 'Ctrl+Shift+K', action: 'Delete selected line(s)' },
  { group: 'Words', keys: 'Ctrl+Backspace', action: 'Delete word to the left' },
  { group: 'Words', keys: 'Ctrl+← / Ctrl+→', action: 'Jump by word (Alt+←/→ also works)' },
  { group: 'Words', keys: 'Ctrl+Shift+← / →', action: 'Extend selection by word' },
  { group: 'Formatting', keys: 'Ctrl+B', action: 'Bold selection (toggle)' },
  { group: 'Formatting', keys: 'Ctrl+I', action: 'Italic selection (toggle)' },
  { group: 'Formatting', keys: 'Ctrl+U', action: 'Underline selection (toggle)' },
  { group: 'Formatting', keys: 'Ctrl+K', action: 'Wrap selection as [link](url)' },
  { group: 'Document', keys: 'Ctrl+S', action: 'Save now' },
  { group: 'Document', keys: 'Ctrl+Click', action: 'Open an external link in a new tab' },
  { group: 'Document', keys: 'Ctrl+A', action: 'Select the whole page' },
  { group: 'Document', keys: 'Ctrl+/', action: 'Show / hide this help' },
]

// ─── Keymap ─────────────────────────────────────────────────────────────────

export type FormatAction = 'bold' | 'italic' | 'underline' | 'list'

export interface EditingKeymapDeps extends ModelCommitDeps {
  saveNow(): void
  /** Line indices of `text` inside block regions (fences, tables). */
  blockLines(text: string): ReadonlySet<number>
}

export interface EditingKeymap {
  /** True when the event was consumed (preventDefault already applied). */
  handle(event: KeyboardEvent): boolean
  /**
   * Run a formatting action on the live selection — the one path shared by
   * the Ctrl chords and the toolbar buttons. True when the action was
   * consumed (including inert-in-block no-ops); false when no page is loaded.
   */
  format(action: FormatAction): boolean
}

const ctrlCmd = (e: KeyboardEvent): boolean => e.ctrlKey || e.metaKey
const anyMod = (e: KeyboardEvent): boolean => e.ctrlKey || e.metaKey || e.altKey

export function createEditingKeymap(deps: EditingKeymapDeps): EditingKeymap {
  /**
   * Shared commit path for text-changing ops: map selection → pure compute →
   * commitModelEdit (one undo step, render, restore selection, autosave).
   * null from compute = edge no-op (consume silently, change nothing).
   */
  function runTextOp(
    compute: (text: string, start: number, end: number) => TextEdit | null,
  ): boolean {
    const page = deps.getCurrentPage()
    if (!deps.pageExists(page)) return false
    const sel = getSelectionOffsets(deps.editorEl)
    if (!sel) return true // unmappable selection → consume-and-noop
    const result = compute(deps.getPageText(page), sel.start, sel.end)
    if (result) commitModelEdit(deps, page, result)
    return true
  }

  /** Ctrl/Cmd+A: the page body only — never the surrounding chrome (a
   *  native select-all reaches outside the editor and makes every
   *  selection-mapped op an unmappable no-op). */
  function selectAll(): boolean {
    const page = deps.getCurrentPage()
    if (!deps.pageExists(page)) return false
    setSelectionOffsets(deps.editorEl, 0, deps.getPageText(page).length)
    return true
  }

  function handle(event: KeyboardEvent): boolean {
    const e = event
    const key = e.key
    let consumed = false

    if (e.altKey && !e.ctrlKey && !e.metaKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      // Move selected line(s): Alt+↑/↓
      const delta = key === 'ArrowUp' ? -1 : 1
      consumed = runTextOp((t, s, en) => moveLines(t, s, en, delta as -1 | 1))
    } else if (ctrlCmd(e) && e.shiftKey && !e.altKey && key.toLowerCase() === 'd') {
      consumed = runTextOp((t, s, en) => duplicateLines(t, s, en))
    } else if (ctrlCmd(e) && e.shiftKey && !e.altKey && key.toLowerCase() === 'k') {
      consumed = runTextOp((t, s, en) => deleteLines(t, s, en))
    } else if (anyMod(e) && key === 'Backspace' && !e.shiftKey) {
      consumed = wordDeleteBackward()
    } else if ((ctrlCmd(e) || e.altKey) && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      consumed = wordMotion(key === 'ArrowLeft' ? 'backward' : 'forward', e.shiftKey)
    } else if (ctrlCmd(e) && !e.altKey && !e.shiftKey) {
      const k = key.toLowerCase()
      if (k === 'b') consumed = format('bold')
      else if (k === 'i') consumed = format('italic')
      else if (k === 'u') consumed = format('underline')
      else if (k === 'k') consumed = formatOp((t, s, en) => wrapLink(t, s, en))
      else if (k === 'a') consumed = selectAll()
      else if (k === 's') {
        deps.saveNow()
        consumed = true
      }
    }

    if (consumed) e.preventDefault()
    return consumed
  }

  /** Backspace-with-modifier: delete the selection, else the word left. */
  function wordDeleteBackward(): boolean {
    return runTextOp((raw, start, end) => {
      if (end > start) return { text: raw.slice(0, start) + raw.slice(end), start, end: start }
      const r = deleteWordLeft(raw, start)
      return { text: r.text, start: r.offset, end: r.offset }
    })
  }

  /**
   * Ctrl/Cmd/Alt + ←/→ (±Shift). Plain motion re-places a collapsed caret
   * (document-scoped — crosses lines); Shift extends/shrinks from the live
   * selection's focus end. Never mutates text → no save. The
   * selectionchange → checkSelectChange rAF path re-renders when the caret
   * lands on a different (line-activation) row.
   */
  function wordMotion(dir: 'backward' | 'forward', extend: boolean): boolean {
    const page = deps.getCurrentPage()
    if (!deps.pageExists(page)) return false
    const sel = getSelectionOffsets(deps.editorEl)
    if (!sel) return true
    const raw = deps.getPageText(page)

    let next: { start: number; end: number }
    if (extend) {
      const focusEnd = getSelectionFocusEnd(deps.editorEl) ?? 'end'
      next = wordExtend(raw, sel.start, sel.end, focusEnd, dir)
    } else {
      const from = dir === 'backward' ? sel.start : sel.end
      const to = moveWord(raw, from, dir)
      next = { start: to, end: to }
    }

    if (next.start === sel.start && next.end === sel.end) return true
    setSelectionOffsets(deps.editorEl, next.start, next.end)
    return true
  }

  /** Formatting: consume-and-noop inside block regions (fences, tables). */
  function formatOp(
    compute: (text: string, start: number, end: number) => TextEdit | null,
  ): boolean {
    if (selectionInBlock(deps.editorEl)) return true
    return runTextOp(compute)
  }

  function format(action: FormatAction): boolean {
    switch (action) {
      case 'bold':
        return formatOp((t, s, en) => toggleWrap(t, s, en, '**'))
      case 'italic':
        return formatOp((t, s, en) => toggleWrap(t, s, en, '*'))
      case 'underline':
        return formatOp((t, s, en) => toggleWrap(t, s, en, '<u>', '</u>'))
      case 'list':
        return formatOp((t, s, en) => toggleList(t, s, en, deps.blockLines(t)))
    }
  }

  return { handle, format }
}
