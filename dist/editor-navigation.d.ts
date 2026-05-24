import { StorageAdapter, EditorOptions } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
import { EditorRenderAPI } from './editor-render';
import { EditorHistory } from './editor-history';
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
    navigateToPage(page: string): Promise<void>;
    loadPage(page: string): Promise<void>;
    setRenderAPI(render: EditorRenderAPI): void;
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
export declare function createEditorNavigation(state: EditorStateAPI, storage: StorageAdapter, dom: EditorDOM, options: EditorOptions, history: EditorHistory): EditorNavigationAPI;
