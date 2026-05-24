// ─── Editor Render ───────────────────────────────────────────────────────────

import type { Plugin } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { getCaretOffset, setCaretOffset, extractText } from './cursor'
import { tokenizeDocument } from './tokenizer'
import { renderDocument } from './renderer'
import { pageDisplayName, encodePathSearch } from './navigation'

/**
 * Public API returned by {@link createEditorRender}.
 *
 * @method render           - Run the full render pipeline: extract text,
 *                            tokenize, render DOM fragments, replace
 *                            innerHTML, and restore caret position.
 * @method renderBreadcrumb - Rebuild the breadcrumb trail DOM and sync
 *                            the URL.
 * @method syncUrlToTrail   - Update the browser URL querystring to
 *                            reflect the current navigation trail.
 */
export interface EditorRenderAPI {
  render(): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
}

/**
 * Callbacks wired by the orchestrator after sibling modules are created.
 *
 * @property onBreadcrumbNavigate - Called when a breadcrumb crumb is
 *                                  clicked (with the target page name).
 * @property onTrailChange         - Called after every breadcrumb re-render
 *                                  with a copy of the current trail.
 * @property navigateFn            - The real navigation function wired by
 *                                  the orchestrator after the navigation
 *                                  module exists.  Passed through to
 *                                  {@link EditorStateAPI.toContext} during
 *                                  each render call so plugins receive a
 *                                  live navigate reference.
 */
export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
}

/**
 * Create the render-pipeline coordinator.
 *
 * Produces three functions — {@link EditorRenderAPI.render | render},
 * {@link EditorRenderAPI.renderBreadcrumb | renderBreadcrumb}, and
 * {@link EditorRenderAPI.syncUrlToTrail | syncUrlToTrail} — that
 * together handle extracting text from the contenteditable editor,
 * tokenizing it through registered plugins, building decorated DOM
 * fragments, and keeping the breadcrumb trail and URL in sync.
 *
 * This module depends on the existing pipeline modules (cursor,
 * tokenizer, renderer, navigation) and uses type-only imports for
 * editor-state and editor-dom to avoid runtime dependency cycles.
 *
 * @param dom     - Live DOM references (editorDiv, breadcrumb, placeholder)
 * @param plugins - All registered Plugin instances
 * @param state   - State accessors for trail, world, and EditorContext
 * @param options - Callbacks wired by the orchestrator
 *
 * @example
 * const render = createEditorRender(dom, plugins, state, {
 *   onBreadcrumbNavigate: (page) => editor.navigate(page),
 *   onTrailChange: (trail) => options.onTrailChange?.(trail),
 *   navigateFn: (page) => navigation.navigateToPage(page),
 * })
 */
export function createEditorRender(
  dom: EditorDOM,
  plugins: Plugin[],
  state: EditorStateAPI,
  options: EditorRenderOptions = {},
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom

  // ── Full render pipeline ──────────────────────────────────────────────────

  function render(): void {
    const offset = getCaretOffset(editorDiv)
    const raw = extractText(editorDiv)
    const lines = tokenizeDocument(
      raw,
      plugins.flatMap((p) => p.tokens),
    )

    const context = state.toContext(
      options.navigateFn ??
        ((_p: string): void => {
          /* noop — wired by orchestrator after navigation module is created */
        }),
    )

    const frags = renderDocument(lines, plugins, context, offset)

    editorDiv.innerHTML = ''
    frags.forEach((frag, i) => {
      editorDiv.appendChild(frag)
      if (i < frags.length - 1) editorDiv.appendChild(document.createTextNode('\n'))
    })

    placeholder.style.display = raw.length ? 'none' : 'block'

    try {
      setCaretOffset(editorDiv, offset)
    } catch {
      /* noop */
    }
  }

  // ── Breadcrumb rendering ──────────────────────────────────────────────────

  function renderBreadcrumb(): void {
    breadcrumb.innerHTML = ''
    const trail = state.getTrail()

    trail.forEach((page, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'wn-crumb-sep'
        sep.textContent = '/'
        breadcrumb.appendChild(sep)
      }
      const crumb = document.createElement('span')
      crumb.className = 'wn-crumb' + (i === trail.length - 1 ? ' wn-crumb--active' : '')
      crumb.textContent = pageDisplayName(page)
      if (i < trail.length - 1) {
        crumb.addEventListener('click', () => {
          state.truncateTrail(i)
          const newTrail = state.getTrail()
          const targetPage = newTrail[newTrail.length - 1]
          options.onBreadcrumbNavigate?.(targetPage)
        })
      }
      breadcrumb.appendChild(crumb)
    })

    options.onTrailChange?.(state.getTrail())
    syncUrlToTrail()
  }

  // ── URL sync ──────────────────────────────────────────────────────────────

  function syncUrlToTrail(): void {
    const trail = state.getTrail()
    const search = encodePathSearch(window.location.search, trail)
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search}${window.location.hash}`,
    )
  }

  return { render, renderBreadcrumb, syncUrlToTrail }
}
