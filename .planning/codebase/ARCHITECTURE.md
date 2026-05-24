# Architecture

**Analysis Date:** 2026-05-23

## Architectural Pattern

The library uses a **plugin-based editor pipeline** with a **fluent builder** construction pattern. The core loop is:

```
User types → Extract raw text → Tokenize → Render DOM → Insert into contentEditable → Persist
```

There is no framework — the library is vanilla TypeScript targeting ES2020 with DOM APIs.

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     Public API (src/index.ts)                         │
│  createEditor() → EditorBuilder → .mount() → EditorInstance           │
├──────────────────────────────────────────────────────────────────────┤
│  src/editor.ts                                                       │
│  Orchestrator: DOM creation, navigation, save lifecycle, world state  │
├─────────────┬──────────────────┬──────────────────┬──────────────────┤
│ src/cursor  │ src/tokenizer    │ src/renderer     │ src/navigation   │
│ extractText │ tokenizeDocument │ renderDocument   │ parseWikiLink    │
│ getCaret    │ tokenizeLine     │ renderLine       │ encodePathSearch │
│ setCaret    │ scanInline       │ buildPluginMap   │ decodePathSearch │
├─────────────┴──────────────────┴──────────────────┴──────────────────┤
│  src/plugins/*              │  src/storage/*                         │
│  Plugin implementations     │  StorageAdapter implementations        │
│  (headings, inline, wiki    │  (localStorage, IndexedDB)             │
│   links, defaults)          │                                        │
└─────────────────────────────┴────────────────────────────────────────┘
```

## Core Abstractions

**`Plugin`** (`src/types.ts:74-79`): The primary extension point. A plugin declares which token types it handles (`tokens: TokenDef[]`), how to render them (`render()`), and optionally how to handle clicks (`onNavigate()`). Every plugin has a unique `name` used for replacement during registration.

**`Token`** (`src/types.ts:10-14`): A matched unit of content. Contains `type` (e.g. `'bold'`, `'wiki-link'`), `raw` (original matched string), and `groups` (regex capture groups starting from index 1).

**`TokenDef`** (`src/types.ts:24-27`): A regex pattern paired with a token type name. Patterns must NOT use the `g` flag. Line-level patterns anchor with `^`; inline patterns do not.

**`StorageAdapter`** (`src/types.ts:40-44`): Async key/value persistence interface with `get()`, `set()`, and `keys()`. Two built-in implementations: `LocalStorageAdapter` and `IndexedDBAdapter`. Consumers can implement custom adapters (e.g., REST API, filesystem).

**`EditorContext`** (`src/types.ts:56-60`): Read-only runtime context passed to plugins during render and click events. Provides `navigate()`, `getTrail()`, and `getWorld()` — giving plugins controlled access to editor state without exposing internals.

**`EditorBuilder`** (`src/editor.ts:33-88`): Fluent builder returned by `createEditor()`. Chains `.use()`, `.clearPlugins()`, `.withStorage()`, then `.mount()` to produce an `EditorInstance`. Starts with `defaultPlugins` and `LocalStorageAdapter`.

**`EditorInstance`** (`src/types.ts:114-121`): The live editor surface. Exposes programmatic `navigate()`, `getCurrentPage()`, `getTrail()`, `getContent()`, `setContent()`, and `destroy()`.

**`World`** (`src/editor.ts:122`): An in-memory `Record<string, string>` keyed by page name. Acts as a read-through cache: pages are loaded from storage on first access, then kept in memory for the editor session.

## Component Model

### Plugin Registration

Plugins are registered in order. During tokenization, line-level definitions (those anchored with `^`) are tested first against each line. If a line-level match is found, the entire line is consumed as that single token. Otherwise, inline definitions are scanned left-to-right, always consuming the earliest match and emitting `'text'` tokens for unmatched text.

Plugin registration order matters:
1. `headingsPlugin` (line-level) — must come first so `#` lines are recognized before inline `*` patterns
2. `hrPlugin` (line-level)
3. `blockquotePlugin` (line-level)
4. `wikiLinkPlugin` (inline) — `[[...]]` before `*` to avoid interference
5. `boldPlugin` (inline) — `**...**` before `*` to avoid partial match
6. `italicPlugin` (inline) — `*...*`
7. `inlineCodePlugin` (inline) — `` `...` ``

When `.use(plugin)` is called, if a plugin with the same `name` already exists, it is replaced in-place. `.clearPlugins()` removes all plugins.

### Plugin → Renderer Communication

The renderer builds a `Map<string, Plugin>` (`buildPluginMap()` in `src/renderer.ts:99-107`) mapping each token type to its owning plugin. During rendering, each token's type is looked up in this map. Unrecognized tokens and `'text'` tokens render as plain `TextNode`s.

### Plugin Navigation

Plugins with `onNavigate` handlers receive `mousedown` events (not `click` — `mousedown` fires before the contentEditable loses focus). If `onNavigate` returns `true`, the default action is suppressed, keeping the editor focused. The wiki link plugin uses this to navigate pages without losing cursor context.

## Data Flow

### Primary Input Flow

1. **`input` event** fires on the `contentEditable` div (`src/editor.ts:260`)
2. **`getCaretOffset()`** (`src/cursor.ts:8-14`) records the current caret character position
3. **`extractText()`** (`src/cursor.ts:85-87`) walks the contentEditable DOM:
   - Text nodes contribute their `textContent`
   - `<br>` elements convert to `\n`
   - Block elements (div, p, h1-h6, blockquote, etc.) insert `\n` between blocks
   - Elements with `data-raw` attribute use the raw value instead of visible text (preserving wiki link source `[[projects/acme]]` even though it renders as `acme`)
4. **`tokenizeDocument()`** (`src/tokenizer.ts:95-97`) splits text by `\n`, tokenizes each line via `tokenizeLine()` using all registered `TokenDef`s
5. **`renderDocument()`** (`src/renderer.ts:76-90`) calls `renderLine()` for each line, passing `activeOffset` so tokens containing the caret render as raw text (not decorated)
6. DOM fragments replace `editorDiv.innerHTML`, joined by `\n` `TextNode`s
7. **`setCaretOffset()`** (`src/cursor.ts:24-41`) restores the caret to the recorded position, falling back to end-of-element if the offset exceeds document length
8. **Debounced save**: raw text is stored in the `world` cache immediately; after `saveDebounceMs` (default 600ms), it is persisted through the storage adapter

### Navigation Flow

1. User clicks a wiki link rendered as `wn-wiki-link` span
2. `mousedown` handler fires `plugin.onNavigate(token, context)` (`src/renderer.ts:50-58`)
3. Plugin returns `true` to suppress default, then calls `context.navigate(page)` (`src/plugins/wikiLink.ts:38-42`)
4. `navigateToPage()` (`src/editor.ts:213-221`):
   - Auto-creates the page if not in `world` (defaults to `# {page}\n\n`)
   - Pushes page onto the `trail` array
   - Calls `loadPage()` which sets `editorDiv.textContent`, triggers `render()`, updates breadcrumbs, syncs URL
5. URL is synced via `encodePathSearch()` (`src/navigation.ts:19-28`): trail pages are joined by `/` in a `?path=...` query param, coexisting with other query params

### Persistence Flow

1. On every input, `world[page]` is updated immediately with the raw text
2. A timer with `saveDebounceMs` delay fires `storage.set(page, raw)`
3. On page load, `storage.get(page)` is called; if null and page is `'home'`, `DEFAULT_HOME` content is used
4. On navigation to a new page, if not in `world`, `storage.get(page)` is called

## Lifecycle

### Construction: `createEditor(el, options?)`

Returns an `EditorBuilder` with `defaultPlugins`, `LocalStorageAdapter`, and any provided `EditorOptions`.

### Mounting: `.mount()`

1. **`injectStyles()`** (`src/editor.ts:359-367`): Injects default `wn-*` CSS into `<head>` once (idempotent — checks for `#worldnotes-styles`)
2. **Trail decode**: `decodePathSearch(window.location.search)` reads `?path=home/projects%2Facme` → `['home', 'projects/acme']`. Falls back to `options.initialPage` (default `'home'`)
3. **DOM construction**: Creates a `wn-root` container with `wn-topbar` (breadcrumbs) and `wn-editor-wrap` (placeholder + contentEditable `wn-editor` div)
4. **`context` closure** created: `navigate()`, `getTrail()`, `getWorld()` bound to editor state
5. **Event listeners** attached: `input`, `paste`, `keydown` (Tab/Enter handling) on the contentEditable div
6. **`loadPage(initialPage)`** called: loads content from storage or world cache, renders, sets up breadcrumbs, focuses editor

### Runtime

- Every `input` event triggers the full pipeline (extract → tokenize → render)
- Navigation calls `loadPage()` which replaces `textContent`, re-renders, updates breadcrumbs
- Debounced saves fire asynchronously via `setTimeout`

### Teardown: `.destroy()`

Clears pending save timer, sets `container.innerHTML = ''`

## Extension Points

### Plugin System

The primary extension mechanism. A plugin implements the `Plugin` interface:

```ts
interface Plugin {
  name: string                              // unique identifier
  tokens: TokenDef[]                        // token patterns this plugin handles
  render(token: Token, context: EditorContext): HTMLElement | Text  // DOM output
  onNavigate?(token: Token, context: EditorContext): boolean | void // optional click handler
}
```

- **Inline patterns**: Plain regex, no `^` anchor, no `g` flag
- **Line-level patterns**: Anchored with `^` — these consume entire lines before inline scanning begins
- **`render()` return value**: If an `HTMLElement` is returned AND the plugin has `onNavigate`, a `mousedown` listener is automatically attached
- **Token `raw` preservation**: Rendered elements should set `el.dataset.raw = token.raw` so the cursor module can reconstruct source text from decorated DOM

### Storage Adapters

Implement `StorageAdapter` to plug in any persistence backend. All three methods (`get`, `set`, `keys`) return Promises. Built-in:
- `LocalStorageAdapter(namespace?)` — zero-setup, namespaced `localStorage` keys
- `IndexedDBAdapter(dbName?)` — higher capacity, requires browser support

### Callbacks

`EditorOptions` provides hooks at three lifecycle points:
- `onTrailChange(trail: string[])` — fires on every breadcrumb update
- `onPageLoad(page: string, content: string)` — fires after a page loads into the editor
- `onSave(page: string, content: string)` — fires after debounced persistence completes

### CSS Overrides

The library injects default styles in a `<style id="worldnotes-styles">` element. All styling uses `wn-*` class selectors (no CSS variables, no inline styles). Override by targeting the same class names with higher specificity or later in the cascade.

## Key Design Decisions

1. **Single contentEditable div with inline rendering** — formatting is shown in the same editable area rather than a separate preview pane. This means the tokenizer/renderer must handle caret position preservation carefully.

2. **`data-raw` for cursor fidelity** — When a wiki link `[[projects/acme]]` renders visually as `acme`, the span stores `data-raw="[[projects/acme]]"`. The cursor module uses this to map visual caret positions back to source text offsets, enabling accurate tokenization even when display text differs from raw text.

3. **Re-render occurs even when caret is inside a token** — The renderer receives an `activeOffset` and renders tokens containing the caret as raw text (not decorated). This avoids disrupting the user's editing experience inside a formatted span.

4. **`mousedown` over `click` for navigation** — Using `mousedown` ensures the plugin's `onNavigate` handler executes before the contentEditable loses focus, avoiding a focus/blur cycle.

5. **URL-encoded breadcrumb trail** — The navigation trail is serialized as `?path=home/projects%2Facme` via `history.replaceState`. This allows page refreshes to restore state and makes trails shareable. The `path` param coexists peacefully with other query params.

6. **Fully self-contained build** — Vite is configured with no external dependencies (`external: []`), producing a single UMD/CJS and ESM bundle. The library has zero runtime dependencies.

7. **Plugin ordering is semantic** — Line-level patterns are tested before inline patterns. Within inline patterns, order matters (`**` before `*`). The `EditorBuilder.use()` method supports in-place replacement by plugin name, allowing consumers to override built-in plugins.

8. **No framework, no polyfills** — TypeScript compiles to ES2020 with DOM APIs. Tests run directly via Node.js with `ts.transpileModule()` for on-the-fly compilation, avoiding a separate test bundler.

## Error Handling

- **Caret restoration**: Wrapped in `try/catch` — if the offset is invalid, the editor continues without restoring the caret (`src/editor.ts:176`)
- **Page loading edge cases**: If `storage.get()` fails or returns null, defaults are used (`# {page}\n\n` or `DEFAULT_HOME`)
- **Storage promises**: Errors in `storage.set()`/`storage.get()` bubble up — callers should handle in their adapter implementations
- **IndexedDB**: The `open()` method is called lazily; `ensureOpen()` is called before each operation

## Cross-Cutting Concerns

- **State management**: Two mutable sources — the `world` object (page content cache) and `trail` array (breadcrumb). Both are closures inside `mountEditor()`, not globally accessible.
- **URL synchronization**: `syncUrlToTrail()` uses `history.replaceState` (not `pushState`) to avoid polluting browser history.
- **CSS injection**: Idempotent via a DOM ID check (`#worldnotes-styles`), injected once per page load.
- **Input handling**: Tab inserts 2 spaces, Enter inserts a newline — both prevent default browser behavior. Paste strips formatting and inserts plain text only.

---

*Architecture analysis: 2026-05-23*
