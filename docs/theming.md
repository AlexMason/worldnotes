# Theming

WorldNotes has two independent visual layers: the **editor** (authenticated
edit surface, browser) and the **viewer** (server-rendered reading pages).

## Editor theme (`src/core/editor-dom.ts`)

The editor injects a token-driven stylesheet under
`<style id="worldnotes-styles">`. ~46 `--wn-*` custom properties are declared
on `.wn-root`; override them, or replace the entire stylesheet via
`createEditor(el, { theme: '…css…' })`.

Token groups (unchanged from the library era): surfaces
(`--wn-color-bg/-bg-raised/-bg-overlay`), ink (`--wn-color-fg/-fg-muted/
-fg-faint`), accent (`--wn-color-accent/-accent-soft`), borders/shadows,
typography (`--wn-font-ui/-mono/-size-*`), spacing/radius, editor-specific
line/placeholder/cursor colors, and notification/toast tokens. Classes are the
`.wn-*` namespace: `.wn-root .wn-header .wn-toolbar .wn-breadcrumb
.wn-editor-wrap .wn-editor .wn-placeholder .wn-overlay .wn-footer
.wn-left-sidepanel .wn-right-sidepanel`, token spans `.wn-h1..h3`,
`.wn-bold .wn-italic .wn-code .wn-wiki-link .wn-link .wn-strikethrough
.wn-blockquote .wn-hr .wn-list-item*`, plus `.wn-toast*` notifications.

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
  `.wn-view-actions` (login/sign-out/search/edit links), `.wn-article`
  (content), `.wn-wiki-link`, `.wn-task` (checkboxes), `.wn-page-list`,
  `.wn-search-form`, `.wn-status` + `.wn-create` (404 create overlay),
  `.wn-view-link` (editor header "reading view" link).

To restyle the reading view, edit `VIEW_CSS` in `src/server/render/layout.ts`
— it is the whole stylesheet; there is no cascade override layer yet.
