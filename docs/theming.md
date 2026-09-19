# Theming

WorldNotes has two visual surfaces that now share **one** palette: the
**editor** (authenticated edit surface, browser) and the **viewer**
(server-rendered reading pages). Both use the same warm-paper light theme with
an automatic dark variant via `prefers-color-scheme`.

## Editor theme (`src/core/styles.ts` + `src/core/editor-dom.ts`)

The editor injects a token-driven stylesheet under
`<style id="worldnotes-styles">`, composed of three groups:
`EDITOR_TOKENS_CSS` + `EDITOR_CONTENT_CSS` (in `styles.ts` — shared with the
reader, see below) and the editor-only chrome group in `editor-dom.ts`
(header, toolbar, sidepanels, overlay, toasts, and the `.wn-root` flex
layout rule, which must NEVER reach the reader). `--wn-*` custom properties
are declared on `.wn-root` (`--wn-color-bg/-fg/-fg-muted/-accent/-border/
-code-bg`, plus heading/bold/punct/toast tokens); override them, or replace
the entire stylesheet via `createEditor(el, { theme: '…css…' })`.

Classes are the `.wn-*` namespace: `.wn-root .wn-header .wn-actions
.wn-breadcrumb .wn-toolbar .wn-editor-wrap .wn-editor-col .wn-editor
.wn-placeholder .wn-overlay .wn-footer .wn-left-sidepanel
.wn-right-sidepanel`, token spans `.wn-h1..h3`, `.wn-bold .wn-italic
.wn-code .wn-wiki-link .wn-link .wn-strikethrough .wn-blockquote .wn-hr
.wn-list-item*`, plus `.wn-toast*` notifications.

The header (`.wn-header`) mirrors the viewer's `.wn-view-bar` (breadcrumbs
left, `.wn-actions` right), and the editor content sits in a centered ~46rem
column (`.wn-editor-col`) matching the viewer's `<main>`.

The client bundles the editor with its default theme; re-theming the edit
surface today means forking the bundle (the option exists in core for future
per-user theming).

## Reader theme (`src/server/render/layout.ts`)

The reader is the editor, read-only: the article carries `class="wn-root
wn-article"` so the embedded `EDITOR_TOKENS_CSS` + `EDITOR_CONTENT_CSS`
(the same strings the editor injects) style its markup — `.wn-h1..h3`,
`.wn-punct`, `.wn-bold`, `.wn-inline-code`, `.wn-blockquote`,
`.wn-list-item*`, `.wn-hr`, `.wn-wiki-link`, `.wn-link`,
`.wn-strikethrough`. Restyling CONTENT means editing `src/core/styles.ts`
(it changes the editor too — one engine, one look).

`VIEW_CSS` in `layout.ts` is chrome only:

- `--wn-bg` / `--wn-fg` / `--wn-muted` / `--wn-accent` / `--wn-border` /
  `--wn-code-bg` CSS variables on `:root` (chrome palette), with automatic
  dark variants via `color-scheme: light dark` + `prefers-color-scheme`.
- Structural classes: `.wn-view-bar` (header), `.wn-crumbs` (breadcrumb),
  `.wn-view-actions` (search / all-pages / admin / sign-in-out links),
  `.wn-article` typography (pre-wrap surface like `.wn-editor`),
  `.wn-page-list`, `.wn-search-form`, `.wn-admin-form` (admin settings),
  `.wn-status` + `.wn-create` (404 create overlay).

There is no cascade override layer yet.

## Responsive (mobile)

Both layers ship first-class mobile breakpoints — no JS, no separate
stylesheet:

- **Viewer**: `@media (max-width: 640px)` — wrapping header with scrollable
  breadcrumbs, tighter article padding, `overflow-wrap` for long tokens,
  horizontally scrollable tables, and ≥ 44 px touch targets on search,
  page-list, and create-overlay controls.
- **Editor**: `@media (max-width: 640px)` — scrollable breadcrumb strip,
  roomier crumb hit areas, compact editor padding, side panels stacked
  full-width under the editor, and toasts clamped to the viewport.
- **Edit shell**: `viewport-fit=cover` + `100dvh` height chain so the editor
  fills the screen correctly around mobile browser URL bars and keyboards.

Mobile *editing* beyond layout fit (touch caret behavior, keyboard UX) is a
deliberate follow-up (roadmap M3); reading on phones is first-class today.
