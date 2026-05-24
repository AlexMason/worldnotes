# worldnotes Architecture

`worldnotes` is organized around a small editing pipeline: raw editable text is extracted from the DOM, tokenized by registered plugins, rendered back into decorated DOM fragments, and saved through a storage adapter.

## Main Modules

| Module | Responsibility |
|---|---|
| `src/index.ts` | Public export surface for editor creation, types, plugins, and storage adapters. |
| `src/editor.ts` | Mounts the editor DOM, owns navigation state, input handling, rendering, saving, and public instance methods. |
| `src/tokenizer.ts` | Converts raw text into per-line token arrays using plugin token definitions. |
| `src/renderer.ts` | Converts tokens into DOM fragments by calling the plugin that owns each token type. |
| `src/navigation.ts` | Parses wiki links, derives display names, and encodes or decodes breadcrumb state in the URL. |
| `src/cursor.ts` | Preserves caret position while the editor re-renders content. |
| `src/plugins/*` | Built-in Markdown and wiki-link plugins. |
| `src/storage/*` | Persistence adapters for localStorage, IndexedDB, and the shared storage interface. |

## Editor Lifecycle

`createEditor(element, options)` creates an `EditorBuilder`. The builder starts with `defaultPlugins` and a `LocalStorageAdapter`, then lets callers replace plugins or storage before calling `.mount()`.

Mounting injects default styles once, replaces the target element contents with the editor DOM, decodes the initial URL trail, loads the active page, renders breadcrumbs, and focuses the editable area.

On input, the editor preserves the caret offset, extracts raw text, tokenizes and renders it, updates the in-memory world cache, and schedules a debounced save through the configured storage adapter.

## Rendering Pipeline

The tokenizer receives all registered token definitions in plugin order. Line-level patterns anchored with `^` are tested against each whole line first. Other patterns are scanned left-to-right to find inline tokens while preserving unmatched text as plain `text` tokens.

The renderer builds a token-to-plugin map, then renders each token into a `DocumentFragment`. Text tokens become `TextNode`s. Plugin tokens call `plugin.render(token, context)`. If the plugin defines `onNavigate` and returns an `HTMLElement`, the renderer wires a `mousedown` handler so the plugin can intercept navigation before the editor loses focus.

## Navigation and World State

The editor keeps an in-memory `world` object keyed by page name and a `trail` array for breadcrumbs. Wiki links call `context.navigate(page)`, which loads or creates the target page, pushes it onto the trail, and syncs the URL query string.

Nested page names are display-friendly: `projects/acme` renders as `acme` unless the link uses pipe syntax, such as `[[projects/acme|Client Portal]]`.

## Extension Boundaries

Plugins should stay focused on syntax recognition, rendering, and optional click behavior. Storage adapters should only implement persistence. App-level concerns such as routing shells, sidebars, authentication, synchronization, and export workflows should live outside the library and communicate through the public editor API.

## Contributor Notes

Run these checks before changing behavior:

```bash
npm run typecheck
npm test
npm run build
```

Prefer small changes that preserve the plugin contract. If you add a new token type, update the built-in plugin list, tests for tokenization or rendering behavior, and the API documentation when the export surface changes.
