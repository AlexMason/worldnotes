# worldnotes Architecture

`worldnotes` is organized around a small editing pipeline: raw editable text is extracted from the DOM, tokenized by registered plugins, rendered back into decorated DOM fragments, and saved through a storage adapter. The document model is backed by a CRDT (`Y.Doc`) enabling local undo/redo and optional real-time multiplayer sync.

## Main Modules

| Module                         | Responsibility                                                                                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                 | Public export surface for editor creation, types, plugins, storage adapters, CRDT primitives, and import/export.                                                                                                                          |
| `src/editor.ts`                | Thin orchestrator: wires sub-modules together in DAG order and exposes `createEditor()` and `EditorBuilder`. `mountEditor()` calls `lifecycle.mount()` which is now async.                                                                 |
| `src/editor-state.ts`          | Owns mutable editor state: `trail` breadcrumb array, `saveTimer`, `isNavigating` flag, and wraps `YDocState`. Delegates `getWorld()` to the CRDT. Exports `createEditorState()`.                                                           |
| `src/editor-dom.ts`            | Builds the editor DOM tree (`wn-root`, `wn-topbar`, `wn-toolbar`, `wn-overlay`, `wn-editor-wrap`, `wn-editor`), injects default styles once. Exports `createEditorDOM()`.                                                                  |
| `src/editor-render.ts`         | Coordinates the extract→tokenize→render→caret pipeline using line-granular re-rendering. Manages breadcrumb rendering and URL synchronization. Exports `createEditorRender()`.                                                            |
| `src/editor-navigation.ts`     | Handles page navigation (`navigateToPage`, `loadPage`), reads/writes `Y.Text` for page content, populates pages into the CRDT docs, and positions the caret after load. Exports `createEditorNavigation()`.                              |
| `src/editor-lifecycle.ts`      | Wires DOM event listeners (input, paste, keydown), syncs DOM content → `Y.Text` on input, connects `WebsocketProvider` for sync, creates `Y.UndoManager` for undo/redo, mounts UI plugins, assembles `EditorInstance`.                   |
| `src/tokenizer.ts`             | Converts raw text into per-line token arrays using plugin token definitions.                                                                                                                                                              |
| `src/renderer.ts`              | Converts tokens into DOM fragments by calling the plugin that owns each token type.                                                                                                                                                       |
| `src/navigation.ts`            | Parses wiki links, derives display names, and encodes or decodes breadcrumb state in the URL.                                                                                                                                             |
| `src/line-renderer.ts`         | Line-granular re-renderer using stable `div[data-line]` containers. Diffs by line text hash; only replaces changed lines and prunes stale containers.                                                                                    |
| `src/awareness-cursor.ts`      | Cursor tracking aware of the `[data-line]` container structure. Computes raw-text offsets by walking line containers instead of arbitrary DOM. `getLineOffset()`, `setLineOffset()`.                                                      |
| `src/y-doc-state.ts`           | CRDT state container: owns a `Y.Doc` with `Y.Map<Y.Text>` pages. Provides auto-create accessor, encode/decode state as Yjs updates, `toContext()`, and lifecycle (`destroy()`). Exports `createYDocState()`.                              |
| `src/yjs-storage-bridge.ts`    | Persistence bridge: `saveYDoc()` encodes the full Y.Doc update to storage key `__ync_update__`; `loadYDoc()` restores it. Also provides raw per-page `savePageRaw()`/`loadPageRaw()` for compatibility.                                     |
| `src/editor-history.ts`        | Standalone undo/redo stack (`EditorHistory` class). Retained as an exported utility but no longer used internally — the editor lifecycle now uses `Y.UndoManager`.                                                                        |
| `src/export-import.ts`         | `exportWorld()` produces a zip with individual `.md` files and a `_worldnotes.yjs` binary for lossless CRDT round-tripping. `importWorld()` restores from zip with configurable conflict strategies.                                        |
| `src/plugins/*`                | Built-in Markdown, wiki-link, and remote-cursor plugins.                                                                                                                                                                                  |
| `src/server/index.ts`          | WebSocket sync server using `y-protocols`. Clients join rooms by `?room=` param. Broadcasts document updates and awareness states.                                                                                                        |
| `src/storage/*`                | Persistence adapters for localStorage, IndexedDB, and the shared storage interface.                                                                                                                                                       |

## Editor Module Dependencies

The editor sub-modules form a strict Directed Acyclic Graph (DAG). Dependencies flow from top (state root) to bottom (orchestrator). Modules at the same tier never import from each other.

```
y-doc-state.ts            ← CRDT source of truth (Y.Doc, no editor-* imports)
    ↓
editor-state.ts           ← mutable state: wraps YDocState, owns trail/timer/flags
    ↓
editor-dom.ts             ← pure DOM functions (no editor-* imports)
    ↓
editor-render.ts          ← imports types from state + dom + pipeline (line-renderer, awareness-cursor, navigation)
    ↓
editor-navigation.ts      ← imports types from state + dom + render; receives render callbacks via setRenderAPI()
    ↓
editor-lifecycle.ts       ← imports types from all above + yjs-storage-bridge, remoteCursors; assembles EditorInstance
    ↓
editor.ts                 ← imports all editor-* modules; thin orchestrator, mount is async
```

