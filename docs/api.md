# worldnotes API Reference

This page summarizes the public API exported from `worldnotes`.

> **Dependencies:** The import/export utilities require `jszip`. Install it alongside
> worldnotes: `npm install jszip`.

## Editor Creation

```ts
import { createEditor } from 'worldnotes'

const editor = createEditor(element, options)
  .use(plugin)
  .withStorage(adapter)
  .mount()
```

### `createEditor(el, options?)`

Creates an `EditorBuilder` for an existing `HTMLElement`.

| Option | Type | Default | Description |
|---|---|---|---|
| `storage` | `StorageAdapter` | `LocalStorageAdapter` | Persistence backend for page content. |
| `initialPage` | `string` | `'home'` | Page loaded when no URL trail exists. |
| `saveDebounceMs` | `number` | `600` | Delay before persisting content after input. |
| `historyDepth` | `number` | `50` | Maximum number of undo states per page. Older states are evicted via FIFO. |
| `onTrailChange` | `(trail: string[]) => void` | `undefined` | Called whenever breadcrumbs change. |
| `onPageLoad` | `(page: string, content: string) => void` | `undefined` | Called after content loads into the editor. |
| `onSave` | `(page: string, content: string) => void` | `undefined` | Called after debounced persistence completes. |

## `EditorBuilder`

The builder configures the editor before mounting.

| Method | Description |
|---|---|
| `.use(plugin)` | Adds a plugin or replaces an existing plugin with the same `name`. |
| `.clearPlugins()` | Removes all default plugins so only explicitly added plugins run. |
| `.withStorage(adapter)` | Replaces the current storage adapter. |
| `.mount()` | Creates the DOM, loads content, and returns an `EditorInstance`. |

## `EditorInstance`

The mounted editor exposes runtime controls:

```ts
editor.navigate('notes/today')
editor.getCurrentPage()
editor.getTrail()
editor.getContent()
editor.setContent('# Updated')
editor.undo()
editor.redo()
editor.destroy()
```

| Method | Description |
|---|---|
| `navigate(page)` | Pushes a page onto the trail and loads it. |
| `getCurrentPage()` | Returns the active page name. |
| `getTrail()` | Returns a copy of the breadcrumb trail. |
| `getContent()` | Returns the current raw Markdown content. |
| `setContent(content)` | Replaces the current page content in the editor and in-memory cache. |
| `undo()` | Undoes the last change. Returns `true` if an undo was performed. |
| `redo()` | Redoes the last undone change. Returns `true` if a redo was performed. |
| `canUndo()` | Returns `true` if there is at least one undoable state. |
| `canRedo()` | Returns `true` if there is at least one redoable state. |
| `destroy()` | Clears the mounted container and pending save timer. |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Cmd+Z` | Undo the last change |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo the last undone change |
| `Ctrl+Y` | Redo (Windows alternative) |
| `Tab` | Insert 2 spaces |
| `Enter` | Insert newline |

Undo/redo history is per-page. Navigating to a different page or clicking a breadcrumb clears the history for the destination page.

## Plugins

Plugins are declared as `ContentPlugin` manifests with explicit `kind`, `version`, and
optional lifecycle hooks. The `kind` field discriminates plugin categories: `'content'`
(token-based rendering), `'ui'` (DOM slot injection), and `'storage'` (persistence adapters).

```ts
import type { ContentPlugin, Token, EditorContext } from 'worldnotes'

