import { ContentPlugin } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
/**
 * Public API returned by {@link createEditorRender}.
 *
 * @method render           - Run the full render pipeline: extract text,
 *                            tokenize, render DOM fragments, replace
 *                            innerHTML, and restore caret position.
 * @method renderBreadcrumb - Rebuild the breadcrumb trail DOM and sync
 *                            the URL.
 * @method syncUrlToTrail   - Update the browser URL querystring to
 *                            reflect the current navigation trail.
 */
export interface EditorRenderAPI {
    render(): void;
    renderBreadcrumb(): void;
    syncUrlToTrail(): void;
}
/**
 * Callbacks wired by the orchestrator after sibling modules are created.
 *
 * @property onBreadcrumbNavigate - Called when a breadcrumb crumb is
 *                                  clicked (with the target page name).
 * @property onTrailChange         - Called after every breadcrumb re-render
 *                                  with a copy of the current trail.
 * @property navigateFn            - The real navigation function wired by
 *                                  the orchestrator after the navigation
 *                                  module exists.  Passed through to
 *                                  {@link EditorStateAPI.toContext} during
 *                                  each render call so plugins receive a
 *                                  live navigate reference.
 */
export interface EditorRenderOptions {
    onBreadcrumbNavigate?: (page: string) => void;
    onTrailChange?: (trail: string[]) => void;
    navigateFn?: (page: string) => void;
}
/**
 * Create the render-pipeline coordinator.
 *
 * Produces three functions — {@link EditorRenderAPI.render | render},
 * {@link EditorRenderAPI.renderBreadcrumb | renderBreadcrumb}, and
 * {@link EditorRenderAPI.syncUrlToTrail | syncUrlToTrail} — that
 * together handle extracting text from the contenteditable editor,
 * tokenizing it through registered plugins, building decorated DOM
 * fragments, and keeping the breadcrumb trail and URL in sync.
 *
 * This module depends on the existing pipeline modules (cursor,
 * tokenizer, renderer, navigation) and uses type-only imports for
 * editor-state and editor-dom to avoid runtime dependency cycles.
 *
 * @param dom            - Live DOM references (editorDiv, breadcrumb, placeholder)
 * @param contentPlugins - All registered ContentPlugin instances
 * @param state          - State accessors for trail, world, and EditorContext
 * @param options        - Callbacks wired by the orchestrator
 *
 * @example
 * const render = createEditorRender(dom, contentPlugins, state, {
 *   onBreadcrumbNavigate: (page) => editor.navigate(page),
 *   onTrailChange: (trail) => options.onTrailChange?.(trail),
 *   navigateFn: (page) => navigation.navigateToPage(page),
 * })
 */
export declare function createEditorRender(dom: EditorDOM, contentPlugins: ContentPlugin[], state: EditorStateAPI, options?: EditorRenderOptions): EditorRenderAPI;
