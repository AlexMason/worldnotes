import { ContentPlugin, UIPlugin, StorageAdapter, EditorOptions, EditorInstance } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
import { EditorRenderAPI } from './editor-render';
import { EditorNavigationAPI } from './editor-navigation';
/**
 * Public API returned by {@link createEditorLifecycle}.
 *
 * @method mount - Wire event listeners, load initial page, and return a
 *                live {@link EditorInstance} with the public API methods.
 */
export interface EditorLifecycleAPI {
    mount(): EditorInstance;
}
/**
 * Create the editor lifecycle manager.
 *
 * This is the assembly point: registers input/paste/keydown event
 * handlers on the editor div, wraps `insertTextAtSelection`, calls the
 * render pipeline on input, manages save debouncing, and returns the
 * public {@link EditorInstance} object.
 *
 * @param dom             - Editor DOM references (editorDiv for event listeners)
 * @param contentPlugins  - Registered ContentPlugin instances (used for lifecycle hooks)
 * @param uiPlugins       - Registered UIPlugin instances (mounted into DOM slots)
 * @param state           - Editor state (world, trail, save timer, nav flag)
 * @param render          - Render pipeline (render, renderBreadcrumb)
 * @param navigation      - Page navigation (navigateToPage, loadPage)
 * @param storage         - Storage adapter for persisting saves
 * @param options         - Editor options (saveDebounceMs, onSave, onPageLoad)
 *
 * @returns Lifecycle API with a single mount() method that returns EditorInstance
 *
 * @example
 * const lifecycle = createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, nav, storage, opts)
 * const editor = lifecycle.mount()
 * editor.setContent('# new page')
 */
export declare function createEditorLifecycle(dom: EditorDOM, contentPlugins: ContentPlugin[], uiPlugins: UIPlugin[], state: EditorStateAPI, render: EditorRenderAPI, navigation: EditorNavigationAPI, storage: StorageAdapter, options: EditorOptions): EditorLifecycleAPI;
