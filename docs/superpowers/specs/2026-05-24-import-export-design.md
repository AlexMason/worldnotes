# Import / Export Feature Design

**Date:** 2026-05-24
**Status:** Approved

## Overview

Add standalone import/export utilities that serialize all pages from a `StorageAdapter` into a `.zip` of nested markdown files, and reverse the process on import. Ship an optional `UIPlugin` wrapper that adds toolbar buttons for interactive use.

## Architecture

Two-layer design following the architecture doc's guidance that export workflows live outside the library core:

```
src/export-import.ts         ← standalone utilities (pure, no DOM, testable with mock adapter)
    ↑
src/plugins/importExport.ts  ← optional UIPlugin (toolbar buttons, wires to utilities)
```

The utility module depends only on `StorageAdapter` and `jszip`. The UIPlugin depends on the utility module, the `UIPlugin` interface, and the caller-provided `StorageAdapter` + an `onImportComplete` callback.

Neither layer touches the editor pipeline (tokenizer, renderer, navigation). No circular dependencies.

## New Dependency

`jszip` — standard client-side zip library. Ships its own types (no `@types/` needed).

## Module: `src/export-import.ts`

### Exports

```ts
export type ConflictStrategy = 'overwrite' | 'skip' | 'merge'

export interface ImportResult {
  imported: string[]
  skipped: string[]
}

export async function exportWorld(
  storage: StorageAdapter,
  options?: { filename?: string }
): Promise<Blob>

export async function importWorld(
  storage: StorageAdapter,
  file: File | Blob,
  options?: { strategy?: ConflictStrategy }
): Promise<ImportResult>
```

### Behavior

**exportWorld:**
1. Call `storage.keys()` to enumerate all page names.
2. For each page, call `storage.get(page)`.
3. Map page name `a/b/c` → zip entry `a/b/c.md`.
4. Generate a zip Blob with all entries.
5. The optional `filename` parameter is included as a suggested filename in the zip metadata (defaults to `worldnotes-export.zip`).

**importWorld:**
1. Load the zip from the provided `File` or `Blob`.
2. Iterate all zip entries. Skip any entry not ending in `.md`.
3. Map zip entry `a/b/c.md` → page name `a/b/c` (strip `.md` suffix).
4. For each page:
   - If strategy is `'skip'` and `storage.get(page)` returns non-null, add to `skipped`.
   - Otherwise, call `storage.set(page, content)` and add to `imported`.
   - `'merge'` behaves the same as `'overwrite'` for now (import never deletes pages).
5. Return `{ imported, skipped }`.

### Edge Cases

- **Empty zip:** returns `{ imported: [], skipped: [] }`.
- **No .md files in zip:** returns `{ imported: [], skipped: [] }`.
- **Page name is `""` (root):** zip entry would be `.md` — skip it (invalid page name).
- **Empty page content:** exported and imported as an empty `.md` file.
- **Storage errors:** let them propagate to the caller.

## Module: `src/plugins/importExport.ts`

### Export

```ts
export function createImportExportPlugin(options: {
  storage: StorageAdapter
  onImportComplete: () => void
  exportFilename?: string
  importStrategy?: ConflictStrategy
}): UIPlugin
```

### Behavior

Returns a `UIPlugin` manifest with:
- `kind: 'ui'`
- `slots: ['wn-toolbar']`
- `name: 'import-export'`
- `version: '1.0.0'`

**onMount(slotEl):**
1. Create an **Export** button. On click:
   - Call `exportWorld(storage, { filename })`.
   - Create a temporary `<a>` element with `URL.createObjectURL(blob)`, click it to trigger download, then revoke the URL.
2. Create an **Import** button. On click:
   - Create a hidden `<input type="file" accept=".zip">`.
   - On file selection, call `importWorld(storage, file, { strategy })`.
   - After import completes, call `onImportComplete()` so the caller can refresh the editor.
3. Append both buttons and the hidden input to `slotEl`.
4. Store references for cleanup.

**onDestroy():**
- Remove buttons and hidden input from the DOM.
- Revoke any lingering object URLs.

### Usage

```ts
const editor = createEditor(el, { storage: adapter })
  .use(createImportExportPlugin({
    storage: adapter,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()
```

The `onImportComplete` callback captures `editor` by closure. By the time a user clicks Import and the callback fires, `.mount()` has already returned and `editor` is assigned.

## Exports Added to `src/index.ts`

```ts
export { exportWorld, importWorld } from './export-import'
export type { ConflictStrategy, ImportResult } from './export-import'
export { createImportExportPlugin } from './plugins/importExport'
```

## Testing

### `src/__tests__/export-import.test.ts`

- Mock `StorageAdapter` with known pages.
- `exportWorld`: verify zip contains correct entry names and content.
- `importWorld` with `'overwrite'` strategy: all entries written.
- `importWorld` with `'skip'` strategy: existing pages skipped, new ones imported.
- `importWorld` with `'merge'` strategy: same as overwrite.
- Empty storage, empty zip, zip with no .md files.
- Invalid page names (empty string, `.md` root file).

### `src/__tests__/importExport-plugin.test.ts`

- Plugin factory returns valid `UIPlugin` manifest.
- `onMount` adds buttons to the slot element.
- Clicking Export calls `exportWorld` (spy).
- Clicking Import opens file picker.
- `onDestroy` cleans up DOM elements.

## Documentation

Update `docs/api.md` to document:
- `exportWorld`, `importWorld`, `ConflictStrategy`, `ImportResult`
- `createImportExportPlugin` with usage example
- New dependency note for JSZip
