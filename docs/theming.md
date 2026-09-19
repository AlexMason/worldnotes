# Theming

WorldNotes has two visual surfaces that now share **one** palette: the
**editor** (authenticated edit surface, browser) and the **viewer**
(server-rendered reading pages). Both use the same warm-paper light theme with
an automatic dark variant via `prefers-color-scheme`.

## Editor theme (`src/core/editor-dom.ts`)

The editor injects a token-driven stylesheet under
`<style id="worldnotes-styles">`. `--wn-*` custom properties are declared on
`.wn-root` and mirror the viewer palette (`--wn-color-bg/-fg/-fg-muted/
-accent/-border/-code-bg`, plus editor-specific heading/bold/punct/toast
tokens); override them, or replace the entire stylesheet via
`createEditor(el, { theme: '…css…' })`.

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

## Viewer theme (`src/server/render/layout.ts`)

Anonymous readers get a single self-contained stylesheet embedded per
response — semantic HTML inside `.wn-article` plus:

- `--wn-bg` / `--wn-fg` / `--wn-muted` / `--wn-accent` / `--wn-border` /
  `--wn-code-bg` CSS variables on `:root`, with an automatic dark palette via
  `color-scheme: light dark` + `prefers-color-scheme`.
- Structural classes: `.wn-view-bar` (header), `.wn-crumbs` (breadcrumb),
  `.wn-view-actions` (search / all-pages / admin / sign-in-out links),
  `.wn-article` (content), `.wn-wiki-link`, `.wn-task` (checkboxes),
  `.wn-page-list`, `.wn-search-form`, `.wn-admin-form` (admin settings),
  `.wn-status` + `.wn-create` (404 create overlay).

To restyle the reading view, edit `VIEW_CSS` in `src/server/render/layout.ts`
— it is the whole stylesheet; there is no cascade override layer yet.

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
