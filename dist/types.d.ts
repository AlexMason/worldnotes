import type * as Y from 'yjs';
/**
 * A single matched unit of content produced by the tokenizer.
 *
 * @property type   - Unique string identifying the token kind (e.g. 'bold', 'wiki-link')
 * @property raw    - The full original matched string from source text
 * @property groups - Regex capture groups; index 0 is the first capturing group
 */
export interface Token {
    type: string;
    raw: string;
    groups: string[];
}
/**
 * Describes how to detect a token type in raw text.
 *
 * @property type    - Token type name this definition produces
 * @property pattern - Regex used to find the token; must NOT use the 'g' flag
 */
export interface TokenDef {
    type: string;
    pattern: RegExp;
}
/**
 * Async key/value interface for persisting page content.
 * Implement this to swap out localStorage for IndexedDB, a REST API,
 * Electron's filesystem, or any other backend.
 *
 * @method get  - Retrieve a page by name; returns null if not found
 * @method set  - Persist a page by name
 * @method keys - List all stored page names
 */
export interface StorageAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    keys(): Promise<string[]>;
}
/**
 * Runtime context passed to plugins at render time and on navigation events.
 * Gives plugins read/write access to the editor's navigation and world state.
 *
 * @method navigate  - Push a new page onto the trail and navigate to it
 * @method getTrail  - Return the current breadcrumb trail (page name array)
 * @method getWorld  - Return a snapshot of all in-memory page content
 * @method getDoc    - Return the Yjs Y.Doc instance for CRDT access
 */
export interface EditorContext {
    navigate(page: string): void;
    getTrail(): string[];
    getWorld(): Record<string, string>;
    getDoc(): Y.Doc;
    /**
     * Render inline markdown text (tokenize + render through inline plugins).
     * Optional — plugins that need to render inline content within line-level
     * tokens (headings, blockquotes) should guard with optional chaining.
     * Falls back to plain textContent when not provided.
     */
    renderInline?(text: string): DocumentFragment;
}
/**
 * Minimal context for DOM-free static HTML rendering.
 *
 * @method renderInline - Render inline markdown text as an HTML string
 */
export interface StaticRenderContext {
    renderInline(text: string): string;
}
/**
 * Optional lifecycle hooks shared by all plugin categories.
 *
 * @method onInit    - Called immediately after successful registration
 * @method onDestroy - Called before plugin removal or replacement
 */
export interface PluginLifecycle {
    onInit?(): void;
    onDestroy?(): void;
}
/**
 * A content plugin tokenizes and renders inline or line-level text patterns.
 *
 * @property kind       - Discriminant: 'content'
 * @property version    - Semver version string (validated at registration)
 * @property tokens     - TokenDef[] this plugin introduces
 * @property render     - Converts a matched Token into a DOM node
 * @property onNavigate - Optional: called when a token element is interacted with
 * @property onUpdate   - Optional: called after each render cycle (content-specific)
 */
export interface ContentPlugin extends PluginLifecycle {
    name: string;
    version: string;
    kind: 'content';
    tokens: TokenDef[];
    render(token: Token, context: EditorContext): HTMLElement | Text;
    onNavigate?(token: Token, context: EditorContext): boolean | void;
    onUpdate?(): void;
    /**
     * Optional: render a token as an HTML string for DOM-free static rendering.
     * When provided, this enables the `renderDocumentToHTML` pipeline.
     *
     * @param token   - The matched token from the tokenizer
     * @param context - Static render context with renderInline for nested tokens
     * @returns       - HTML string representation of the token
     */
    renderToHTML?(token: Token, context: StaticRenderContext): string;
}
/**
 * A UI plugin mounts DOM into named slots (toolbars, sidebars, overlays).
 *
 * @property kind     - Discriminant: 'ui'
 * @property version  - Semver version string (validated at registration)
 * @property slots    - Slot names this plugin claims
 * @property priority - Ordering within a slot (default 0, lower = first)
 * @property onMount  - Called with the slot's DOM element for mounting
 */
export interface UIPlugin extends PluginLifecycle {
    name: string;
    version: string;
    kind: 'ui';
    slots: string[];
    priority?: number;
    onMount(slotEl: HTMLElement): void;
}
/**
 * A storage plugin provides a persistence adapter for page content.
 *
 * @property kind    - Discriminant: 'storage'
 * @property version - Semver version string (validated at registration)
 * @property adapter - The StorageAdapter implementation
 */
