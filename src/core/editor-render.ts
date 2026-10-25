// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin, EditorContext } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { setLineOffset, tryGetLineOffset } from './caret-offset'
import { renderDocLines } from './line-renderer'
import { buildDocument, regionAt } from './document'
import { renderInlineContent } from './renderer'
import { renderBreadcrumb as renderBreadcrumbChrome } from './breadcrumb'

export interface EditorRenderAPI {
  render(force?: boolean, cursorOffset?: number): void
  renderBreadcrumb(): void
  checkSelectChange(): void
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

    // An unrecognizable selection (tryGetLineOffset → null: ranges lost to a
    // DOM swap, selection anchored outside this editor) must NOT snap the
    // caret to line 0 — keep it at the current active line. Only forced
    // renders (page load/switch) or a never-placed caret start at the top.
    const offset =
      cursorOffset ??
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
      setLineOffset(editorDiv, offset)
    } catch {
      /* noop */
    }
  }

  function checkSelectChange(): void {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return

    // Ignore selections we can't map (outside the editor, or transiently
    // empty during a rebuild) — acting on them would jump the caret to line 0.
    const offset = tryGetLineOffset(editorDiv)
    if (offset === null) return

    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)
    const newLine = determineActiveLine(raw, offset)

    if (newLine !== activeLine) {
      render()
    }
  }

  // ── Breadcrumb rendering ──────────────────────────────────────────────────

  function renderBreadcrumb(): void {
    renderBreadcrumbChrome(breadcrumb, dom.container, state.getTrail(), {
      homeLabel: options.homeLabel,
      onCrumb: (i) => {
        state.truncateTrail(i)
        const newTrail = state.getTrail()
        const targetPage = newTrail.length <= 1 ? newTrail[0] : newTrail.slice(1).join('/')
        options.onBreadcrumbNavigate?.(targetPage)
      },
    })
    options.onTrailChange?.(state.getTrail())
  }

  return { render, renderBreadcrumb, checkSelectChange }
}
