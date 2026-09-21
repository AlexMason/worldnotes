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
-code-bg`, plus heading/bold/punct/toast tokens and spacing tokens like
`--wn-list-indent` — the extra tracking added to each transparent
list-indent space so nested lists read visually, ~2.2× a bare 2-space level
at the default `0.3em`; presentation-only, the DOM text stays byte-exact);
override them, or replace
the entire stylesheet via `createEditor(el, { theme: '…css…' })`.

Classes are the `.wn-*` namespace: `.wn-root .wn-header .wn-nav .wn-menu
.wn-actions .wn-breadcrumb .wn-crumb .wn-crumb-sep .wn-crumb-more
.wn-crumb-drop .wn-toolbar .wn-editor-wrap .wn-editor-col .wn-editor
.wn-placeholder .wn-overlay .wn-footer .wn-left-sidepanel
.wn-right-sidepanel`, token spans `.wn-h1..h3`, `.wn-bold .wn-italic
.wn-code .wn-wiki-link .wn-link .wn-strikethrough .wn-blockquote .wn-hr
.wn-list-item*`, block regions `.wn-code-block .wn-code-fence .wn-code-line
.wn-table .wn-table-row .wn-table-head .wn-table-sep .wn-table-cells
.wn-table-cell .wn-table-edge .wn-align-left|center|right`, images
`.wn-image .wn-image-img .wn-image-alt .wn-image-src`, plus `.wn-toast*`
notifications and the shortcuts-help overlay (`.wn-shortcuts`,
`.wn-shortcuts-title/-group/-group-name/-row/-keys/-action` — editor chrome
in `editor-dom.ts`, token-styled, never shipped to the reader).

Off-site links carry a `↗` marker via `.wn-link[target="_blank"]::after` —
`target="_blank"` is emitted ONLY for absolute http(s) URLs by both renderers
(internal folds, `#fragments` and `mailto:` are not), so the attribute
selects exactly "leaves the site" (full URLs to the same host count too —
zero-JS CSS cannot compare hostnames). Generated `::after` content never
enters DOM text, so the byte-exact content model is untouched.

The header (`.wn-header`) mirrors the viewer's `.wn-view-bar` (breadcrumbs
left; site nav right — a `.wn-nav` wrapper holding the zero-JS hamburger
`<details class="wn-menu">` whose SIBLING `.wn-actions` div carries nav-page
links + built-ins). Under the shared 640px breakpoint, `:has()` hides the
actions until the menu opens; deep breadcrumb trails collapse their middle
under a `.wn-crumb-more` ellipsis dropdown on both surfaces. The editor
content sits in a centered ~46rem column (`.wn-editor-col`) matching the
viewer's `<main>`.

The client bundles the editor with its default theme; re-theming the edit
surface today means forking the bundle (the option exists in core for future
per-user theming).

## Reader theme (`src/server/render/layout.ts`)

The reader is the editor, read-only: the article carries `class="wn-root
wn-article"` so the embedded `EDITOR_TOKENS_CSS` + `EDITOR_CONTENT_CSS`
(the same strings the editor injects) style its markup — `.wn-h1..h3`,
`.wn-punct`, `.wn-bold`, `.wn-inline-code`, `.wn-blockquote`,
`.wn-list-item*`, `.wn-hr`, `.wn-wiki-link`, `.wn-link`,
`.wn-strikethrough`, `.wn-code-block*`, `.wn-table*`, `.wn-image*`.
Restyling CONTENT means editing `src/core/styles.ts`
(it changes the editor too — one engine, one look).

**Collapsed vs expanded** (editor, and collapsed everywhere on the reader):
while a line is not the cursor's, its rendered form shows — image
punctuation/alt/src spans and table pipes are hidden by CSS (`display:
none`; the text nodes stay in the DOM — fidelity and caret math are
CSS-independent) and the table separator collapses to a hairline. The
moment the cursor enters the line (or, for blocks, ANY line of the
region), line-renderer marks the wrapper `data-expanded="true"` and the
whole region renders as plain raw source — every character visible,
clickable, arrow-reachable (expanded state exists only in the editor DOM;
the reader has no cursor). Parity tests compare collapsed TREES, so these
remain display-only divergences.

