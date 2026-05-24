# worldnotes Architecture

`worldnotes` is organized around a small editing pipeline: raw editable text is extracted from the DOM, tokenized by registered plugins, rendered back into decorated DOM fragments, and saved through a storage adapter.

## Main Modules

| Module                     | Responsibility                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`             | Public export surface for editor creation, types, plugins, and storage adapters.                                                                                                                                                          |
| `src/editor.ts`            | Thin orchestrator: wires the 5 sub-modules together in DAG order and exposes `createEditor()` and `EditorBuilder`. (~100 lines, down from 496)                                                                                            |
| `src/editor-state.ts`      | Owns all mutable editor state: `world` page cache, `trail` breadcrumb array, `saveTimer`, and `isNavigating` flag. Exports `createEditorState()` factory returning `EditorStateAPI`.                                                      |
| `src/editor-dom.ts`        | Builds the editor DOM tree (`wn-root`, `wn-topbar`, `wn-toolbar`, `wn-editor-wrap`, `wn-editor`), injects default styles once, and holds the `DEFAULT_CSS` template. Exports `createEditorDOM()` factory returning `EditorDOM`.                         |
| `src/editor-render.ts`     | Coordinates the extract→tokenize→render→caret pipeline. Manages breadcrumb rendering and URL synchronization. Exports `createEditorRender()` factory returning `EditorRenderAPI`.                                                         |
| `src/editor-navigation.ts` | Handles page navigation (`navigateToPage`, `loadPage`), world cache population, storage reads/writes during transitions, and caret placement after page load. Exports `createEditorNavigation()` factory returning `EditorNavigationAPI`. |
| `src/editor-lifecycle.ts`  | Wires DOM event listeners (input, paste, keydown), exposes `insertTextAtSelection()`, assembles the public `EditorInstance`, and manages teardown. Exports `createEditorLifecycle()` factory returning `EditorLifecycleAPI`.              |
| `src/tokenizer.ts`         | Converts raw text into per-line token arrays using plugin token definitions.                                                                                                                                                              |
| `src/renderer.ts`          | Converts tokens into DOM fragments by calling the plugin that owns each token type.                                                                                                                                                       |
| `src/navigation.ts`        | Parses wiki links, derives display names, and encodes or decodes breadcrumb state in the URL.                                                                                                                                             |
| `src/cursor.ts`            | Preserves caret position while the editor re-renders content.                                                                                                                                                                             |
| `src/plugins/*`            | Built-in Markdown and wiki-link plugins.                                                                                                                                                                                                  |
| `src/storage/*`            | Persistence adapters for localStorage, IndexedDB, and the shared storage interface.                                                                                                                                                       |

## Editor Module Dependencies

The 5 editor sub-modules form a strict Directed Acyclic Graph (DAG). Dependencies flow from top (state root) to bottom (orchestrator). Modules at the same tier never import from each other.

```
editor-state.ts          ← source of truth (no editor-* imports)
    ↓
editor-dom.ts            ← pure DOM functions (no editor-* imports)
    ↓
editor-render.ts         ← imports types from state + dom + existing pipeline (cursor, tokenizer, renderer, navigation)
    ↓
editor-navigation.ts     ← imports types from state + dom + render; receives render callbacks via setRenderAPI()
    ↓
editor-lifecycle.ts      ← imports types from all above; assembles EditorInstance
    ↓
editor.ts                ← imports all editor-* modules; thin orchestrator (~40 lines of mountEditor)
```

**Construction order in `mountEditor()`:**

1. `createEditorState(storage, options)` — initializes mutable state
2. `createEditorDOM(container)` — builds DOM tree, injects styles
3. `createEditorNavigation(state, storage, dom, options)` — page navigation (no render yet)
4. `createEditorRender(dom, plugins, state, renderOptions)` — render pipeline with navigate callbacks
5. `navigation.setRenderAPI(render)` — two-phase wiring: navigation now has render access
6. `createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, navigation, storage, options)` — event listeners, UI plugin mounting, EditorInstance
7. `lifecycle.mount()` — calls `loadPage(initialPage)`, returns live `EditorInstance`

**Circular dependency prevention:** All cross-module communication uses `import type` (type-only imports erased at compile time). Value imports only flow from editor-_ modules into the orchestrator (`editor.ts`), never between editor-_ modules. The single exception is `src/editor-lifecycle.ts` importing `extractText` from `src/cursor.ts` (an existing pipeline module, not an editor-\* module). Navigation receives its render API via `setRenderAPI()` to avoid a circular dependency with the render module.

## Editor Lifecycle

`createEditor(element, options)` creates an `EditorBuilder`. The builder starts with `defaultPlugins` and a `LocalStorageAdapter`, then lets callers replace plugins or storage before calling `.mount()`.

Mounting delegates to `mountEditor()`, which orchestrates the 5 sub-modules in construction order:

1. `createEditorState` decodes the URL trail, initializes the world cache and mutable state.
2. `createEditorDOM` injects default styles once (idempotent), replaces the container contents with the editor DOM tree.
3. `createEditorNavigation` provides page navigation and loading, using the storage adapter for persistence.
4. `createEditorRender` connects the render pipeline (extract→tokenize→render→caret) and breadcrumb rendering.
5. Two-phase wiring: `navigation.setRenderAPI(render)` enables loadPage to trigger re-renders.
6. `createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, navigation, storage, options)` attaches input/paste/keydown event handlers, mounts UI plugins into slots, and returns the `EditorInstance`.
7. `lifecycle.mount()` loads the initial page (from URL trail or `options.initialPage`), triggers the first render, and returns the live API surface.

On input, the lifecycle module's event handler calls `render()`, updates the world cache in `editor-state`, and schedules a debounced save through the storage adapter.

## Rendering Pipeline

The render pipeline is coordinated by `editor-render.ts`'s `render()` method. The tokenizer receives all registered token definitions in plugin order. Line-level patterns anchored with `^` are tested against each whole line first. Other patterns are scanned left-to-right to find inline tokens while preserving unmatched text as plain `text` tokens.

The renderer builds a token-to-plugin map, then renders each token into a `DocumentFragment`. Text tokens become `TextNode`s. Plugin tokens call `plugin.render(token, context)`. If the plugin defines `onNavigate` and returns an `HTMLElement`, the renderer wires a `mousedown` handler so the plugin can intercept navigation before the editor loses focus.

## Navigation and World State

Editor state lives in `editor-state.ts` as a closure-based `EditorStateAPI`. The in-memory `world` object (keyed by page name) acts as a read-through cache. The `trail` array tracks breadcrumb navigation. Both are mutated through the state API methods (`setWorldPage`, `pushTrail`, `truncateTrail`).

Page navigation is handled by `editor-navigation.ts`. `navigateToPage()` checks the world cache, auto-creates missing pages, pushes the trail, and calls `loadPage()`. `loadPage()` sets the contentEditable's `textContent`, triggers `render()` and `renderBreadcrumb()` (via the wired `EditorRenderAPI`), resets the caret to the start of the document, and calls `options.onPageLoad`.

Nested page names are display-friendly: `projects/acme` renders as `acme` in breadcrumbs unless the link uses pipe syntax, such as `[[projects/acme|Client Portal]]`. URL synchronization is handled by `syncUrlToTrail()` in `editor-render.ts`, which encodes the trail as a `?path=...` query parameter via `history.replaceState`.

## Extension Boundaries

Plugins should stay focused on syntax recognition, rendering, and optional click behavior. Storage adapters should only implement persistence. App-level concerns such as routing shells, sidebars, authentication, synchronization, and export workflows should live outside the library and communicate through the public editor API.

UI plugins populate named DOM slots through their `onMount(slotEl)` lifecycle hook.
The only v1 slot is `wn-toolbar` — a horizontal flex container between the topbar
and editor area. Plugins append their own DOM children and are responsible for
cleanup in `onDestroy`. Slot+priority conflicts are detected at registration time
by the PluginRegistry.

## Contributor Notes

Run these checks before changing behavior:

```bash
npm run typecheck
npm test
npm run build
```

Prefer small changes that preserve the plugin contract. If you add a new token type, update the built-in plugin list, tests for tokenization or rendering behavior, and the API documentation when the export surface changes.
