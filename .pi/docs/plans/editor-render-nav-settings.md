# Editor performance, breadcrumbs, "all pages" setting, reader-parity rendering

**Branch:** `feature/editor-render-nav-settings`
**Date:** 2026-09-19

## Goal

Four improvements to WorldNotes, all touching the logged-in editor (and a bit
of viewer chrome):

1. **Fast navigation** — kill the 250ms+ blank-then-flash when the editor
   loads a page by embedding the page's markdown + version in the editor shell
   (SSR), so first paint is synchronous. (SPA re-navigation is already
   instant via `PageBuffers`; no extra client cache is needed.)
2. **Correct breadcrumbs** — `/home` → "home", `/blog` → "Home / blog",
   `/blog/post` → "Home / blog / post". Fix the editor's duplicated/case
   mismatch (currently "blog / blog / post") and make "Home" navigate to the
   *configured* home page, not the literal `home` slug.
3. **"Turn off all pages" setting** — an admin toggle (like "Enable search")
   that hides the `/all` index listing and the "All pages" nav link in both
   viewer and editor chrome.
4. **Reader-parity editor rendering** — the editor renders markdown exactly
   like the reader (bullets, images, code blocks, tables, blockquotes, links,
   task checkboxes) **except** the block currently being edited, which stays
   in source mode.

## Approach

- **Task 1**: The SSR editor shell gains a second `<script id="wn-page">`
  with `{ slug, content, version, exists }` (**`<` escaped** so page content
  can never break out of the script element). The client seeds the page
  buffer + store version from it before mount, so `loadPage` skips the async
  fetch. No separate content cache — `PageBuffers` already holds every
  visited page for the session.
- **Task 2**: Re-root the editor trail to `[homePage, ...segments]` where
  `homePage = homeSlug ?? 'home'`, and label crumbs with `slugDisplayName`
  (root crumb "Home"). The shell config carries `homeSlug` so the Home crumb
  navigates to the real home page.
