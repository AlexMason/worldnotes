// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin, EditorContext } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import {
  getSelectionFocusEnd,
  getSelectionOffsets,
  scrollCaretIntoView,
  setLineOffset,
  setSelectionOffsets,
  tryGetLineOffset,
} from './caret-offset'
import { renderDocLines } from './line-renderer'
import { buildDocument, regionAt } from './document'
import { renderInlineContent } from './renderer'
import { renderBreadcrumb as renderBreadcrumbChrome } from './breadcrumb'
import { openPageMoveField } from './page-move-field'

export interface EditorRenderAPI {
  /**
   * Rebuild the editor DOM from the buffer. With `cursorOffset` the caret
   * lands collapsed there; without it a live RANGE selection survives the
   * rebuild (restored by raw offsets, direction kept, clamped to the text),
   * else the caret keeps its raw offset.
   */
  render(force?: boolean, cursorOffset?: number): void
  renderBreadcrumb(): void
  /** Re-render when a collapsed caret moved to another line; true if it did. */
  checkSelectChange(): boolean
  /**
   * Enable the page-move affordance (editable active crumb) with the handler
   * that performs a move. Takes effect on the next repaint.
   */
  setMoveHandler(handler: (to: string) => Promise<string | null>): void
  /** Open the inline move field in the breadcrumb; no-op without a handler. */
  openMoveField(): void
}

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
  /** Breadcrumb root crumb label (site name); defaults to 'Home'. */
  homeLabel?: string
}

function determineActiveLine(raw: string, offset: number): number {
  let line = 0
  for (let i = 0; i < Math.min(offset, raw.length); i++) {
    if (raw[i] === '\n') line++
  }
  return line
}

/** Character offset where `line` starts within `raw`. */
function lineStartOffset(raw: string, line: number): number {
  let offset = 0
  for (let i = 0; i < line; i++) {
    const next = raw.indexOf('\n', offset)
    if (next === -1) return raw.length
    offset = next + 1
  }
  return Math.min(offset, raw.length)
}

export function createEditorRender(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  state: EditorStateAPI,
  options: EditorRenderOptions = {},
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom

  let activeLine = -1

  // ── Full render pipeline ──────────────────────────────────────────────────

  function render(_force = false, cursorOffset?: number): void {
    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)

    // A live range selection (drag, Shift+arrow, select-all) is model state,
    // not ephemeral DOM: capture it so the rebuild cannot collapse it. The
    // focus end (where the user's caret is) decides the active line.
    const range = cursorOffset === undefined ? getSelectionOffsets(editorDiv) : null
    const kept =
      range && range.end > range.start
        ? {
            start: Math.min(range.start, raw.length),
            end: Math.min(range.end, raw.length),
            focus: getSelectionFocusEnd(editorDiv) ?? 'end',
          }
        : null

    // An unrecognizable selection (tryGetLineOffset → null: ranges lost to a
    // DOM swap, selection anchored outside this editor) must NOT snap the
    // caret to line 0 — keep it at the current active line. Only forced
    // renders (page load/switch) or a never-placed caret start at the top.
    const offset =
      cursorOffset ??
      (kept ? (kept.focus === 'start' ? kept.start : kept.end) : null) ??
      tryGetLineOffset(editorDiv) ??
      (_force || activeLine < 0 ? 0 : lineStartOffset(raw, activeLine))

    activeLine = determineActiveLine(raw, offset)

    // D3: the cursor's line is raw-rendered — and when it sits INSIDE a
    // multi-line block region (fence, table), EVERY line of the region joins
    // activeLines so the whole block expands to plain source text.
    const doc = buildDocument(raw, contentPlugins)
    const activeLines = new Set<number>([activeLine])
    const region = regionAt(doc.blocks, activeLine)
    if (region) {
      for (let l = region.startLine; l <= region.endLine; l++) activeLines.add(l)
    }

    const context: EditorContext = state.toContext(
      options.navigateFn ??
        ((_p: string): void => {
          /* noop */
        }),
    )

    context.renderInline = (text: string): DocumentFragment => {
      return renderInlineContent(text, contentPlugins, context)
    }

    renderDocLines(doc, contentPlugins, context, editorDiv, activeLines)

    placeholder.style.display = raw.length ? 'none' : 'block'

    try {
      if (kept && kept.end > kept.start) {
        setSelectionOffsets(editorDiv, kept.start, kept.end, kept.focus)
      } else {
        setLineOffset(editorDiv, offset)
      }
    } catch {
      /* noop */
    }
    // Programmatic placements (page load, ops, undo) never scroll on their
    // own; a line-activation render follows a caret the user already sees.
    if (_force || cursorOffset !== undefined) scrollCaretIntoView(editorDiv)
  }

  function checkSelectChange(): boolean {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return false

    // Ignore selections we can't map (outside the editor, or transiently
    // empty during a rebuild) — acting on them would jump the caret to line 0.
    const offset = tryGetLineOffset(editorDiv)
    if (offset === null) return false

    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)
    const newLine = determineActiveLine(raw, offset)

    if (newLine === activeLine) return false
    render()
    return true
  }

  // ── Breadcrumb rendering ──────────────────────────────────────────────────

  let moveHandler: ((to: string) => Promise<string | null>) | null = null

  function setMoveHandler(handler: (to: string) => Promise<string | null>): void {
    moveHandler = handler
  }

  function openMoveField(): void {
    const submit = moveHandler
    if (!submit) return
    dom.container.querySelectorAll('details[open]').forEach((open) => {
      ;(open as HTMLDetailsElement).open = false
    })
    openPageMoveField(breadcrumb, {
      current: state.getCurrentPage(),
      submit,
      close: renderBreadcrumb,
    })
  }

  function renderBreadcrumb(): void {
    renderBreadcrumbChrome(breadcrumb, dom.container, state.getTrail(), {
      homeLabel: options.homeLabel,
      onCrumb: (i) => {
        state.truncateTrail(i)
        const newTrail = state.getTrail()
        const targetPage = newTrail.length <= 1 ? newTrail[0] : newTrail.slice(1).join('/')
        options.onBreadcrumbNavigate?.(targetPage)
      },
      ...(moveHandler ? { onEditActive: openMoveField } : {}),
    })
    options.onTrailChange?.(state.getTrail())
  }

  return { render, renderBreadcrumb, checkSelectChange, setMoveHandler, openMoveField }
}