External pipeline modules (`tokenizer.ts`, `renderer.ts`, `line-renderer.ts`, `awareness-cursor.ts`, `navigation.ts`) sit at the same level and are imported by `editor-render.ts` and `editor-lifecycle.ts` as needed.

**Construction order in `mountEditor()`:**

1. `createEditorState(storage, options)` — initializes mutable state, wraps `createYDocState()`
2. `createEditorDOM(container)` — builds DOM tree, injects styles
3. `createEditorNavigation(state, storage, dom, options)` — page navigation (no render yet)
4. `createEditorRender(dom, plugins, state, renderOptions)` — render pipeline with navigate callbacks
5. `navigation.setRenderAPI(render)` — two-phase wiring: navigation now has render access
6. `createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, navigation, storage, options)` — event listeners, UI plugin mounting, EditorInstance
7. `lifecycle.mount()` — loads persisted Y.Doc state, connects sync provider, wires undo manager, calls `loadPage(initialPage)`, returns live `EditorInstance`

**Circular dependency prevention:** All cross-module communication uses `import type` (type-only imports erased at compile time). Value imports only flow from editor-_ modules into the orchestrator (`editor.ts`), never between editor-_ modules. Navigation receives its render API via `setRenderAPI()` to avoid a circular dependency with the render module.

## Editor Lifecycle

`createEditor(element, options)` creates an `EditorBuilder`. The builder starts with `defaultPlugins` and a `LocalStorageAdapter`, then lets callers replace plugins or storage before calling `.mount()`.

Mounting delegates to `mountEditor()`, which orchestrates the sub-modules in construction order:

1. `createEditorState` decodes the URL trail, initializes the `YDocState` and mutable state.
2. `createEditorDOM` injects default styles once (idempotent), replaces the container contents with the editor DOM tree.
3. `createEditorNavigation` provides page navigation and loading, using the storage adapter for persistence and `Y.Text` reads/writes.
4. `createEditorRender` connects the render pipeline (extract→tokenize→render→caret) using line-granular re-rendering and breadcrumb rendering.
5. Two-phase wiring: `navigation.setRenderAPI(render)` enables loadPage to trigger re-renders.
6. `createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, navigation, storage, options)` attaches input/paste/keydown event handlers, mounts UI plugins into slots, and returns the `EditorInstance`.
7. `lifecycle.mount()` loads persisted Y.Doc state from storage, optionally connects a `WebsocketProvider` for real-time sync, creates a `Y.UndoManager` for undo/redo, loads the initial page (from URL trail or `options.initialPage`), triggers the first render, and returns the live API surface.

On input, the lifecycle module's event handler syncs DOM `textContent` into `Y.Text` (via `doc.transact()` with delete+insert), calls `render()`, updates awareness cursor state (if sync is active), and schedules a debounced save through the CRDT storage bridge.

## Rendering Pipeline

The render pipeline is coordinated by `editor-render.ts`'s `render()` method. Rather than clearing the entire `innerHTML` on every change, the pipeline uses **line-granular re-rendering** via `renderLines()` in `line-renderer.ts`. Each line of text is rendered into a stable `div[data-line="N"]` container. A `Map<number, string>` cache stores the last-rendered text for each line; only lines whose content differs from the cache are replaced. Stale containers for removed lines are pruned.

The tokenizer receives all registered token definitions in plugin order. Line-level patterns anchored with `^` are tested against each whole line first. Other patterns are scanned left-to-right to find inline tokens while preserving unmatched text as plain `text` tokens.

The renderer builds a token-to-plugin map, then renders each token into a `DocumentFragment`. Text tokens become `TextNode`s. Plugin tokens call `plugin.render(token, context)`. If the plugin defines `onNavigate` and returns an `HTMLElement`, the renderer wires a `mousedown` handler so the plugin can intercept navigation before the editor loses focus.

Cursor position is preserved across re-renders via `awareness-cursor.ts`, which computes raw-text offsets by walking `[data-line]` containers instead of arbitrary DOM tree traversal. This is more reliable than the legacy `cursor.ts` approach because the line-container structure is stable across renders.

## Navigation and World State

Editor state lives in `editor-state.ts` as a closure-based `EditorStateAPI`. The `trail` array tracks breadcrumb navigation. The in-memory `world` object (keyed by page name) is now delegated to `YDocState.getWorld()`, which materializes the full `Y.Map<Y.Text>` into a plain `Record<string, string>` on demand. Both are mutated through the state API methods (`pushTrail`, `truncateTrail`, and via `YDocState.getPage()` for content).

Page navigation is handled by `editor-navigation.ts`. `navigateToPage()` checks the CRDT pages via `yDocState.hasPage()`, auto-creates missing pages by inserting default content into `Y.Text`, pushes the trail, and calls `loadPage()`. `loadPage()` reads the `Y.Text` content, triggers `render(true)` (forcing a full re-render) and `renderBreadcrumb()` (via the wired `EditorRenderAPI`), resets the caret to the start of the document, and calls `options.onPageLoad`.

