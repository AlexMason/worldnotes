// ─── Editor Navigation ────────────────────────────────────────────────────────

import type { StorageAdapter, EditorOptions } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'

const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

export interface EditorNavigationAPI {
  navigateToPage(page: string): Promise<void>
  loadPage(page: string): Promise<void>
  setRenderAPI(render: EditorRenderAPI): void
}

export function createEditorNavigation(
  state: EditorStateAPI,
  storage: StorageAdapter,
  dom: EditorDOM,
  options: EditorOptions,
): EditorNavigationAPI {
  let _render: EditorRenderAPI | null = null

  function setRenderAPI(render: EditorRenderAPI): void {
    _render = render
  }

  async function navigateToPage(page: string): Promise<void> {
    const yDocState = state.getYDocState()

    if (!yDocState.hasPage(page)) {
      const stored = await storage.get(page)
      if (stored) {
        const ytext = yDocState.getPage(page)
        if (ytext.toString() === '') {
          ytext.insert(0, stored)
        }
      } else {
        const ytext = yDocState.getPage(page)
        ytext.insert(0, `# ${page}\n\n`)
      }
    }

    state.pushTrail(page)
    await loadPage(page)
  }

  async function loadPage(page: string): Promise<void> {
    state.setNavigating(true)

    const yDocState = state.getYDocState()
    const ytext = yDocState.getPage(page)
    const content = ytext.toString()

    if (!content && page === 'home') {
      ytext.insert(0, DEFAULT_HOME)
    } else if (!content) {
      ytext.insert(0, `# ${page}\n\n`)
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

    options.onPageLoad?.(page, ytext.toString())
    state.setNavigating(false)
    dom.editorDiv.focus()
  }

  return { navigateToPage, loadPage, setRenderAPI }
}
