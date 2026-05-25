# CRDT Renderer & Real-Time Multiplayer Design

**Date:** 2026-05-24
**Status:** Approved

## Problem

The editor re-renders by calling `innerHTML = ''` on the contentEditable div and rebuilding
all DOM fragments from scratch on every input event. This destroys the browser's native
selection, then attempts lossy cursor restoration via `findTextPosition()` — which breaks
on `dataset.raw` elements and the active-token system.

This approach is fundamentally incompatible with real-time multiplayer, where remote
changes arrive asynchronously and must be applied without disrupting the local user's
cursor or selection.

## Design: Yjs + Line-Granular Re-Render

Use Yjs (Y.Text, Y.Map, Y.UndoManager, Awareness) as the document model, with a
line-granular DOM re-renderer that only updates changed lines. Cursor position is
tracked as a Y.Text offset in Awareness state — fully decoupled from DOM position.

---

## 1. Document Model

### Y.Doc Structure

```
Y.Doc (one per editor instance)
  └── Y.Map<Y.Text>  named "pages"
        ├── "home"       → Y.Text
        ├── "projects/a" → Y.Text
        └── "projects/b" → Y.Text
```

- One `Y.Doc` per editor instance holds all page content in a `Y.Map` of `Y.Text` instances.
- `Y.Text` is a CRDT text type — concurrent inserts/deletes resolve automatically.
- The `Y.Map` allows dynamic page creation, deletion, and lazy loading.
- `Y.Text.toString()` returns the plain Markdown text. The tokenizer and all ContentPlugins
  continue operating on `toString()` output — **zero plugin changes required**.

### Undo/Redo