Nested page names are display-friendly: `projects/acme` renders as `acme` in breadcrumbs unless the link uses pipe syntax, such as `[[projects/acme|Client Portal]]`. URL synchronization is handled by `syncUrlToTrail()` in `editor-render.ts`, which encodes the trail as a `?path=...` query parameter via `history.replaceState`.

## CRDT Document Model

All page content is stored in a **Yjs CRDT** (`Y.Doc`) managed by `y-doc-state.ts`. Each page is a `Y.Text` value keyed by page name in a `Y.Map<Y.Text>` named `"pages"`. This replaces the former `Record<string, string>` world cache.

Key properties of the CRDT model:

- **Auto-creation:** `getPage(name)` returns the existing `Y.Text` or creates a new one and inserts it into the map. A page "exists" only when it has content (or has been accessed).
- **Local editing:** The input handler in `editor-lifecycle.ts` syncs DOM `textContent` into `Y.Text` via `doc.transact()`, doing a delete+insert of the entire text. Future work will support per-character diffs for finer-grained remote edits.
- **Undo/Redo:** `Y.UndoManager` (created per-page in `lifecycle.mount()`) replaces the former `EditorHistory` class. `EditorHistory` remains exported as a standalone utility for consumers not using the Yjs integration. Undo/redo keys: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
- **Persistence:** The full Y.Doc state is serialized via `Y.encodeStateAsUpdate()` (binary) and stored under key `__ync_update__` in the `StorageAdapter`. On mount, `loadYDoc()` restores the update. This preserves CRDT metadata (client IDs, clock vectors) for lossless round-tripping.
- **Hybrid storage:** Individual pages can still be read/written as plain strings via `savePageRaw()`/`loadPageRaw()` for compatibility with non-CRDT consumers.
- **Import/Export:** `exportWorld()` includes a `_worldnotes.yjs` binary entry alongside individual `.md` files. On import, the `.yjs` file is restored first for lossless CRDT state, then `.md` files overlay any additional pages.

The `EditorContext` passed to plugins exposes `getDoc(): Y.Doc`, giving plugins direct access to the CRDT for advanced use cases.

## Sync Architecture

Real-time multiplayer sync is optional and activated by setting `syncServer` (a WebSocket URL) in `EditorOptions`.

**Editor lifecycle wiring (`editor-lifecycle.ts`):**

1. On mount, after loading persisted Y.Doc state, if `options.syncServer` is set, a `WebsocketProvider` from `y-websocket` is created.
2. The room name is `worldnotes-{currentPage}` (derived from the trail), isolating sync to the active page.
3. `syncProvider.awareness` is set on `YDocState` via `setAwareness()`, making it available for cursor tracking.
4. On awareness change events, `renderRemoteCursors()` draws other users' cursors into the `wn-overlay` div.
5. On input, the local cursor offset (computed via `getLineOffset()`) is broadcast via `awareness.setLocalStateField('cursor', { offset, page })`.
6. On reconnect (`status === 'connected'`), a full re-render is triggered to pick up remote changes that arrived while disconnected.

**Server (`src/server/index.ts`):**

A standalone WebSocket server using `y-protocols`:

- Creates an HTTP server with `ws` WebSocket upgrade handling.
- Clients join rooms by `?room=` query parameter (default: `"default"`).
- Each room holds a `Y.Doc` and an `Awareness` instance shared among connected clients.
- On document update, the server broadcasts the Yjs update to all clients in the room via sync protocol message type 0.
- On awareness change, the server re-encodes and broadcasts the awareness update via message type 1.
- On disconnect, the client is removed from the room and its awareness state is cleaned up.

**Remote cursors (`src/plugins/remoteCursors.ts`):**

- Registered as a UI plugin in the `wn-overlay` slot.
- `renderRemoteCursors()` iterates all awareness states (excluding the local client), extracting `cursor.offset` and `user` metadata.
- Each remote cursor is rendered as a caret+label element positioned via `offsetToPixelPosition()`, which walks `[data-line]` containers to estimate pixel coordinates from raw-text offsets.
- Colors are assigned per client ID from a 13-color palette.

## Extension Boundaries

Plugins should stay focused on syntax recognition, rendering, and optional click behavior. Storage adapters should only implement persistence. App-level concerns such as routing shells, sidebars, authentication, synchronization, and export workflows should live outside the library and communicate through the public editor API.

UI plugins populate named DOM slots through their `onMount(slotEl)` lifecycle hook.
The v1 slots are `wn-toolbar` (horizontal flex container between the topbar and editor area)
and `wn-overlay` (absolute-positioned overlay for remote cursors and custom decorations).
Plugins append their own DOM children and are responsible for cleanup in `onDestroy`.
Slot+priority conflicts are detected at registration time by the PluginRegistry.

## Contributor Notes

Run these checks before changing behavior:

```bash
npm run typecheck
npm test
npm run build
```

Prefer small changes that preserve the plugin contract. If you add a new token type, update the built-in plugin list, tests for tokenization or rendering behavior, and the API documentation when the export surface changes.
