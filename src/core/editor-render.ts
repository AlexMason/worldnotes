// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin, EditorContext } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { NotificationSystem } from './notifications'
import { getLineOffset, setLineOffset } from './caret-offset'
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
  notifications?: NotificationSystem
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
  const { notifications } = options

  let activeLine = -1

  // ── Full render pipeline ──────────────────────────────────────────────────

  function render(_force = false, cursorOffset?: number): void {
    const offset = cursorOffset ?? getLineOffset(editorDiv)

    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)

    activeLine = determineActiveLine(raw, offset)

    const activeLines = new Set<number>([activeLine])

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

    // ── 404 toast (via notification system) ────────────────────────────────

    if (notifications) {
      const statusPages = options.statusPages ?? {}
      const notFoundPage = statusPages[404] ?? '404'
      const currentPage = state.getCurrentPage()
      const requestedPage = state.getPendingRequestedPage()
      const showOverlay = options.showCreateOverlay !== false

      if (currentPage === notFoundPage && requestedPage && showOverlay) {
        const navigateFn = options.navigateFn
        notifications.notify({
          id: 'wn-404',
          message: `Page "${requestedPage}" not found.`,
          type: 'info',
          duration: 0,
          action: {
            label: 'Create',
            onClick: () => {
              const page = requestedPage
              const buffers = state.getPageBuffers()
              if (buffers.getPageText(page) === '') {
                buffers.setPageText(page, `# ${page}\n\n`)
              }
              state.setPendingRequestedPage(null)
              if (navigateFn) {
                navigateFn(page)
              }
              notifications.dismiss('wn-404')
            },
          },
        })
      } else {
        notifications.dismiss('wn-404')
      }
    }
  }

  function checkSelectChange(): void {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return

    const offset = getLineOffset(editorDiv)
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
