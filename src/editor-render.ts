// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin, EditorContext } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { getLineOffset, setLineOffset } from './awareness-cursor'
import { renderLines } from './line-renderer'
import { renderInlineContent } from './renderer'
import { pageDisplayName, encodePathSearch } from './navigation'

export interface EditorRenderAPI {
  render(force?: boolean, cursorOffset?: number): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
  checkSelectChange(): void
}

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
  statusPages?: Record<number, string>
  showCreateOverlay?: boolean
}

function determineActiveLine(raw: string, offset: number): number {
  let line = 0
  for (let i = 0; i < Math.min(offset, raw.length); i++) {
    if (raw[i] === '\n') line++
  }
  return line
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
    const offset = cursorOffset ?? getLineOffset(editorDiv)

    const yDocState = state.getYDocState()
    const page = state.getCurrentPage()
    const ytext = yDocState.getPage(page)
    const raw = ytext.toString()

    activeLine = determineActiveLine(raw, offset)

    const activeLines = new Set<number>([activeLine])

    const aw = yDocState.awareness as {
      getStates: () => Map<number, { cursor?: { page?: string; activeLine?: number } }>
    } | null
    if (aw) {
      const localId = yDocState.doc.clientID
      for (const [clientId, state] of aw.getStates().entries()) {
        if (clientId !== localId && state.cursor?.page === page) {
          if (state.cursor.activeLine !== undefined) {
            activeLines.add(state.cursor.activeLine)
          }
        }
      }
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

    renderLines(raw, contentPlugins, context, editorDiv, activeLines)

    placeholder.style.display = raw.length ? 'none' : 'block'

    try {
      setLineOffset(editorDiv, offset)
    } catch {
      /* noop */
    }

    renderCreateOverlay()
  }

  // ── Create overlay (404 page banner) ──────────────────────────────────────

  const OVERLAY_CLASS = 'wn-create-overlay'

  function renderCreateOverlay(): void {
    const existing = dom.body.querySelector(`.${OVERLAY_CLASS}`)
    if (existing) existing.remove()

    const statusPages = options.statusPages ?? {}
    const notFoundPage = statusPages[404] ?? '404'
    const currentPage = state.getCurrentPage()
    const requestedPage = state.getPendingRequestedPage()
    const showOverlay = options.showCreateOverlay !== false

    if (currentPage !== notFoundPage || !requestedPage || !showOverlay) return

    const banner = document.createElement('div')
    banner.className = OVERLAY_CLASS
    banner.style.cssText =
      'padding:8px 14px;background:var(--wn-color-surface,#0a0a0c);border-bottom:0.5px solid var(--wn-color-border,#1f1f23);font-family:var(--wn-font-mono,monospace);font-size:var(--wn-font-size-small,12px);display:flex;align-items:center;gap:8px;flex-shrink:0'

    const text = document.createElement('span')
    text.textContent = `Page "${requestedPage}" not found.`
    text.style.color = 'var(--wn-color-fg-muted,#4a4a5e)'

    const button = document.createElement('button')
    button.textContent = 'Create'
    button.style.cssText =
      'padding:2px 8px;background:var(--wn-color-wiki-link-bg,#16142a);color:var(--wn-color-wiki-link,#9b8fe8);border:0.5px solid var(--wn-color-wiki-link-border,#332d6a);border-radius:var(--wn-radius-wiki-link,4px);cursor:pointer;font-family:var(--wn-font-mono,monospace);font-size:var(--wn-font-size-small,12px)'

    button.addEventListener('click', () => {
      const page = requestedPage
      const yDocState = state.getYDocState()
      const ytext = yDocState.getPage(page)
      if (ytext.toString() === '') {
        ytext.insert(0, `# ${page}\n\n`)
      }
      state.setPendingRequestedPage(null)
      const navFn = options.navigateFn
      if (navFn) {
        navFn(page)
      }
    })

    banner.appendChild(text)
    banner.appendChild(button)

    const editorWrap = dom.body.querySelector('.wn-editor-wrap')
    if (editorWrap) {
      dom.body.insertBefore(banner, editorWrap)
    } else {
      dom.body.prepend(banner)
    }
  }

  function checkSelectChange(): void {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return

    const offset = getLineOffset(editorDiv)
    const yDocState = state.getYDocState()
    const page = state.getCurrentPage()
    const raw = yDocState.getPage(page).toString()
    const newLine = determineActiveLine(raw, offset)

    if (newLine !== activeLine) {
      render()
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
      crumb.className =
        'wn-crumb' + (i === trail.length - 1 ? ' wn-crumb--active' : '')
      crumb.textContent = pageDisplayName(page)
      if (i < trail.length - 1) {
        crumb.addEventListener('click', () => {
          state.truncateTrail(i)
          const newTrail = state.getTrail()
          const targetPage = newTrail.length <= 1 ? newTrail[0] : newTrail.slice(1).join('/')
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

  return { render, renderBreadcrumb, syncUrlToTrail, checkSelectChange }
}
