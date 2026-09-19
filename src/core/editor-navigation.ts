// ─── Editor Navigation ────────────────────────────────────────────────────────

import type { PageStore, EditorOptions } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'

const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

const DEFAULT_STATUS_CONTENT: Record<number, string> = {
  404: '# Page Not Found\n\n',
}

function defaultStatusContent(code: number): string {
  return DEFAULT_STATUS_CONTENT[code] ?? `# Error ${code}\n\n`
}

export interface EditorNavigationAPI {
  navigateToPage(page: string): Promise<void>
  loadPage(page: string): Promise<void>
  setRenderAPI(render: EditorRenderAPI): void
}

export function createEditorNavigation(
  state: EditorStateAPI,
  pageStore: PageStore,
  dom: EditorDOM,
  options: EditorOptions,
): EditorNavigationAPI {
  let _render: EditorRenderAPI | null = null

  function setRenderAPI(render: EditorRenderAPI): void {
    _render = render
  }

  function resolveStatusPage(code: number): string {
    return options.statusPages?.[code] ?? String(code)
  }

  async function navigateToStatusPage(code: number): Promise<void> {
    const statusPage = resolveStatusPage(code)
    const buffers = state.getPageBuffers()

    if (!buffers.hasPage(statusPage)) {
      buffers.setPageText(statusPage, defaultStatusContent(code))
    }

    await navigateToPage(statusPage)
  }

  async function navigateToPage(page: string): Promise<void> {
    const buffers = state.getPageBuffers()

    // Clear pending requested page unless navigating to a status page
    const statusPageNames = new Set([
      ...Object.values(options.statusPages ?? {}),
      ...Object.keys(options.statusPages ?? {}).map((k) => String(k)),
      '404',
    ])
    if (!statusPageNames.has(page)) {
      state.setPendingRequestedPage(null)
    }

    if (!buffers.hasPage(page)) {
      const stored = await pageStore.load(page)

      if (stored !== null) {
        if (buffers.getPageText(page) === '') {
          buffers.setPageText(page, stored)
          // Loaded state is the undo baseline — undo should never go
          // back to the empty pre-load buffer.
          buffers.clearHistory(page)
        }
      } else {
        state.setPendingRequestedPage(page)
        await navigateToStatusPage(404)
        return
      }
    }

    const trail = state.getTrail()

    if (page === trail[0]) {
      state.truncateTrail(0)
      await loadPage(page)
      return
    }

    const segments = page.split('/')

    let matchCount = 0
    for (let i = 1; i < trail.length && matchCount < segments.length; i++) {
      if (trail[i] === segments[matchCount]) {
        matchCount++
      } else {
        break
      }
    }

    state.truncateTrail(matchCount)
    for (let i = matchCount; i < segments.length; i++) {
      state.pushTrail(segments[i])
    }

    await loadPage(page)
  }

  async function loadPage(page: string): Promise<void> {
    state.setNavigating(true)

    const buffers = state.getPageBuffers()
    let pageExisted = buffers.hasPage(page)
    if (!pageExisted) {
      // Initial mounts land here directly (no prior navigateToPage) — hydrate
      // from the store so the first-painted page matches persisted content.
      const stored = await pageStore.load(page)
      if (stored !== null) {
        buffers.setPageText(page, stored)
        pageExisted = true
      }
    }
    let content = buffers.getPageText(page)

    if (!content && !pageExisted) {
      if (page === (options.homeSlug ?? 'home')) {
        content = DEFAULT_HOME
      } else {
        content = `# ${page}\n\n`
      }
      buffers.setPageText(page, content)
      buffers.clearHistory(page) // seeded content is the undo baseline
    }

    // Force full re-render for page load
    dom.editorDiv.innerHTML = ''

    if (_render) {
      _render.render(true)
      _render.renderBreadcrumb()
    }

    // Move cursor to start
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      if (sel) {
        const firstLine = dom.editorDiv.querySelector('[data-line="0"]')
        if (firstLine) {
          range.setStart(firstLine, 0)
        } else {
          range.setStart(dom.editorDiv, 0)
        }
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    } catch {
      /* best-effort */
    }

    options.onPageLoad?.(page, content)
    state.setNavigating(false)
    dom.editorDiv.focus()
  }

  return { navigateToPage, loadPage, setRenderAPI }
}