- `Y.UndoManager` replaces `EditorHistory`, scoped to the active page's `Y.Text`.
- Tracked origins distinguish local vs remote changes (remote changes don't push to local undo stack).
- No more raw string snapshots.

### Persistence Bridge to StorageAdapter

- **Save:** `Y.encodeStateAsUpdate(Y.Doc)` → `Uint8Array` → `StorageAdapter.set("__ync_update__", update)`.
- **Load:** `StorageAdapter.get("__ync_update__")` → `Uint8Array` → `Y.applyUpdate(Y.Doc, update)`.
- This preserves the existing `StoragePlugin` contract — any adapter works.
- **Lazy page loading:** on first `navigateToPage("foo")`, check `Y.Map.has("foo")`. If not,
  try `StorageAdapter.get("page:foo")` for a legacy raw-string migration path, then create
  the `Y.Text`.

### Caret Position

- Tracked as a `number` offset into `Y.Text`, stored in Yjs Awareness state (alongside
  username, color).
- Renderer uses this offset, not DOM position — completely decoupled from DOM.

---

## 2. Renderer Changes

### Current Flow
```
input → extractText(DOM) → tokenize(raw) → innerHTML='' → build fragments → append → findTextPosition(offset)
```

### New Flow
```
Y.Text observer fires → tokenize(Y.Text.toString()) → per-line diff → update changed lines only → place caret via offset
```

### Stable Line Containers

Each line gets `<div data-line="N">` — these persist across re-renders. On first render,
build all containers. On subsequent renders, only replace the `innerHTML` of containers
whose line text changed.

### Change Detection

A `Map<number, string>` cache of last-rendered line text. Compare new tokenized line
output against cached version:
- Changed lines → re-render just that container.
- Added lines → insert new containers at the correct index.
- Removed lines → remove containers.

### Caret Placement

Instead of `findTextPosition()` walking the DOM, use the Y.Text offset from Awareness
state. Walk the stable line containers, find the correct text node, place the browser
selection. Because containers are stable, this is reliable — only the changed line's DOM
was rebuilt, and its text content matches `Y.Text`.

### Active Token Removal

The current active-token system (rendering tokens as raw text when caret is inside)
becomes unnecessary. The cursor offset is always correct because it's Y.Text-backed.
Users edit raw syntax when inside a token, and the renderer displays it — but the
renderer no longer changes its output based on cursor position (which was the
DOM-structure-change bug that caused cursor loss).

### Remote Changes

When a remote peer edits, the Yjs provider calls `Y.applyUpdate()`, mutating `Y.Text`.
The Y.Text observer fires, triggering a re-render of only the affected lines. The local
user's cursor is unaffected because it's tracked in Awareness by offset, not DOM position.

### Multi-Cursor Rendering

A built-in `RemoteCursorsUIPlugin` reads Awareness state and renders colored remote
carets + name labels as absolutely-positioned overlays on the editor. Standard Yjs
Awareness pattern.

### Code Impact

| File | Change |
|------|--------|
| `renderer.ts` | Major refactor (~60% rewrite) |
| `cursor.ts` | Simplified — `findTextPosition` with stable containers |
| `editor-render.ts` | ~40% change, new Y.Text observer wiring |
| `editor-state.ts` | Replaced by Y.Doc + Awareness |
| `editor-history.ts` | Replaced by Y.UndoManager |
| `extractText()` | Removed entirely |
| Plugin `render()` | **Unchanged** |

---

## 3. Sync Transport

### Server (`src/server/`)

A standalone WebSocket server using `y-websocket`:

```
src/server/
  ├── index.ts          # Entry: starts HTTP + WebSocket
  ├── persistence.ts    # Optional server-side Y.Doc persistence (y-leveldb/SQLite)
  └── config.ts         # Port, auth token, persistence path
```

- Uses `y-websocket/bin/server.js` as foundation — battle-tested Yjs sync server.
- Optional `y-leveldb` for server-side persistence so pages survive server restart.
- Room-based: clients connect to a room (`worldnotes-{workspaceId}`) and sync the
  full Y.Doc.
- No auth initially — shared room name. JWT auth layering possible later.

### Client

- `Y.WebsocketProvider` connects the local `Y.Doc` to the room.
- Awareness state syncs automatically via the provider.
- **Offline fallback:** If the server is unreachable, the editor works fully offline
  (local Y.Doc + StorageAdapter persistence). On reconnect, Yjs syncs all pending
  changes automatically.

### Data Flow

```
Local edit → Y.Text.insert() → Y.Doc update
  → WebsocketProvider → server → other clients
  → StorageAdapter.set("__ync_update__", encoded) [debounced]
```

### Startup

```
1. Create Y.Doc
2. Try StorageAdapter.get("__ync_update__") → apply local state
3. Connect WebsocketProvider → sync with server
4. if server has newer state → Yjs merges automatically
5. if server unreachable → work offline, sync on reconnect
```

### Dev Experience

- `npm run dev:server` starts the sync server alongside the Vite dev server.
- Production: run the sync server as a separate process.

---

## 4. Import / Export

### Primary Format: Zip of `.md` Files + Y.Doc Binary

```
export.zip
  ├── _worldnotes.yjs          # Y.Doc binary snapshot (lossless round-trip)
  ├── home.md                  # Rendered plain text
  ├── projects/
  │   └── acme.md
  └── ...
```

### Import Detection

| Zip Contents | Behavior |
|-------------|----------|
| `_worldnotes.yjs` present | `Y.applyUpdate(doc, blob)` — lossless restore (undo history, metadata intact) |
| Only `.md` files | Reconstruct pages from raw text (backward compatible) |
| `.yjs` + newer `.md` | Apply `.yjs` then overlay `.md` changes |

### Additional Export Formats

| Format | Method |
|--------|--------|
| **HTML** | Tokenize + render each page via existing plugin render methods → static HTML |
| **PDF** | Concatenate all pages → print-to-PDF (server-side Puppeteer or `window.print()`) |
| **DOCX** | Generate via `docx` npm package |

### Public API

```typescript
interface EditorInstance {
  // existing
  importZip(file: File): Promise<void>
  exportZip(): Promise<Blob>

  // new
  export(format: 'zip' | 'html' | 'pdf' | 'docx'): Promise<Blob>
}
```

PDF and DOCX are stretch goals. Core deliverable: `_worldnotes.yjs` in zip + HTML export.

---

## 5. Plugin & Context API

### Unchanged Contracts

- **ContentPlugins:** `tokenize(Y.Text.toString())` produces the same `Token[][]` input.
  Plugin `render(token, context)` receives the same `EditorContext` shape.
- **StoragePlugins:** Bridge layer wraps `StorageAdapter.get/set` for Y.Doc binary persistence.

### New Plugin Type: SyncProvider

```typescript
interface SyncProvider {
  readonly name: string
  readonly awareness: Awareness
  connect(doc: Y.Doc): void
  disconnect(): void
  destroy(): void
}
```

### EditorContext Changes

```typescript
interface EditorContext {
  readonly navigate: (page: string) => void
  readonly getTrail: () => readonly string[]
  readonly getWorld: () => Readonly<Record<string, string>>  // backward compat, returns Y.Text.toString() per page
  readonly getDoc: () => Y.Doc                               // new — CRDT access for plugins
}
```

### New Built-in UIPlugin: RemoteCursors

- Slot: `wn-editor-overlay` (new slot, absolutely positioned inside editor-wrap).
- Renders colored carets + name labels from Awareness state.
- Ships as default, removable via config.

### EditorOptions Additions

```typescript
interface EditorOptions {
  // existing...
  syncServer?: string                         // WebSocket URL for y-websocket
  awarenessState?: { name: string; color: string }  // local user identity
  historyDepth?: number                       // now passed to Y.UndoManager.captureTimeout
  remoteCursors?: boolean                     // default true, toggle remote cursor display
}
```

---

## 6. Dependencies

### New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `yjs` | CRDT document model | ~16KB gzipped |
| `y-websocket` | WebSocket sync provider (client) | ~3KB gzipped |
| `lib0` | Yjs utilities (already peer dep of yjs) | included |
| `y-leveldb` | Server-side persistence (optional) | ~50KB |

### Removed Dependencies

None. Editor history becomes internal Y.UndoManager, no new code to remove.

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `y-websocket/bin/server.js` | dev sync server |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Line-granular re-render is coarser than ideal for multi-line paste | Paste triggers multi-line update but all changed lines re-render in one frame — imperceptible at human typing speed |
| Future multi-line blocks (lists, code fences) could span containers | Currently no multi-line blocks exist (blockquotes render as standalone spans per line). When added, extend change detection to re-render contiguous spans of affected lines by tracking tokenizer state transitions |
| Yjs increases bundle size ~20KB | Acceptable trade-off for CRDT + multiplayer. Tree-shakeable to `Y.Text` + `Y.Map` only |
| WebsocketProvider adds network dependency | Offline-first: StorageAdapter fallback works without server. Reconnect syncs automatically |
| ContentPlugin render() might rely on DOM state | Audit existing plugins. Contract is already stateless (token → HTMLElement) — low risk |
| Migration from legacy string-based world cache | Backward-compatible: `getWorld()` returns `Y.Text.toString()` values. Import handles `.md`-only zips |