`VIEW_CSS` in `layout.ts` is chrome only:

- `--wn-bg` / `--wn-fg` / `--wn-muted` / `--wn-accent` / `--wn-border` /
  `--wn-code-bg` CSS variables on `:root` (chrome palette), with automatic
  dark variants via `color-scheme: light dark` + `prefers-color-scheme`.
- Structural classes: `.wn-view-bar` (header), `.wn-crumbs` (breadcrumb,
  with `.wn-crumb-sep` / `.wn-crumb-more` + `.wn-crumb-drop` middle-collapse),
  `.wn-nav` + `.wn-menu` (site-nav wrapper + zero-JS hamburger toggle),
  `.wn-view-actions` (nav-page `.wn-nav-link`s + search / all-pages links,
  then **role-gated** chrome: the Admin-settings link renders only for the
  `admin` role; sign-out/identity for every session. Reader pages ship no
  sign-in link — the sole sanctioned exception is the login-required 403
  document, see `render/status-page.ts`),
  `.wn-article` typography (pre-wrap surface like `.wn-editor`),
  `.wn-page-list`, `.wn-search-form`, `.wn-admin-form` (admin settings,
  incl. the Access fieldset's `.wn-admin-fieldset`), `.wn-users-table` (the
  admin Users list: collapsed rows, hairline separators, inline role
  selects), `.wn-visually-hidden` (a11y-only labels),
  `.wn-status` (404/403 documents — built-in bodies and custom status-page
  bodies both ride this wrapper; a designated status page renders its
  markdown through the reader engine inside it).
- **Site bands** (`.wn-site-header` / `.wn-site-footer`, styled by
  `SITE_BANDS_CSS` in `src/core/styles.ts` — the one chrome group shared by
  both surfaces): admin-authored **raw HTML** from `PUT /api/settings`, shown
  to all readers. On the reader they sit **inside `<main>`** — header above
  the article, footer below, each emitted only when non-empty. In the editor
  the SAME HTML rides the embedded config and the client inserts the bands
  **inside the scrollable `.wn-editor-wrap`, above/below the content
  column** — so they scroll with the document and align with the ~46rem
  column, matching the reader placement. These are _viewer/editor chrome_
  and unrelated to the editor's `.wn-header`/`.wn-footer` plugin slots. The
  `/admin` page shows the site name but never the bands (anti-lockout). The
  site name also suffixes every tab title (`Page — Site`, rule shared via
  `src/shared/doc-title.ts`) and relabels the breadcrumb root in both
  chrome and the editor (`EditorOptions.homeLabel`).

There is no cascade override layer yet.

## Responsive (mobile)

Both layers ship first-class mobile breakpoints — no JS, no separate
stylesheet:

- **Viewer**: `@media (max-width: 640px)` — wrapping header with scrollable
  breadcrumbs, tighter article padding, `overflow-wrap` for long tokens,
  and ≥ 44 px touch targets on search, page-list, and create-overlay
  controls. Tables never scroll horizontally by design: flex cells shrink
  and wrap (`min-width: 0`).
- **Editor**: `@media (max-width: 640px)` — scrollable breadcrumb strip,
  roomier crumb hit areas, compact editor padding, side panels stacked
  full-width under the editor, and toasts clamped to the viewport.
- **Edit shell**: `viewport-fit=cover` + `100dvh` height chain so the editor
  fills the screen correctly around mobile browser URL bars and keyboards.
  The chain is untouched by site branding: bands live INSIDE the app (the
  client inserts them into the scrollable `.wn-editor-wrap`), so a very tall
  admin-authored band scrolls with the document instead of squeezing the
  editor.

Mobile _editing_ beyond layout fit (touch caret behavior, keyboard UX) is a
deliberate follow-up (roadmap M3); reading on phones is first-class today.