- **Task 3**: Add `all_pages_enabled` to `AppSettings` (default `true`),
  mirroring `search_enabled`. Enforce that disabling it requires a configured
  `homeSlug` (so `/` always has a landing). Hide the "All pages" action in
  both chrome layers (including the admin page's own `renderLayout` call) and
  404 `/all` + the `/` index fallback when disabled.
- **Task 4**: Extract the markdown-it viewer renderer into `src/shared`
  (env-agnostic). The editor switches to **block-level source mode**: the
  document is partitioned into markdown-it blocks; every block that does not
  contain the caret renders as `contenteditable=false` reader HTML, and the
  block containing the caret keeps the existing line renderer (caret line raw,
  sibling lines plugin-rendered) so list keybindings and wiki-link navigation
  keep working.

---

## Task 1 — Instant navigation (content embed)

### Files

1. **`src/server/render/editor-shell.ts`** — `editorShellHtml` accepts a
   `page: { content: string; version: number } | null` option and emits a
   second `<script id="wn-page" type="application/json">` holding
   `{ slug, content, version, exists }`, serialized with `<` → `\u003c`
   (e.g. `JSON.stringify(payload).replace(/</g, '\\u003c')`). Apply the same
   escape to the existing `wn-config` embed (its `userName` has the same
   breakout flaw today).
2. **`src/server/routes/pages-html.ts`** — in `renderArticle`'s auth branch,
   `await pages.get(slug)` and pass the record (or `null`) to
   `editorShellHtml`. Unknown-but-valid slugs pass `null` (create-on-save flow
   unchanged).
3. **`src/core/types.ts`** — add `initialContent?: string` and
   `homeSlug?: string | null` to `EditorOptions`.
4. **`src/core/editor-state.ts`** — when `options.initialContent` is defined,
   seed the buffer for the initial page (`setPageText` + `clearHistory`) so
   the loaded state is the undo baseline.
5. **`src/client/api-page-store.ts`** — seed the existing `versions` map from
   the embed (a `seed(page, version)` method or an optional seed argument) so
   the first autosave sends the correct `If-Match`.
6. **`src/client/main.ts`** — read `#wn-page`, seed the store version, and
   pass `initialContent` (and `homeSlug`) into `createEditor`.

### Steps

1. Extend `editorShellHtml` (+ escaping) and `pages-html.ts` to embed
   `{content, version}`.
2. Add `initialContent`/`homeSlug` plumbing (`types.ts` → `editor-state.ts`).
3. Wire `main.ts` + `api-page-store.ts` seeding.
4. Update `edit-routes.test.ts` / `pages-html.test.ts` for the new shell
   output; add a test asserting `</script>` in page content stays inert.

## Task 2 — Breadcrumbs

### Files

1. **`src/core/editor-state.ts`** — `const homePage = options.homeSlug ?? 'home'`;
   initialize `trail = [homePage, ...(initialPage === homePage ? [] : initialPage.split('/'))]`.
2. **`src/core/editor-render.ts`** — `renderBreadcrumb` labels the root crumb
   "Home" (navigating to `trail[0]`, i.e. the home page) and segment crumbs
   with `slugDisplayName` (replacing `pageDisplayName` here only).
3. **`src/server/render/editor-shell.ts`** + **`src/client/main.ts`** — carry
   `homeSlug` in the shell config so the editor knows the home page target.
4. **`src/core/__tests__/editor-render.test.ts`** + **`editor-state.test.ts`**
   — update breadcrumb/trail assertions; add `initialPage:'blog'` →
   `['home','blog']` and `homeSlug:'start'` cases.

### Steps

1. Re-root the trail + add `homeSlug` to state options.
2. Update `renderBreadcrumb` labels + Home-crumb target.
3. Thread `homeSlug` through the shell config and `main.ts`.
4. Update affected tests.

## Task 3 — "Turn off all pages" setting

### Files

1. **`src/server/settings.ts`** — add `KEY_ALL_PAGES = 'all_pages_enabled'`,
   `allPagesEnabled: boolean` (default `true`), and the parse/serialize/update
   plumbing. In `update()`, **reject `allPagesEnabled:false` when the
   resulting `homeSlug` is null** (so `/` always has a landing page).
2. **`src/server/routes/settings-api.ts`** — accept + validate
   `allPagesEnabled?: boolean`.
3. **`src/server/routes/admin.ts`** — add an "Enable all pages listing"
   checkbox + include it in the PUT script **and** pass `allPagesEnabled` to
   the admin page's own `renderLayout` call.
4. **`src/server/render/layout.ts`** — `LayoutOptions.allPagesEnabled?`
   (default true); skip the "All pages" action when false.
5. **`src/server/render/editor-shell.ts`** + **`src/client/main.ts`** — carry
   `allPagesEnabled` in the config; skip the "All pages" action when false.
6. **`src/server/routes/pages-html.ts`** — `chrome()` returns
   `allPagesEnabled`; `/all` and the `/` index fallback render a 404 "not
   found" document when disabled.

### Steps

1. Settings model + service + API + admin form (+ validation).
2. Chrome/layout/editor-shell propagation (incl. admin's own `renderLayout`).
3. Route guards for `/all` and `/`.
4. Update `settings.test.ts`, `admin-routes.test.ts`, `pages-html.test.ts`.

## Task 4 — Reader-parity editor rendering (block-level source mode)

### Design (specified to close the review gaps)

- **Block partition**: parse with markdown-it; each block token's `.map` gives
  `[startLine, endLine]`. Partition the source so block *i* owns source lines
  `[token_i.start, token_{i+1}.start)` — inter-block **blank lines fold into
  the preceding block**, so every source line belongs to exactly one block and
  concatenating blocks' `data-raw` reproduces the document exactly.
- **Rendering**: the block containing the caret line renders with the
  **existing** line renderer (`renderLines` — caret line raw, sibling lines
  plugin-rendered, preserving `data-line`/`data-raw`). All other blocks
  render as markdown-it HTML wrapped in `<div class="wn-rendered"
  contenteditable="false" data-line data-raw="…">`.
- **Caret/offset**: generalize `caret-offset.ts` so `getLineOffset` sums block
  raw lengths (rendered blocks contribute `data-raw`; the active block
  contributes editable lines). `setLineOffset` first **activates** the block
  containing the target offset (re-render), then places the caret in the
  resulting editable `data-line`.
- **Interactions to preserve** (regression guardrails):
  - **Wiki-link SPA navigation**: event delegation on rendered blocks —
    `a.wn-wiki-link` / internal `a[href^="/"]` clicks call `context.navigate`
    instead of a full page load.
  - **List keybindings** (Tab/Shift+Tab/Enter): keep working by keeping the
    active block on the existing line renderer.
  - **Click-to-edit**: mousedown on a rendered block activates its first line
    (v1); precise `caretRangeFromPoint` click→line mapping and cross-block
    ArrowUp/Down are a documented follow-up.
  - **Task checkboxes**: non-active blocks show disabled checkboxes (reader
    parity); toggling means activating the block (documented trade-off).

### Files

1. **`src/shared/viewer-renderer.ts`** (new) — move `createViewerRenderer` out
   of `src/server/render/markdown.ts` (markdown-it config, wiki-link rule,
   task checkboxes, URL policy, external `rel`). Server file becomes a thin
   re-export so `markdown-viewer.test.ts` stays green.
2. **`src/core/editor-render.ts`** — rewrite `render()` to the block model
   (partition → render non-caret blocks via markdown-it, caret block via the
   line renderer).
3. **`src/core/line-renderer.ts`** — keep `renderLines` for the active block;
   add a block-partition helper.
4. **`src/core/caret-offset.ts`** — generalize `getLineOffset`/`setLineOffset`
   to block addressing (incl. activation side effect).
5. **`src/core/editor-lifecycle.ts`** — block-aware extraction (rendered
   blocks contribute `data-raw`, active block recurses) + click-to-activate +
   wiki-link event delegation.
6. Tests: **`editor-render.test.ts`**, **`editor-dom.test.ts`**,
   **`renderer.test.ts`**, **`caret-offset.test.ts`**,
   **`editor-integration.test.ts`** — update for the block model; add cases
   for image/code/table/list rendering and wiki-link delegation.

### Steps

1. Extract + re-export the shared viewer renderer (server tests stay green).
2. Build the block partition + renderer (markdown-it for non-caret blocks,
   line renderer for the caret block).
3. Generalize `caret-offset.ts` (block sums + activation side effect).
4. Rewrite extraction + click-to-activate + wiki-link delegation.
5. Update test suites + add parity/regression cases.

## Phasing

Tasks 1–3 are independently committable and should land first. Task 4 ships in
its own pass (4a shared renderer → 4b block renderer with first-line
activation → 4c optional precise click-mapping / cross-block arrows).

## Risks & Open Questions

- ⚠️ **Task 4 is a large, high-blast-radius change** to the editor's render,
  caret, and extraction core. Mitigation: keep the active block on the
  existing line renderer (so caret math within the block is unchanged) and
  phase 4c as optional.
- ⚠️ **markdown-it in the client bundle** — ~30 KB minified added to
  `dist/client/client.js`. Accepted for reader parity; it is DOM-free so
  `src/shared` stays env-agnostic.
- ❓ **Disabled `/` landing** — plan rejects `allPagesEnabled:false` while
  `homeSlug` is null (validation). Confirm this is preferable to a 404
  landing page.
- ❓ **Breadcrumb casing** — plan uses "Home" (capitalized) + humanized
  segments ("Blog", "First Post") to match the viewer. Confirm you don't want
  literal lowercase slugs in crumbs.
- ❓ **Home crumb target** — plan navigates "Home" to `homeSlug ?? 'home'`
  (SPA). Confirm this (vs. a full-page link to `/`).