const mentionPlugin: ContentPlugin = {
  name: 'mention',
  version: '1.0.0',
  kind: 'content',
  tokens: [{ type: 'mention', pattern: /@(\w+)/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.className = 'my-mention'
    el.textContent = `@${token.groups[0]}`
    el.dataset.raw = token.raw  // required for cursor fidelity
    return el
  },
}
```

Inline token patterns should not use `^` and should not use the `g` flag. Line-level token
patterns should anchor with `^`, because they are checked against the whole line before
inline scanning. **Always set `el.dataset.raw = token.raw`** on rendered elements — the
cursor module relies on this attribute to track caret positions through decorated text.

### Lifecycle Hooks

Content plugins support optional lifecycle hooks:

- `onInit?(): void` — called immediately after plugin registration via `editor.use()`
- `onUpdate?(): void` — called after each render cycle (every keystroke)
- `onDestroy?(): void` — called when the plugin is replaced or the editor is destroyed

### Built-in Plugins

Built-in plugin exports include `defaultPlugins`, `wikiLinkPlugin`, `headingsPlugin`,
`boldPlugin`, `italicPlugin`, `strikethroughPlugin`, `inlineCodePlugin`, `blockquotePlugin`,
`hrPlugin`, and `linkPlugin`.

### PluginManifest Types

The library exports three plugin interfaces and a union type:

| Type | Description |
|------|-------------|
| `ContentPlugin` | Token-based render plugins (`kind: 'content'`) — defines token patterns, renders DOM, optional navigation |
| `UIPlugin` | DOM slot injection plugins (`kind: 'ui'`) — mounts content in named editor slots |
| `StoragePlugin` | Storage adapter plugins (`kind: 'storage'`) — provides a custom `StorageAdapter` implementation |
| `PluginManifest` | Union type: `ContentPlugin \| UIPlugin \| StoragePlugin` — use this for `editor.use()` parameter type |

### Version Validation

The `version` field must match semver format `X.Y.Z` or `X.Y.Z-prerelease` (e.g., `1.0.0`,
`0.1.0-alpha`, `2.3.1-beta.2.3`). Invalid versions throw at registration time. Build
metadata (`+build`) is not supported in this version.

## Storage Adapters

Storage adapters provide async key/value persistence for page content.

```ts
import type { StorageAdapter } from 'worldnotes'

class RemoteStorage implements StorageAdapter {
  async get(page: string): Promise<string | null> { /* ... */ }
  async set(page: string, content: string): Promise<void> { /* ... */ }
  async keys(): Promise<string[]> { /* ... */ }
}
```

`LocalStorageAdapter` is the default and stores namespaced keys in `window.localStorage`.
`IndexedDBAdapter` stores pages in an IndexedDB object store and is a better fit for larger worlds.

> **Future:** Storage adapters can be wrapped as `StoragePlugin` manifests (`kind: 'storage'`)
> when the storage-as-plugin feature lands in a future release. For now, use
> `editor.withStorage(adapter)`.

## Import / Export

Standalone utilities for exporting and importing all pages as a `.zip` of nested
markdown files.

```ts
import { exportWorld, importWorld } from 'worldnotes'

// Export all pages to a downloadable Blob
const blob = await exportWorld(storage, { filename: 'my-world.zip' })

// Import pages from a zip file
const result = await importWorld(storage, file, { strategy: 'overwrite' })
console.log(result.imported) // ['home', 'projects/acme']
console.log(result.skipped)  // []
```

### `exportWorld(storage, options?)`

| Param | Type | Description |
|---|---|---|
| `storage` | `StorageAdapter` | Storage backend to read pages from |
| `options.filename` | `string` | Suggested download filename (default: `'worldnotes-export.zip'`) |

Returns `Promise<Blob>` — a zip Blob containing all pages as `.md` files in nested folders.
Page name `a/b/c` maps to zip entry `a/b/c.md`. Use `URL.createObjectURL(blob)` with
an `<a download>` element to trigger a browser download.

### `importWorld(storage, file, options?)`

| Param | Type | Description |
|---|---|---|
| `storage` | `StorageAdapter` | Storage backend to write pages into |
| `file` | `File \| Blob` | Zip file or blob to import |
| `options.strategy` | `ConflictStrategy` | Conflict resolution: `'overwrite'` (default), `'skip'`, or `'merge'` |

Returns `Promise<ImportResult>` with `{ imported: string[], skipped: string[] }` arrays
of page names. Non-`.md` files and empty page names are silently skipped.

### `ConflictStrategy`

```ts
type ConflictStrategy = 'overwrite' | 'skip' | 'merge'
```

| Value | Behavior |
|---|---|
| `'overwrite'` | Always write, replace existing pages |
| `'skip'` | Only import pages that don't already exist in storage |
| `'merge'` | Overwrites existing pages (same as overwrite for now) |

### `ImportResult`

```ts
interface ImportResult {
  imported: string[]  // Pages successfully written to storage
  skipped: string[]   // Pages skipped (strategy='skip' and already existed)
}
```

### `createImportExportPlugin(options)`

Returns a `UIPlugin` that adds Export and Import buttons to the `wn-toolbar` slot.

```ts
import { createImportExportPlugin } from 'worldnotes'

const storage = new LocalStorageAdapter()

const editor = createEditor(el, { storage })
  .use(createImportExportPlugin({
    storage,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()
```

| Option | Type | Required | Description |
|---|---|---|---|
| `storage` | `StorageAdapter` | Yes | Same adapter the editor uses |
| `onImportComplete` | `() => void` | Yes | Called after import finishes; typically refreshes the editor |
| `exportFilename` | `string` | No | Custom download filename (default: `'worldnotes-export.zip'`) |
| `importStrategy` | `ConflictStrategy` | No | Conflict resolution for imports (default: `'overwrite'`) |

The Export button downloads all pages as a `.zip`. The Import button opens a file picker
for `.zip` files, imports `.md` entries as pages, then calls `onImportComplete`.

## Exported Types

The package exports `Token`, `TokenDef`, `PluginManifest`, `ContentPlugin`, `UIPlugin`,
`StoragePlugin`, `StorageAdapter`, `EditorContext`, `EditorOptions`, `EditorInstance`,
`ConflictStrategy`, `ImportResult`, and `ImportExportPluginOptions` for TypeScript consumers.
