// ─── Token ───────────────────────────────────────────────────────────────────

/**
 * A single matched unit of content produced by the tokenizer.
 *
 * @property type   - Unique string identifying the token kind (e.g. 'bold', 'wiki-link')
 * @property raw    - The full original matched string from source text
 * @property groups - Regex capture groups; index 0 is the first capturing group
 */
export interface Token {
  type: string
  raw: string
  groups: string[]
}

// ─── Token Definition ────────────────────────────────────────────────────────

/**
 * Describes how to detect a token type in raw text.
 *
 * @property type    - Token type name this definition produces
 * @property pattern - Regex used to find the token; must NOT use the 'g' flag
 */
export interface TokenDef {
  type: string
  pattern: RegExp
}

// ─── Storage Adapter ─────────────────────────────────────────────────────────

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
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  keys(): Promise<string[]>
}

// ─── Editor Context ───────────────────────────────────────────────────────────

/**
 * Runtime context passed to plugins at render time and on navigation events.
 * Gives plugins read/write access to the editor's navigation and world state.
 *
 * @method navigate  - Push a new page onto the trail and navigate to it
 * @method getTrail  - Return the current breadcrumb trail (page name array)
 * @method getWorld  - Return a snapshot of all in-memory page content
 */
export interface EditorContext {
  navigate(page: string): void
  getTrail(): string[]
  getWorld(): Record<string, string>
}

// ─── Plugin Lifecycle ──────────────────────────────────────────────────────────

/**
 * Optional lifecycle hooks shared by all plugin categories.
 *
 * @method onInit    - Called immediately after successful registration
 * @method onDestroy - Called before plugin removal or replacement
 */
export interface PluginLifecycle {
  onInit?(): void
  onDestroy?(): void
}

// ─── Content Plugin ───────────────────────────────────────────────────────────

/**
 * A content plugin tokenizes and renders inline or line-level text patterns.
 *
 * Superset of the legacy Plugin interface — all existing Plugin objects
 * are structurally compatible with ContentPlugin when kind + version are added.
 *
 * @property kind       - Discriminant: 'content'
 * @property version    - Semver version string (validated at registration)
 * @property tokens     - TokenDef[] this plugin introduces
 * @property render     - Converts a matched Token into a DOM node
 * @property onNavigate - Optional: called when a token element is interacted with
 * @property onUpdate   - Optional: called after each render cycle (content-specific)
 */
export interface ContentPlugin extends PluginLifecycle {
  name: string
  version: string
  kind: 'content'
  tokens: TokenDef[]
  render(token: Token, context: EditorContext): HTMLElement | Text
  onNavigate?(token: Token, context: EditorContext): boolean | void
  onUpdate?(): void
}

// ─── UI Plugin ─────────────────────────────────────────────────────────────────

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
  name: string
  version: string
  kind: 'ui'
  slots: string[]
  priority?: number
  onMount(slotEl: HTMLElement): void
}

// ─── Storage Plugin ────────────────────────────────────────────────────────────

/**
 * A storage plugin provides a persistence adapter for page content.
 *
 * @property kind    - Discriminant: 'storage'
 * @property version - Semver version string (validated at registration)
 * @property adapter - The StorageAdapter implementation
 */
export interface StoragePlugin extends PluginLifecycle {
  name: string
  version: string
  kind: 'storage'
  adapter: StorageAdapter
}

// ─── Plugin Manifest (Discriminated Union) ─────────────────────────────────────

/**
 * A plugin manifest — the unified plugin registration type.
 *
 * Use discriminated union narrowing via `switch (manifest.kind)` for
 * exhaustiveness checking and type-safe field access.
 */
export type PluginManifest = ContentPlugin | UIPlugin | StoragePlugin

// ─── Plugin (Legacy) ──────────────────────────────────────────────────────────

/**
 * A plugin adds one or more token types to the editor, controls how they
 * render, and optionally handles click/navigation events on those tokens.
 *
 * @property name       - Unique plugin identifier
 * @property tokens     - Token definitions this plugin introduces
 * @property render     - Converts a matched Token into a DOM node
 * @property onNavigate - Optional: called when a token element is clicked;
 *                        return true to suppress default navigation
 *
 * @deprecated Use ContentPlugin from the PluginManifest discriminated union.
 *             This interface is retained for compatibility and will be removed
 *             when all consumers migrate to PluginManifest.
 */
export interface Plugin {
  name: string
  tokens: TokenDef[]
  render(token: Token, context: EditorContext): HTMLElement | Text
  onNavigate?(token: Token, context: EditorContext): boolean | void
}

// ─── Editor Options ───────────────────────────────────────────────────────────

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
  storage?: StorageAdapter
  initialPage?: string
  saveDebounceMs?: number
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
  theme?: string
  onTrailChange?: (trail: string[]) => void
  onPageLoad?: (page: string, content: string) => void
  onSave?: (page: string, content: string) => void
}

// ─── Editor Instance ──────────────────────────────────────────────────────────

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
  destroy(): void
  navigate(page: string): void
  getCurrentPage(): string
  getTrail(): string[]
  getContent(): string
  setContent(content: string): void
}