export interface StoragePlugin extends PluginLifecycle {
    name: string;
    version: string;
    kind: 'storage';
    adapter: StorageAdapter;
}
/**
 * A plugin manifest — the unified plugin registration type.
 *
 * Use discriminated union narrowing via `switch (manifest.kind)` for
 * exhaustiveness checking and type-safe field access.
 */
export type PluginManifest = ContentPlugin | UIPlugin | StoragePlugin;
/**
 * Configuration passed to createEditor().
 *
 * @property storage         - StorageAdapter instance (defaults to localStorage)
 * @property initialPage     - Page name to load on mount (defaults to 'home')
 * @property saveDebounceMs  - Milliseconds to debounce saves after input (default 600)
 * @property theme           - Optional CSS string that replaces the entire default stylesheet.
 *                            When provided, the injected <style id="worldnotes-styles"> element
 *                            contains this CSS instead of the default token-driven stylesheet.
 *                            When omitted (default), the --wn-* design token stylesheet is used.
 * @property onTrailChange   - Called whenever the breadcrumb trail changes
 * @property onPageLoad      - Called after a page is loaded into the editor
 * @property onSave          - Called after a page is successfully persisted
 */
export interface EditorOptions {
    storage?: StorageAdapter;
    initialPage?: string;
    saveDebounceMs?: number;
    /**
     * Maximum number of undo states per page (default 50).
     * Older states are evicted via FIFO when the limit is reached.
     */
    historyDepth?: number;
    /**
     * Optional CSS string that replaces the entire default stylesheet.
     * When provided, the injected <style id="worldnotes-styles"> element
     * contains this CSS instead of the default token-driven stylesheet.
     * When omitted (default), the --wn-* design token stylesheet is used.
     *
     * Use this for complete visual customization when token overrides
     * are insufficient.
     *
     * @example
     * // Replace the entire stylesheet with a custom theme
     * createEditor(el, {
     *   theme: '.wn-root { --wn-color-bg: #fff; --wn-color-fg: #111; } ...'
     * })
     */
    theme?: string;
    onTrailChange?: (trail: string[]) => void;
    onPageLoad?: (page: string, content: string) => void;
    onSave?: (page: string, content: string) => void;
    /** WebSocket URL for real-time sync via y-websocket (e.g. ws://localhost:1234) */
    syncServer?: string;
}
/**
 * The live editor returned by EditorBuilder.mount().
 *
 * @method destroy        - Tears down the editor and removes all event listeners
 * @method navigate       - Programmatically navigate to a page
 * @method getCurrentPage - Returns the name of the currently displayed page
 * @method getTrail       - Returns the current breadcrumb trail
 * @method getContent     - Returns the current raw text content
 * @method setContent     - Programmatically set raw content for the current page
 */
export interface EditorInstance {
    destroy(): void;
    navigate(page: string): void;
    getCurrentPage(): string;
    getTrail(): string[];
    getContent(): string;
    setContent(content: string): void;
    /**
     * Undo the last change and restore the previous content.
     * @returns true if an undo was performed
     */
    undo(): boolean;
    /**
     * Redo the last undone change.
     * @returns true if a redo was performed
     */
    redo(): boolean;
    /** Returns true if there is at least one undoable state */
    canUndo(): boolean;
    /** Returns true if there is at least one redoable state */
    canRedo(): boolean;
    /**
     * Insert plain text at the current cursor position, replacing any selection.
     * Dispatches an 'input' event so the render pipeline and history tracking fire.
     *
     * @param text - Plain text to insert at the caret position
     */
    insertText(text: string): void;
    /**
     * Delete one character after the cursor, or delete the current selection
     * if one exists. Behaves like the Delete key. Dispatches 'input' event.
     */
    deleteForward(): void;
    /**
     * Delete one character before the cursor, or delete the current selection
     * if one exists. Behaves like the Backspace key. Dispatches 'input' event.
     */
    deleteBackward(): void;
    /**
     * Get the current selection range as raw-text offsets and selected text.
     * Offsets are in the same coordinate space as getContent().
     *
     * @returns Selection info, or null if there is no selection/caret
     */
    getSelection(): {
        text: string;
        start: number;
        end: number;
    } | null;
}
