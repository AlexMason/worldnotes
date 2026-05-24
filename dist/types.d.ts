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
 */
export interface EditorContext {
    navigate(page: string): void;
    getTrail(): string[];
    getWorld(): Record<string, string>;
}
/**
 * A plugin adds one or more token types to the editor, controls how they
 * render, and optionally handles click/navigation events on those tokens.
 *
 * @property name       - Unique plugin identifier
 * @property tokens     - Token definitions this plugin introduces
 * @property render     - Converts a matched Token into a DOM node
 * @property onNavigate - Optional: called when a token element is clicked;
 *                        return true to suppress default navigation
 */
export interface Plugin {
    name: string;
    tokens: TokenDef[];
    render(token: Token, context: EditorContext): HTMLElement | Text;
    onNavigate?(token: Token, context: EditorContext): boolean | void;
}
/**
 * Configuration passed to createEditor().
 *
 * @property storage         - StorageAdapter instance (defaults to localStorage)
 * @property initialPage     - Page name to load on mount (defaults to 'home')
 * @property saveDebounceMs  - Milliseconds to debounce saves after input (default 600)
 * @property onTrailChange   - Called whenever the breadcrumb trail changes
 * @property onPageLoad      - Called after a page is loaded into the editor
 * @property onSave          - Called after a page is successfully persisted
 */
export interface EditorOptions {
    storage?: StorageAdapter;
    initialPage?: string;
    saveDebounceMs?: number;
    onTrailChange?: (trail: string[]) => void;
    onPageLoad?: (page: string, content: string) => void;
    onSave?: (page: string, content: string) => void;
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
}
