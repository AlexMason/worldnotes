// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { getLineOffset, setLineOffset } from './awareness-cursor'
import { renderLines } from './line-renderer'
import { pageDisplayName, encodePathSearch } from './navigation'

export interface EditorRenderAPI {
  render(force?: boolean): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
  checkSelectChange(): void
}

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
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

  function render(_force = false): void {
    const offset = getLineOffset(editorDiv)

    const yDocState = state.getYDocState()
    const trail = state.getTrail()
    const page = trail[trail.length - 1]
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

    const context = state.toContext(
      options.navigateFn ??
        ((_p: string): void => {
          /* noop */
        }),
    )

    renderLines(raw, contentPlugins, context, editorDiv, activeLines)

    placeholder.style.display = raw.length ? 'none' : 'block'

    try {
      setLineOffset(editorDiv, offset)
    } catch {
      /* noop */
    }
  }

  function checkSelectChange(): void {
    const offset = getLineOffset(editorDiv)
    const yDocState = state.getYDocState()
    const trail = state.getTrail()
    const page = trail[trail.length - 1]
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

  return { render, renderBreadcrumb, syncUrlToTrail, checkSelectChange }
}
