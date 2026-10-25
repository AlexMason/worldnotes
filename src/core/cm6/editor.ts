// ─── CM6 editor — spike replacement for src/core/editor-* event plumbing ─────
// SPIKE (GH-4 / issue #5). One `EditorView` over the page's markdown source.
// Everything GH-1..GH-3 hand-rolled (model-driven clipboard, selection
// mapping, IME, composition, drop, multi-caret, undo) is CM6's. What stays
// worldnotes': the grammar (live-preview.ts), list continuation semantics
// (reusing editor-indentation.ts helpers), wiki-link navigation, theming via
// the shared `--wn-*` tokens + EDITOR_CONTENT_CSS vocabulary.

import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { Command } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import type { ContentPlugin } from '../types'
import { buildDocument, regionAt } from '../document'
import { dedentLine, indentLine, nextMarker, parseListItem } from '../editor-indentation'
import { livePreview } from './live-preview'
import type { LivePreview } from './live-preview'

export interface Cm6EditorOptions {
  doc: string
  plugins: ContentPlugin[]
  /** Fired on every USER-originated document change (not setText). */
  onChange?(doc: string): void
  /** Wiki / internal link activated (click on a collapsed line, or Ctrl/Cmd-click). */
  onNavigate?(page: string): void
}

export interface Cm6Editor {
  view: EditorView
  getText(): string
  /** Replace the whole document without firing onChange (e.g. "Load theirs"). */
  setText(text: string): void
  destroy(): void
}

/** True when `lineIndex` sits inside a block region (fence/table). */
function inRegion(state: EditorState, plugins: ContentPlugin[], lineIndex: number): boolean {
  const doc = buildDocument(state.doc.toString(), plugins)
  return regionAt(doc.blocks, lineIndex) !== null
}

/**
 * List continuation — same semantics as plugins/listItem.ts handleEnter/Tab/
 * Shift-Tab, reusing its pure helpers, but expressed as CM6 changes (the old
 * path round-trips the whole page through DOM selection + setPageText).
 * Bails inside block regions: a fenced `1. install` is not a list item.
 */
function listCommands(plugins: ContentPlugin[]): {
  enter: Command
  tab: Command
  shiftTab: Command
} {
  const target = (view: EditorView) => {
    const { state } = view
    const sel = state.selection.main
    if (!sel.empty) return null
    const line = state.doc.lineAt(sel.head)
    if (inRegion(state, plugins, line.number - 1)) return null
    const parsed = parseListItem(line.text)
    return parsed ? { sel, line, parsed } : null
  }

  return {
    enter(view) {
      const t = target(view)
      if (!t) return false
      const { sel, line, parsed } = t
      const prefix = parsed.indent + parsed.marker + ' '
      if (sel.head - line.from < prefix.length) return false
      if (parsed.content.trim() === '') {
        // Empty item + Enter ends the list.
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
          selection: { anchor: line.from },
          userEvent: 'input',
        })
        return true
      }
      const insert = '\n' + parsed.indent + nextMarker(parsed.marker) + ' '
      view.dispatch({
        changes: { from: sel.head, insert },
        selection: { anchor: sel.head + insert.length },
        userEvent: 'input',
      })
      return true
    },
    tab(view) {
      const t = target(view)
      if (!t) return false
      const { sel, line } = t
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: indentLine(line.text) },
        selection: { anchor: sel.head + 2 },
        userEvent: 'input.indent',
      })
      return true
    },
    shiftTab(view) {
      const t = target(view)
      if (!t) return false
      const { sel, line } = t
      const dedented = dedentLine(line.text)
      if (dedented === null) return true // consumed, nothing to do (old behaviour)
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: dedented },
        selection: { anchor: Math.max(line.from, sel.head - 2) },
        userEvent: 'delete.dedent',
      })
      return true
    },
  }
}

/** Click handling for collapsed-line links. Active lines are for editing. */
function linkClicks(preview: LivePreview, onNavigate?: (page: string) => void): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-page], [data-href]',
      )
      if (!el) return false
      const pos = view.posAtDOM(el)
      const lineIndex = view.state.doc.lineAt(pos).number - 1
      const modified = event.ctrlKey || event.metaKey
      if (preview.isLineActive(view, lineIndex) && !modified) return false // caret placement wins
      const page = el.dataset.page
      if (page !== undefined && onNavigate) {
        onNavigate(page)
        event.preventDefault()
        return true
      }
      const href = el.dataset.href
      if (href !== undefined) {
        window.open(href, '_blank', 'noopener,noreferrer')
        event.preventDefault()
        return true
      }
      return false
    },
  })
}

export function createCm6Editor(parent: HTMLElement, opts: Cm6EditorOptions): Cm6Editor {
  const list = listCommands(opts.plugins)
  const preview = livePreview(opts.plugins)
  const makeState = (doc: string): EditorState =>
    EditorState.create({
      doc,
      extensions: [
        history(),
        keymap.of([
          { key: 'Enter', run: list.enter },
          { key: 'Tab', run: list.tab },
          { key: 'Shift-Tab', run: list.shiftTab },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.lineWrapping,
        preview.extension,
        linkClicks(preview, opts.onNavigate),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange?.(u.state.doc.toString())
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Page editor', spellcheck: 'true' }),
      ],
    })

  const view = new EditorView({ state: makeState(opts.doc), parent })

  return {
    view,
    getText: () => view.state.doc.toString(),
    // A fresh state (not a replace transaction): resets undo history so Ctrl+Z
    // after navigating can never splice the previous page into this one, and
    // no docChanged update reaches onChange.
    setText: (text) => view.setState(makeState(text)),
    destroy: () => view.destroy(),
  }
}
