# worldnotes Overview

`worldnotes` is a browser-based inline Markdown editor for building small, linked writing spaces. It renders formatting as you type, treats `[[wiki links]]` as navigable pages, and persists page content through a pluggable storage adapter. A static HTML render pipeline (`renderDocumentToHTML`) produces the same output as strings — usable in Node.js, SSR, or build pipelines. Supports real-time multi-user editing via WebSocket-based CRDT sync.

## When to Use It

Use `worldnotes` when you want an embeddable editor for personal notes, lightweight knowledge bases, project notebooks, or local-first writing tools. It is intentionally small: the library owns the editable DOM, inline rendering, wiki-style navigation, and persistence hooks, while your application owns the surrounding UI.

## Installation and Setup

Install the package, then mount an editor into an existing element:

```ts
import { createEditor } from 'worldnotes'

const editor = await createEditor(document.getElementById('app')!)
  .mount()
```

For local development in this repository:

```bash
npm install
npm run dev
npm run build
```

## Core Concepts

`createEditor()` returns an `EditorBuilder`. Use the builder to register plugins, choose storage, and mount the editor.

Pages are plain Markdown strings keyed by page name. Typing `[[projects/acme]]` creates a clickable link that navigates to the `projects/acme` page and displays `acme` by default. Use `[[projects/acme|Client Portal]]` for custom display text.

The navigation trail is shown as breadcrumbs and serialized into the URL query string as `?path=...`, so refreshing the browser restores the current trail.

## Typical Configuration

```ts
import { createEditor, IndexedDBAdapter } from 'worldnotes'

const editor = await createEditor(document.getElementById('app')!, {
  initialPage: 'home',
  saveDebounceMs: 800,
  onTrailChange: (trail) => console.log('trail:', trail),
  onPageLoad: (page, content) => console.log('loaded:', page, content),
  onSave: (page, content) => console.log('saved:', page, content),
})
  .withStorage(new IndexedDBAdapter('my-world'))
  .mount()
```

## Built-In Editing Features

The default plugin set supports wiki links, `#` through `###` headings, `**bold**`, `*italic*`, `~~strikethrough~~`, `` `inline code` ``, `> blockquotes`, `---` horizontal rules, and autolinked URLs.

Undo/redo is backed by a per-page Yjs CRDT (`Y.UndoManager`). Pass `syncServer` to enable real-time collaborative editing with remote cursor awareness.

The editor injects default `--wn-*` CSS design tokens on first mount. Override them on a parent element, or pass a `theme` string for full stylesheet replacement. See [theming.md](./theming.md) for the full token reference.

## Where to Go Next

Read [`api.md`](./api.md) for exported functions, types, plugin authoring, storage adapters, sync, import/export, and static HTML rendering. Read [`architecture.md`](./architecture.md) if you want to contribute to the library or understand how the editor pipeline works. Read [`theming.md`](./theming.md) for the design token system and full theme replacement.
