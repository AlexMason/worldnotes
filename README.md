# worldnotes

An extensible inline-markdown editor with wiki-style navigation.  
Type markdown and it renders in place — `[[links]]` navigate between pages, everything persists to your chosen storage backend.

---

## Quick start

```bash
npm install
npm run dev      # Vite dev server with the demo
npm run build    # Build the library to dist/
```

## Documentation

- [Overview](./docs/overview.md): what `worldnotes` is, setup, core concepts, and typical usage.
- [API reference](./docs/api.md): editor options, builder methods, instance methods, plugins, storage adapters, and exported types.
- [Architecture](./docs/architecture.md): module responsibilities, editor lifecycle, rendering pipeline, navigation model, and contributor notes.

---

## Usage

```ts
import { createEditor } from 'worldnotes'

const editor = createEditor(document.getElementById('app'))
  .mount()
```

### With options

```ts
import { createEditor, IndexedDBAdapter } from 'worldnotes'

const editor = createEditor(document.getElementById('app'), {
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

Returns an `EditorBuilder`. Chain `.use()`, `.withStorage()`, then `.mount()`.

| Option | Type | Default | Description |
|---|---|---|---|
| `storage` | `StorageAdapter` | `LocalStorageAdapter` | Where pages are persisted |
| `initialPage` | `string` | `'home'` | Page to load on mount |
| `saveDebounceMs` | `number` | `600` | Ms to debounce saves after input |
| `onTrailChange` | `(trail: string[]) => void` | — | Called on breadcrumb changes |
| `onPageLoad` | `(page, content) => void` | — | Called after a page loads |
| `onSave` | `(page, content) => void` | — | Called after a save completes |

### `EditorBuilder`

| Method | Description |
|---|---|
| `.use(plugin)` | Register or replace a plugin |
| `.clearPlugins()` | Remove all default plugins |
| `.withStorage(adapter)` | Swap the storage backend |
| `.mount()` | Mount the editor and return an `EditorInstance` |

### `EditorInstance`

```ts
editor.navigate('some-page')     // programmatic navigation
editor.getCurrentPage()          // → 'some-page'
editor.getTrail()                // → ['home', 'some-page']
editor.getContent()              // raw markdown string
editor.setContent('# Hello')    // replace current page content
editor.destroy()                 // tear down, remove listeners
```

---

## Built-in plugins

| Export | Syntax | Renders |
|---|---|---|
| `wikiLinkPlugin` | `[[page name]]`, `[[page name|display text]]` | Clickable navigation link |
| `headingsPlugin` | `# h1` `## h2` `### h3` | Styled heading |
| `boldPlugin` | `**text**` | Bold |
| `italicPlugin` | `*text*` | Italic |
| `inlineCodePlugin` | `` `code` `` | Code span |
| `blockquotePlugin` | `> text` | Blockquote |
| `hrPlugin` | `---` | Horizontal rule |

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
createEditor(el).use(mentionPlugin).mount()
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

createEditor(el).withStorage(new MyAdapter()).mount()
```

---

## Styling

The library injects default `wn-*` CSS into `<head>` on first mount.  
Override any rule with higher specificity:

```css
/* Make wiki links teal instead of purple */
.wn-wiki-link {
  color: #2ec4b6;
  background: #0a2520;
  border-color: #1a5048;
}

/* Custom mention style from your plugin */
.my-mention {
  color: #5aa6e8;
  background: #0e1e30;
}
```

CSS variables are not used internally — override by class name.
