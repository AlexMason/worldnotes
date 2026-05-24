// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import type { Plugin, StorageAdapter, EditorOptions, EditorInstance } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { extractText } from './cursor'

/**
 * Public API returned by {@link createEditorLifecycle}.
 *
 * @method mount - Wire event listeners, load initial page, and return a
 *                live {@link EditorInstance} with the public API methods.
 */
export interface EditorLifecycleAPI {
  mount(): EditorInstance
}

/**
 * Create the editor lifecycle manager.
 *
 * This is the assembly point: registers input/paste/keydown event
 * handlers on the editor div, wraps `insertTextAtSelection`, calls the
 * render pipeline on input, manages save debouncing, and returns the
 * public {@link EditorInstance} object.
 *
 * @param dom        - Editor DOM references (editorDiv for event listeners)
 * @param plugins    - Registered plugins (passed through for consistency)
 * @param state      - Editor state (world, trail, save timer, nav flag)
 * @param render     - Render pipeline (render, renderBreadcrumb)
 * @param navigation - Page navigation (navigateToPage, loadPage)
 * @param storage    - Storage adapter for persisting saves
 * @param options    - Editor options (saveDebounceMs, onSave, onPageLoad)
 *
 * @returns Lifecycle API with a single mount() method that returns EditorInstance
 */
export function createEditorLifecycle(
  dom: EditorDOM,
  plugins: Plugin[],
  state: EditorStateAPI,
  render: EditorRenderAPI,
  navigation: EditorNavigationAPI,
  storage: StorageAdapter,
  options: EditorOptions,
): EditorLifecycleAPI {
  // TODO: implement in GREEN phase
  function mount(): EditorInstance {
    throw new Error('not implemented')
  }

  return { mount }
}
