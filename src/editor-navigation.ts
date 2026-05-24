// ─── Editor Navigation ────────────────────────────────────────────────────────

import type { StorageAdapter, EditorOptions } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'

/**
 * Public API returned by {@link createEditorNavigation}.
 *
 * @method navigateToPage - Navigate to a page, creating it if needed
 * @method loadPage       - Load a page into the editor view
 * @method setRenderAPI   - Wire render callbacks after construction
 */
export interface EditorNavigationAPI {
  navigateToPage(page: string): Promise<void>
  loadPage(page: string): Promise<void>
  setRenderAPI(render: EditorRenderAPI): void
}

/**
 * Create the page-navigation coordinator.
 *
 * Manages page transitions: caching page content, loading pages into
 * the editor view, and coordinating with the render module via
 * two-phase construction (setRenderAPI).
 *
 * @param state   - Editor state (world cache, trail, navigation flag)
 * @param storage - Storage adapter for reading/writing pages
 * @param dom     - Editor DOM references (editorDiv for content display)
 * @param options - Editor options (onPageLoad callback)
 *
 * @returns Navigation API with navigateToPage, loadPage, and setRenderAPI
 */
export function createEditorNavigation(
  state: EditorStateAPI,
  storage: StorageAdapter,
  dom: EditorDOM,
  options: EditorOptions,
): EditorNavigationAPI {
  // TODO: implement in GREEN phase
  return {
    navigateToPage: async (_page: string) => {
      throw new Error('not implemented')
    },
    loadPage: async (_page: string) => {
      throw new Error('not implemented')
    },
    setRenderAPI: (_render: EditorRenderAPI) => {
      throw new Error('not implemented')
    },
  }
}
