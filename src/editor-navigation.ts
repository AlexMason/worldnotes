// ─── Editor Navigation ────────────────────────────────────────────────────────

import type { StorageAdapter, EditorOptions } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'

/**
 * Default content shown on first load when 'home' doesn't exist in storage.
 * Mirrors the constant in editor.ts so loadPage has its own copy.
 */
const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

/**
 * Public API returned by {@link createEditorNavigation}.
 *
 * @method navigateToPage - Navigate to a page, creating it in the world
 *                          cache and storage if it doesn't exist yet.
 * @method loadPage       - Load a page into the editor view: set textContent,
 *                          trigger render + breadcrumb, restore caret, and
 *                          fire onPageLoad callback.
 * @method setRenderAPI   - Wire the render module after construction so that
 *                          loadPage can call render() and renderBreadcrumb().
 */
export interface EditorNavigationAPI {
  navigateToPage(page: string): Promise<void>
  loadPage(page: string): Promise<void>
  setRenderAPI(render: EditorRenderAPI): void
}

/**
 * Create the page-navigation coordinator.
 *
 * Manages page transitions: caching page content in the world state,
 * loading pages into the editor view, and coordinating with the render
 * module via two-phase construction ({@link setRenderAPI}).
 *
 * @param state   - Editor state (world cache, trail, navigation flag)
 * @param storage - Storage adapter for reading/writing pages
 * @param dom     - Editor DOM references (editorDiv for content display)
 * @param options - Editor options (onPageLoad callback)
 *
 * @returns Navigation API with navigateToPage, loadPage, and setRenderAPI
 *
 * @example
 * const navigation = createEditorNavigation(state, storage, dom, options)
 * // ... later, after render module is created:
 * navigation.setRenderAPI(render)
 * await navigation.loadPage('home')
 */
export function createEditorNavigation(
  state: EditorStateAPI,
  storage: StorageAdapter,
  dom: EditorDOM,
  options: EditorOptions,
): EditorNavigationAPI {
  let _render: EditorRenderAPI | null = null

  /**
   * Wire the render module after construction.
   * This is a two-phase pattern: navigate and loadPage need render, but
   * render needs navigation callbacks. The orchestrator wires them together
   * after both are created.
   */
  function setRenderAPI(render: EditorRenderAPI): void {
    _render = render
  }

  /**
   * Navigate to a page by name. Creates the page in the world cache and
   * storage if it doesn't exist, pushes it onto the trail, and loads it
   * into the editor view.
   */
  async function navigateToPage(page: string): Promise<void> {
    if (!state.world[page]) {
      const stored = await storage.get(page)
      if (!stored) {
        state.setWorldPage(page, `# ${page}\n\n`)
        await storage.set(page, state.world[page])
      } else {
        state.setWorldPage(page, stored)
      }
    }
    state.pushTrail(page)
    await loadPage(page)
  }

  /**
   * Load a page into the editor view. Sets the editor's text content,
   * triggers the render pipeline and breadcrumb, restores the caret to
   * the start, fires onPageLoad, and focuses the editor.
   */
  async function loadPage(page: string): Promise<void> {
    state.setNavigating(true)
    state.history.clear()

    if (!state.world[page]) {
      const stored = await storage.get(page)
      if (!stored && page === 'home') {
        state.setWorldPage(page, DEFAULT_HOME)
        await storage.set(page, DEFAULT_HOME)
      } else {
        state.setWorldPage(page, stored ?? `# ${page}\n\n`)
      }
    }

    const content = state.world[page]
    dom.editorDiv.textContent = content

    if (_render) {
      _render.render()
      _render.renderBreadcrumb()
    }

    // Move cursor to start
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      if (sel) {
        range.setStart(dom.editorDiv, 0)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    } catch {
      /* caret restore failed — best-effort */
    }

    options.onPageLoad?.(page, content)
    state.setNavigating(false)
    dom.editorDiv.focus()
  }

  return { navigateToPage, loadPage, setRenderAPI }
}
