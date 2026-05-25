# worldnotes

An extensible inline-markdown editor with wiki-style navigation, real-time sync, and CRDT-backed persistence.  
Type markdown and it renders in place — `[[links]]` navigate between pages, everything persists to your chosen storage backend. Supports undirected real-time multi-user editing via Yjs WebSocket sync.

---

## Quick start

```bash
npm install
npm run dev      # Vite dev server with the demo
npm run build    # Build the library to dist/
```

## Documentation

- [Overview](./docs/overview.md): what `worldnotes` is, setup, core concepts, and typical usage.
- [API reference](./docs/api.md): editor options, builder methods, instance methods, plugins, storage adapters, sync, import/export, and exported types.
- [Architecture](./docs/architecture.md): module responsibilities, editor lifecycle, rendering pipeline, CRDT model, navigation model, and contributor notes.
- [Theming](./docs/theming.md): design token reference, token overrides, and full theme replacement.

---

## Usage

```ts
import { createEditor } from 'worldnotes'

const editor = await createEditor(document.getElementById('app'))
  .mount()
```

### With options

```ts
import { createEditor, IndexedDBAdapter } from 'worldnotes'

const editor = await createEditor(document.getElementById('app'), {
  initialPage: 'home',
  saveDebounceMs: 800,
  onTrailChange: (trail) => console.log('trail:', trail),
  onSave: (page, content) => console.log('saved', page),
})
  .withStorage(new IndexedDBAdapter('my-world'))
  .mount()
```

---

## API

### `createEditor(el, options?)`

Returns an `EditorBuilder`. Chain `.use()`, `.withStorage()`, then await `.mount()`.

| Option | Type | Default | Description |
|---|---|---|---|
| `storage` | `StorageAdapter` | `LocalStorageAdapter` | Where pages are persisted |
| `initialPage` | `string` | `'home'` | Page to load on mount |
| `saveDebounceMs` | `number` | `600` | Ms to debounce saves after input |
| `historyDepth` | `number` | `50` | Max undo states per page (FIFO eviction) |
| `theme` | `string` | — | CSS string to replace the entire default stylesheet |
| `syncServer` | `string` | — | WebSocket URL for real-time collaborative sync (e.g. `ws://localhost:1234`) |
| `onTrailChange` | `(trail: string[]) => void` | — | Called on breadcrumb changes |
| `onPageLoad` | `(page, content) => void` | — | Called after a page loads |
| `onSave` | `(page, content) => void` | — | Called after a save completes |

### `EditorBuilder`

| Method | Description |
|---|---|
| `.use(plugin)` | Register or replace a plugin |
| `.clearPlugins()` | Remove all default plugins |
| `.withStorage(adapter)` | Swap the storage backend |
| `.mount()` | Mount the editor and return a `Promise<EditorInstance>` (must be `await`ed) |

### `EditorInstance`

```ts
editor.navigate('some-page')     // programmatic navigation
editor.getCurrentPage()          // → 'some-page'
editor.getTrail()                // → ['home', 'some-page']
editor.getContent()              // raw markdown string
editor.setContent('# Hello')    // replace current page content
editor.undo()                    // undo last change (→ true if performed)
editor.redo()                    // redo last undone change
editor.canUndo()                 // → true if undo stack non-empty
editor.canRedo()                 // → true if redo stack non-empty
editor.insertText('hello')      // insert text at cursor, dispatching input
editor.deleteForward()           // delete one character after cursor
editor.deleteBackward()          // delete one character before cursor
editor.getSelection()            // → { text, start, end } or null
editor.getDoc()                  // → Y.Doc (for advanced CRDT access)
editor.destroy()                 // tear down, remove listeners
```

Keyboard shortcuts: `Ctrl/⌘+Z` (undo), `Ctrl/⌘+Shift+Z` (redo), `Ctrl+Y` (redo). Tab inserts 2 spaces. Undo/redo history is per-page.

---

## Built-in plugins

| Export | Syntax | Renders |
|---|---|---|
| `wikiLinkPlugin` | `[[page name]]`, `[[page name\|display text]]` | Clickable navigation link |
| `headingsPlugin` | `# h1` `## h2` `### h3` | Styled heading |
| `boldPlugin` | `**text**` | Bold |
| `italicPlugin` | `*text*` | Italic |
| `strikethroughPlugin` | `~~text~~` | Strikethrough |
| `inlineCodePlugin` | `` `code` `` | Code span |
| `blockquotePlugin` | `> text` | Blockquote |
| `hrPlugin` | `---` | Horizontal rule |
| `linkPlugin` | URL-like text (autolink) | Clickable external link |
| `remoteCursorsPlugin` | (no syntax) | Remote user cursors for real-time sync |

`defaultPlugins` is the array containing all of the above, pre-ordered.

Wiki links can target nested page names. `[[projects/acme]]` navigates to the
`projects/acme` page but displays as `acme`. Use pipe syntax for custom display
text, for example `[[projects/acme|Client Portal]]`.

The active breadcrumb trail is serialized to the URL as `?path=...`, so a page
refresh restores the same navigation path.

---

## Writing a custom plugin

```ts
import type { Plugin, Token, EditorContext } from 'worldnotes'

const mentionPlugin: Plugin = {
  name: 'mention',

  tokens: [
    {
      type: 'mention',
      pattern: /@(\w+)/,   // inline pattern (no ^ anchor)
    },
  ],

  render(token: Token, context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.className = 'my-mention'
    el.textContent = `@${token.groups[0]}`
    return el
  },

  // Optional: intercept clicks on this token
  onNavigate(token: Token, context: EditorContext): true {
    console.log('clicked mention:', token.groups[0])
    return true   // return true to suppress default behaviour
  },
}

// Register it
await createEditor(el).use(mentionPlugin).mount()
```

### Pattern rules

- **Inline tokens**: plain regex, no `^` anchor. The tokenizer scans left-to-right and finds the earliest match.
- **Line-level tokens**: anchor with `^` (e.g. `^# (.*)`). These are tested against the whole line before inline scanning begins.
- Do **not** use the `g` flag — patterns are used with `.match()` per-segment.

---

## Storage adapters

### `LocalStorageAdapter(namespace?)`

Default. Namespaces keys as `namespace::pageName`.

### `IndexedDBAdapter(dbName?)`

Better for large worlds. Opens (or creates) an IDB object store automatically.

### Custom adapter

```ts
import type { StorageAdapter } from 'worldnotes'

class MyAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> { ... }
  async set(key: string, value: string): Promise<void> { ... }
  async keys(): Promise<string[]> { ... }
}

await createEditor(el).withStorage(new MyAdapter()).mount()
```

---

## Styling

The library injects a default `--wn-*` design-token-driven stylesheet into `<head>` on first mount.
Customize via two mechanisms:

### 1. Design token overrides (CSS custom properties)

Override individual `--wn-*` properties on a parent element of the editor container:

```css
/* Make wiki links teal instead of purple */
.editor-container {
  --wn-color-wiki-link: #2ec4b6;
  --wn-color-wiki-link-bg: #0a2520;
  --wn-color-wiki-link-border: #1a5048;
  --wn-color-accent: #2ec4b6;
  --wn-caret-color: #2ec4b6;
}
```

For the full list of design tokens, see [docs/theming.md](./docs/theming.md).

### 2. Full theme replacement

Pass a complete CSS string via the `theme` option to replace the entire default stylesheet:

```ts
const editor = await createEditor(el, {
  theme: '.wn-root { --wn-color-bg: #fff; --wn-color-fg: #111; } ...'
}).mount()
```
