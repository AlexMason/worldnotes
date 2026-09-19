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

// ─── Page Store ──────────────────────────────────────────────────────────────

/**
 * Async source of page content — the boundary between the editor and its
 * persistence backend (HTTP API, in-memory store, test fixtures).
 *
 * Replaces the former StorageAdapter + Yjs-bridge persistence model.
 *
 * @method load - Fetch raw Markdown for a page; null when it does not exist
 * @method save - Persist raw Markdown for a page (whole-document write)
 */
export interface PageStore {
  load(page: string): Promise<string | null>
  save(page: string, content: string): Promise<void>
}

// ─── Editor Context ───────────────────────────────────────────────────────────

/**
 * Runtime context passed to plugins at render time and on navigation events.
 * Gives plugins read/write access to the editor's navigation and world state.
 *
 * @method navigate       - Push a new page onto the trail and navigate to it
 * @method getTrail       - Return the current breadcrumb trail (flat path segments)
 * @method getCurrentPage - Return the full current page name
 * @method getWorld       - Return a snapshot of all in-memory page content
 * @method getPageText    - Return raw Markdown for a page ('' if unknown)
 * @method setPageText    - Replace a page's whole content (undo-recorded)
 */
export interface EditorContext {
  navigate(page: string): void
  getTrail(): string[]
  getCurrentPage(): string
  getWorld(): Record<string, string>
  getPageText(page: string): string
  setPageText(page: string, content: string): void
  /**
   * Render inline markdown text (tokenize + render through inline plugins).
   * Optional — plugins that need to render inline content within line-level
   * tokens (headings, blockquotes) should guard with optional chaining.
   * Falls back to plain textContent when not provided.
   */
  renderInline?(text: string): DocumentFragment
}

/**
 * Minimal context for DOM-free static HTML rendering.
 *
 * @method renderInline - Render inline markdown text as an HTML string
 */
export interface StaticRenderContext {
  renderInline(text: string): string
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
  /**
   * Optional: intercept keyboard events before default handling.
   * Called for each content plugin (in registration order) on keydown.
   * Return { cursorOffset: number } to signal the event was consumed and
   * provide the new cursor position after the operation.
   * Return false/void to let the next plugin or default handler run.
   *
   * IMPORTANT: The plugin must persist changes via `context.setPageText()`
   * (whole-document replacement, undo-recorded). DOM changes alone will not
   * persist since there is no extractContentText pass after plugin keydown
   * handling.
   *
   * @param event   - The raw KeyboardEvent
   * @param context - EditorContext for document access
   */
  onKeydown?(
    event: KeyboardEvent,
    context: EditorContext,
  ): { cursorOffset: number } | false | void
  /**
   * Optional: render a token as an HTML string for DOM-free static rendering.
   * When provided, this enables the `renderDocumentToHTML` pipeline.
   *
   * @param token   - The matched token from the tokenizer
   * @param context - Static render context with renderInline for nested tokens
   * @returns       - HTML string representation of the token
   */
  renderToHTML?(token: Token, context: StaticRenderContext): string
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

// ─── Plugin Manifest (Discriminated Union) ────────────────────────────────────────

/**
 * A plugin manifest — the unified plugin registration type.
 *
 * Use discriminated union narrowing via `switch (manifest.kind)` for
 * exhaustiveness checking and type-safe field access.
 */
export type PluginManifest = ContentPlugin | UIPlugin

// ─── Editor Options ───────────────────────────────────────────────────────────

/**
 * Configuration passed to createEditor().
 *
 * @property pageStore      - PageStore backend for loading/saving pages (defaults to in-memory)
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
  pageStore?: PageStore
  initialPage?: string
  /**
   * Raw markdown for the initial page, already known to the client (SSR-embedded
   * in the shell). Seeding the buffer with it lets the editor paint the loaded
   * page synchronously instead of fetching it on mount. When omitted, the first
   * load falls back to the PageStore (and to the seeded defaults for new pages).
   */
  initialContent?: string
  saveDebounceMs?: number
  /**
   * Map of HTTP-style status codes to wiki page names.
   * Defaults to { 404: '404', 403: '403' } when not provided.
   *
   * @example
   * createEditor(el, { statusPages: { 404: 'not-found', 403: 'forbidden', 500: 'error' } })
   */
  statusPages?: Record<number, string>
  /**
   * Show the "Create page?" overlay banner on the 404 page.
   * When false, the 404 page displays without the overlay.
   * Default: true.
   */
  showCreateOverlay?: boolean
  /**
   * Maximum number of undo states per page (default 50).
   * Older states are evicted via FIFO when the limit is reached.
   */
  historyDepth?: number
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

// ─── Toast Notifications ─────────────────────────────────────────────────────

/** Toast variant types. */
export type ToastType = 'info' | 'success' | 'warning' | 'error'

/** Screen corner for toast stacking. */
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

/** Optional action button on a toast. */
export interface ToastAction {
  label: string
  onClick: () => void
}

/** Configuration for a single toast notification. */
export interface ToastOptions {
  /** Fixed ID for idempotent toasts (e.g., "wn-404"). Auto-generated if omitted. */
  id?: string
  message: string
  /** Default: 'info' */
  type?: ToastType
  /** Duration in ms. Default: 4000. Set 0 for persistent. */
  duration?: number
  action?: ToastAction
  /** Default: 'top-right' */
  position?: ToastPosition
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
  /**
   * Undo the last change and restore the previous content.
   * @returns true if an undo was performed
   */
  undo(): boolean
  /**
   * Redo the last undone change.
   * @returns true if a redo was performed
   */
  redo(): boolean
  /** Returns true if there is at least one undoable state */
  canUndo(): boolean
  /** Returns true if there is at least one redoable state */
  canRedo(): boolean
  /**
   * Insert plain text at the current cursor position, replacing any selection.
   * Dispatches an 'input' event so the render pipeline and history tracking fire.
   *
   * @param text - Plain text to insert at the caret position
   */
  insertText(text: string): void
  /**
   * Delete one character after the cursor, or delete the current selection
   * if one exists. Behaves like the Delete key. Dispatches 'input' event.
   */
  deleteForward(): void
  /**
   * Delete one character before the cursor, or delete the current selection
   * if one exists. Behaves like the Backspace key. Dispatches 'input' event.
   */
  deleteBackward(): void
  /**
   * Get the current selection range as raw-text offsets and selected text.
   * Offsets are in the same coordinate space as getContent().
   *
   * @returns Selection info, or null if there is no selection/caret
   */
  getSelection(): { text: string; start: number; end: number } | null
  /**
   * Show a toast notification. Returns the toast ID. If an id is
   * provided and a toast with that id is already visible, the call
   * is a no-op (idempotent).
   */
  notify(options: ToastOptions): string
  /** Dismiss a specific toast by ID. */
  dismiss(toastId: string): void
}
