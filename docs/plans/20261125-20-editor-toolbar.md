---
issue: 20
title: Add an editor formatting toolbar (bold, italic, underline, list, link)
type: feature
branch: feature/20-editor-toolbar
status: implemented
created: 2026-11-25
pr: ""
---

# Add an editor formatting toolbar (bold, italic, underline, list, link)

Issue: #20

## Goal

Authenticated users editing a page get a toolbar (in the editor's existing `wn-toolbar` row, under the header) with **Bold**, **Italic**, **Underline**, **Bullet list** and **Link** buttons. Bold/italic/underline/list act on the selection exactly like their keyboard shortcuts: toggle, one undo step, autosave, inert inside fenced code and tables. Buttons show an active state when the caret sits in that format. **Link** opens an inline field in the toolbar row: free text is auto-classified as a wiki link (`[[target|label]]`) or an external URL (`[label](url)`), with a page-name suggestion dropdown for wiki targets; the same field is what `Ctrl+K` opens, and it edits an existing link when the caret is inside one. Underline gains real markdown grammar (`<u>text</u>`) rendered identically by the editor and the anonymous reader, plus `Ctrl+U`.

## Non-goals

- Headings, code, strikethrough, quote, image, numbered-list, unlink buttons.
- Nesting between inline marks. Bold, italic, strikethrough and now underline all match flat (`<u>**x**</u>` shows the inner `**` literally, as `**<u>x</u>**` does). Toggling one mark inside another produces nested markers that do not render nested. Unchanged from today's bold/italic behavior.
- General inline HTML. Only the exact `<u>…</u>` pair becomes a token; everything else stays escaped text.
- The CM6 spike (`?cm6=1`): no toolbar, no underline decoration.
- Toolbar in the anonymous reader, user-configurable toolbars, a plugin API for toolbar buttons.
- Link-target validation beyond syntax/safety (a wiki target need not exist; it auto-creates on click as today).

## Context

- **Slot already exists.** `createEditorDOM` (`src/core/editor-dom.ts`) appends an empty `div.wn-toolbar` between header and body, styled (`--wn-gap-toolbar`, `--wn-padding-toolbar`, `--wn-color-toolbar-bg/border`) and hidden by `.wn-toolbar:empty`. `editor-lifecycle.ts` maps it as UI slot `wn-toolbar`. Nothing mounts into it today.
- **Shortcut pipeline** (`src/core/editor-keymap.ts`): `Ctrl+B/I/K` call `formatOp` → `runTextOp` → pure `toggleWrap` / `wrapLink` (`src/core/editor-format.ts`) → `commitModelEdit` (`editor-commit.ts`: `setPageText` = one undo step, forced render, restore raw-offset selection, `scheduleSave`). `formatOp` consumes-and-no-ops when `selectionInBlock` (fences, tables). `SHORTCUT_BINDINGS` is the single table for keymap help overlay (`plugins/shortcuts-help.ts`) and `docs/shortcuts.md`.
- **No underline grammar.** Plugins: `src/core/plugins/{inline,strikethrough,...}.ts`, registered in `plugins/defaults.ts`; tokens are flat regexes (`bold`: `/\*\*([^*]+)\*\*/`), editor render via `withPunct` (dimmed markers + `data-raw` on the span), reader via `renderToHTML`. Reader and editor share `src/core/styles.ts` (`.wn-strikethrough { text-decoration: line-through }`). Parity guarded by `__tests__/surface-parity.test.ts` and the content-text corpus property test (AGENTS.md: single renderer, text fidelity). `src/core/cm6/grammar-spans.ts` switches on token types for the spike only.
- **Ctrl+U today** is not bound, so the browser's native contenteditable underline runs and inserts DOM `<u>` that the source extraction flattens.
- **Wiki links:** `wikiLinkPlugin` pattern `/\[\[([^\]]+)\]\]/`; targets resolve relative to the current page (`wikiLinkAddress`, `wikiLinkBase` in `src/shared/slug.ts`: `[[beta]]` on `alpha` → `/alpha/beta`, `[[/beta]]` root). `navTargetToSlug` is the fold. Slugs are `[a-z0-9-]` segments, so a target containing a dot can never be a page. Markdown link pattern `/\[([^\]]+)\]\(([^)]+)\)/`; safety via `isSafeHref` / `classifyLinkTarget` (`src/shared/url-policy.ts`).
- **Precedent for an inline field in chrome:** `src/core/page-move-field.ts` replaces the breadcrumb with an input + live status text (Enter submits, Escape/blur cancels).
- **Tokenizer** (`src/core/tokenizer.ts`): `tokenizeLine` / `scanInline` are flat; a list line is one `list-item` token whose content is re-scanned by `renderInline`. `editor-lifecycle.ts` already listens to `document` `selectionchange` (line activation).
- **Page search:** `GET /api/pages?q=&limit=` (`src/server/routes/pages-api.ts` → `repo.list`) matches **slug OR title OR content** (`pages-pg.ts` ILIKE, `pages-memory.ts` includes), newest first, cap 500. Content matches would pollute and crowd out name matches. `PageStore` (`src/core/types.ts`) is core's transport-agnostic port with optional capabilities (`move?`, `canonicalOf?`); `ApiPageStore` is `src/client/api-page-store.ts`, `createMemoryPageStore` is `src/core/memory-page-store.ts`.
- **Tests:** vitest dom + node projects; `editor-shortcuts.test.ts` mounts the real editor and dispatches chords (happy-dom: `removeAllRanges` before `addRange`, no `Selection.modify`); `editor-format.test.ts` covers the pure ops; server API tests use `app.inject`; pg integration needs `WN_TEST_PG_URL`. `test_command: npm test`.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | Underline source syntax is **`<u>text</u>`**: new `underline` content plugin (`/<u>([^<]+)<\/u>/`), editor render with dimmed `<u>` / `</u>` markers, reader emits `<span class="wn-underline" data-raw=…>` (a class, like bold/strike; no raw HTML ever emitted), CSS `.wn-underline { text-decoration: underline }` in `styles.ts`. | `++text++`; `__text__` (CommonMark bold). | User decision. Portable: renders underlined on GitHub/Obsidian. Content stays escaped, so no XSS surface. |
| 2 | **One Link button** with auto-detect, opening an inline field **in the toolbar row** (replaces the buttons while open, restores on close). Not a popover. | Two buttons; floating popover. | User chose one button. Row-hosting needs no positioning logic, is full-width on mobile, and follows the move-field precedent. |
| 3 | **Classification** (`classifyLinkInput`): URL when the trimmed input has a scheme, starts `www.` or `//`, or contains a `.` with no whitespace (slugs can never contain dots, so no ambiguity); otherwise wiki link. Bare hosts (`example.com`, `www.x.y`) get `https://`. | Always ask; separate buttons. | Zero extra clicks; the dot rule is unambiguous against slug policy. A live hint shows the outcome (`Wiki link → /a/b` / `URL`). |
| 4 | **Output:** URL → `[selection](url)`, no selection → `[url](url)`. Wiki → `[[target\|selection]]`, or `[[target]]` when nothing selected or selection equals the target. Typed wiki targets are written as typed (relative semantics, the hint shows the resolved address via `wikiLinkAddress`); a **chosen suggestion** is written minimally: base-relative remainder when the slug is under the current page's link base, `/slug` when not, bare slug at root. | Always root-absolute; always slugified. | Matches how authors write links today and keeps relative links relative. |
| 5 | **Rejection, never corruption:** `isSafeHref` fails (`javascript:` …), wiki target folds to no slug (`navTargetToSlug(wikiLinkAddress(...))` null), target contains `]` or `\|`, URL contains whitespace or `)` , selection contains `]` or a newline. Show an inline error in the field, insert nothing. | Silently encode/strip. | Patterns are `[^\]]+` / `[^)]+`; anything else breaks the token. |
| 6 | **Editing an existing link:** `findLinkAt(text, start, end)` finds the `[label](url)` or `[[target\|label]]` token whose range contains the selection. Present → field prefilled with the target; submit rebuilds the token with the same label (kind can switch wiki ↔ URL). Absent → new link around the selection. | Button only creates. | User decision, paired with Decision 7. |
| 7 | **`Ctrl+K` opens the same field** (replaces the `[sel]()` type-over). `wrapLink` is deleted; `editor-shortcuts` and `editor-format` tests of it are rewritten against the new behavior; `docs/shortcuts.md` / `SHORTCUT_BINDINGS` updated. | Keep both. | User decision; one link UX. |
| 8 | **Suggestions via a new server option `scope=name`** on `GET /api/pages` (slug/title only), `limit` ≤ 8 from the field, plus optional port **`PageStore.suggest?(query, limit): Promise<PageSuggestion[]>`** (`{slug, title}`) implemented by `ApiPageStore` and `MemoryPageStore`. When a store lacks `suggest`, the field works without the dropdown. Client debounces 150 ms, drops stale responses (sequence counter), ranks slug/title prefix matches first. | Filter `?q=` results client-side; call `fetch` from core. | `q` also matches page bodies, so name matches can be crowded out of the newest-N window; core must stay transport-agnostic (`move?` precedent). Additive and backwards-compatible API change. |
| 9 | Dropdown is an ARIA combobox: input `role=combobox` + `aria-controls` + `aria-activedescendant`, `ul role=listbox`. ArrowUp/Down move, Enter picks the highlighted suggestion else commits typed text, Escape cancels, blur cancels. A picked suggestion commits immediately as a wiki link (Decision 4). | Tab completes only. | Standard pattern; fewest keystrokes. |
| 10 | **Selection survives the field:** buttons call `preventDefault` on `mousedown` so the editor keeps focus/selection; opening the field captures `{start,end}` raw offsets **and the page text**; on submit the edit is applied only if the page and its text are unchanged, else the field just closes (no write). Closing refocuses the editor and restores the selection through `commitModelEdit`. | Re-read the live selection on submit. | The input steals the DOM selection; text can change meanwhile (autosave `setContent`, navigation). |
| 11 | **Architecture:** a core module `src/core/editor-toolbar.ts` created by `editor-lifecycle.ts` with the shared commit deps and mounted into `dom.toolbar`; not a `UIPlugin` (a plugin only receives its slot element, but buttons need the commit path). The slot stays open for third-party UI plugins. Format actions go through one `EditingKeymap.format(action)` so buttons and chords share code. | Built-in UIPlugin with a service back-reference. | No new plugin-context surface for a built-in. |
| 12 | **List button = bullet only**, `toggleList` in `editor-format.ts`: every selected non-blank line outside block regions; if all are `-`/`*`/`+` items → remove markers; otherwise add `- ` after the indent (numbered/lettered items get their marker replaced by `- `). Lines in fenced/table regions (from the document model, injected as `blockLines(text)`) are skipped; nothing to change → no-op. Collapsed caret keeps its place relative to its text. | Include numbered list; list only when no selection spans a heading. | User decision (bullet only). Block-line skip avoids splicing `- ` into code when a selection straddles a fence. |
| 13 | **Shortcuts:** add only `Ctrl+U` (underline, `toggleWrap` generalized to `(open, close)`); list and link buttons have none beyond `Ctrl+K`. `Ctrl+U` is consumed so the native contenteditable underline and the browser's view-source can't fire; inert inside blocks like B/I. | None; chords for everything. | User decision. |
| 14 | **Active state:** pure `activeFormats(text, start, end, defs)` scans the caret line with the registry's token defs and reports `bold`/`italic`/`underline`/`link`/`list`; a list line's content is re-scanned with the inline defs (offsets adjusted). Recomputed on `selectionchange` (rAF-coalesced) and after commits. Buttons use `aria-pressed`; disabled (and inert) while the selection is inside a block region or the page isn't loaded. | Query `document.queryCommandState`; no state. | User chose state display; it must come from the markdown source, not DOM styling. |
| 15 | **Buttons:** `<button type="button">` with `aria-label`, `title` including the chord (`Bold (Ctrl+B)`), text glyphs (**B**, *I*, <u>U</u>, •, a link glyph) so no icon assets; toolbar `role="toolbar"` + `aria-label="Formatting"`; ≥ `--wn-touch-target` (44px) on narrow screens via the existing media block. | SVG icons. | No asset pipeline; themeable via `currentColor`. |
| 16 | **New theming surface:** `--wn-color-toolbar-button-hover-bg`, `--wn-color-toolbar-button-active-bg` (fall back to existing tokens), CSS hooks `.wn-toolbar-btn[aria-pressed=true]`, `.wn-link-field*`; documented in `docs/theming.md`. | Reuse only existing tokens. | Required by AGENTS.md for editor token changes. |

## Design

### Underline grammar (`src/core/plugins/underline.ts`)
Token `{ type: 'underline', pattern: /<u>([^<]+)<\/u>/ }`. `render` → `withPunct('wn-underline', …)` generalized to take distinct open/close markers (`<u>`, `</u>`); sets `dataset.raw = token.raw` (cursor fidelity, as strikethrough does). `renderToHTML` → `<span class="wn-underline" data-raw="…"><span class="wn-punct">&lt;u&gt;</span>{escaped inner}<span class="wn-punct">&lt;/u&gt;</span></span>`. Registered after italic in `defaults.ts`, exported from `plugins/index.ts` and `core/index.ts` like the others. Reader CSS hides punctuation the same way it already does for bold. The spike's `grammar-spans.ts` is left alone; step 1 verifies unknown token types are ignored there.

### Pure ops (`src/core/editor-format.ts`)
- `toggleWrap(text, start, end, open, close = open)`: existing three-rule toggle with an asymmetric pair (`Ctrl+B` stays `toggleWrap(…, '**')`).
- `toggleList(text, start, end, skip?: ReadonlySet<number>) → FormatResult | null` (Decision 12).
- `activeFormats(...)` (Decision 14), using `LIST_ITEM_RE` from `editor-indentation.ts` (single list-grammar source).
- Link ops move to a new `src/core/link-input.ts` (DOM-free): `classifyLinkInput(raw) → { kind: 'url', url } | { kind: 'wiki', target } | { kind: 'error', message }`, `suggestionTarget(slug, linkBase)`, `findLinkAt(text, start, end)`, `applyLink(text, start, end, input, linkBase) → FormatResult | { error }` (builds `[[…]]` / `[…](…)`, replaces an existing token's range when `findLinkAt` hit, returns the selection after the link). Link safety (`isSafeHref`) stays the plugins' gate for output; the field calls the same predicates before inserting so nothing the reader would refuse gets written.

### Keymap (`editor-keymap.ts`)
`EditingKeymap` gains `format(action: 'bold'|'italic'|'underline'|'list'): boolean` (shared by chords and buttons through `formatOp`; `list` additionally passes `deps.blockLines`) and `Ctrl+U`. `EditingKeymapDeps` gains `blockLines(text)` and `openLink()`; `Ctrl+K` calls `openLink()` (still inert in blocks). `SHORTCUT_BINDINGS`: Ctrl+U added, Ctrl+K action reworded.

### Toolbar (`src/core/editor-toolbar.ts`)
`createEditorToolbar(host, deps): { destroy() }`. Builds the five buttons; `mousedown` → `preventDefault`; `click` → `keymap.format(action)` / `openLink()`. A `selectionchange` listener (rAF) reads the selection offsets, the page text and token defs, calls `activeFormats`, and toggles `aria-pressed`/`disabled`. Destroyed with the editor (listener removal in the lifecycle `destroy`). While the link field is open the buttons are hidden, not destroyed.

### Link field (`src/core/link-field.ts`, modeled on `page-move-field.ts`)
`openLinkField(host, { initial, suggest?, linkBase, apply(input) → error|null, close() })`: input (combobox), status line (`role=status`: classification hint or error), suggestion listbox positioned absolutely under the row (`.wn-toolbar { position: relative }`, above `.wn-body`). Flow: capture selection+text → open field (prefilled from `findLinkAt`) → type → debounced `suggest(query, 8)` (sequence-guarded) → Enter → `applyLink` → on success `commitModelEdit` (one undo step, autosave), close, refocus editor; on error keep open, show message. Escape/blur/page navigation/stale text → close with no write. Only the field's DOM is owned here; the commit goes through the existing path.

### Suggestions API
`list(opts)` gains `scope?: 'name'` (pg: `slug ILIKE $1 OR title ILIKE $1`; memory: same filter minus content). `GET /api/pages?q=&scope=name&limit=` (unknown `scope` values → 400; omitted → today's behavior unchanged). `PageStore.suggest?` per Decision 8; `ApiPageStore.suggest` calls `/api/pages?scope=name` and maps `{slug,title}`; `MemoryPageStore.suggest` filters its seeded pages. Both rank prefix matches first; `ApiPageStore` ignores network errors (empty list).

### Edge cases
Collapsed caret + bold/italic/underline → empty marker pair with caret between (existing rule). Multi-line selection + Link → inline error. Selection in fence/table → buttons disabled; chords consumed no-op. Page switches while the field is open → closed. Read-only/not-loaded page → buttons disabled. Underline inside an existing `<u>` toggles off via the generalized rule 2.

## Testing

- **Unit (node/dom projects):** `editor-format.test.ts` (asymmetric `toggleWrap`, `toggleList` matrix: none/all/mixed/numbered/blank lines/block-skipped/collapsed caret, `activeFormats` per format incl. list content and token boundaries); new `link-input.test.ts` (classification table incl. `mailto:`, `www.`, `a.b`, spaces, `javascript:`, unfoldable wiki targets, `]`/`|`/`)` rejections, `suggestionTarget` relative/absolute/root, `findLinkAt`, `applyLink` outputs and selection results); `plugins.test.ts` / `static-renderer.test.ts` / `tokenizer.test.ts` for underline (escaping: `<u><script></u>` stays text — the `[^<]+` body cannot hold a tag); `surface-parity.test.ts` and the content-text corpus test include `<u>` cases; `plugin-registry`/defaults tests that enumerate plugins updated.
- **Editor end-to-end (happy-dom, `editor-shortcuts.test.ts` style):** new `editor-toolbar.test.ts`: click each button on a real selection → buffer text, one undo step (`Ctrl+Z` restores), autosave scheduled, selection restored; `mousedown` default prevented; `aria-pressed` follows the caret; disabled in fence/table; `Ctrl+U`; `Ctrl+K` opens the field; link field flows (URL, wiki, typed vs suggested, error cases, Escape, stale-text cancel, prefilled edit of an existing link, kind switch), with a fake `suggest` and fake timers for the debounce/stale-response race.
- **Server:** `pages-memory.test.ts` and `pages-pg.integration.test.ts` (`scope=name` excludes body-only matches, honors `limit`); `pages-api.test.ts` (`scope=name`, 400 on unknown scope, unchanged default); `api-page-store.test.ts` (`suggest` request/mapping/error swallowed); `memory-page-store.test.ts`.
- **Not unit-testable in happy-dom** (real focus/selection behavior, Ctrl+U vs browser, touch): manual, below.
- **Manual (`npm run dev`, needs Postgres; `manual_test_url` unset, use the dev server URL):** in Chrome and Firefox, select text and press each button (selection and caret must persist, no focus flash); keyboard-activate buttons with Tab/Enter; `Ctrl+U` does not open view-source or inject native underline; link field with typing `lore/old-gods`, `example.com`, `https://x.y/z?a=(1)`, `javascript:alert(1)`; suggestions keyboard navigation; reload and view the page anonymously (underline renders, links correct); narrow viewport / touch emulation (buttons ≥ 44px, field full width, no virtual-keyboard dismissal on button press).
- **Gate before filing:** `npm run typecheck && npm run lint && npm run test:coverage && npm run build` (pg integration with `WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes`).

## Steps

- [x] 1. Underline grammar: `plugins/underline.ts` (+ `withPunct` asymmetric markers), defaults/exports, `.wn-underline` CSS, tests (plugins, static renderer, tokenizer, surface parity, content-text corpus), confirm the CM6 spike ignores the new token type; `docs/theming.md` class hook.
- [x] 2. Format ops + keymap: generalize `toggleWrap(open, close)`; add `toggleList` and `activeFormats`; `EditingKeymap.format()` + `blockLines` dep (wired in `editor-lifecycle.ts`); `Ctrl+U`; `SHORTCUT_BINDINGS` + `docs/shortcuts.md`; unit + `editor-shortcuts` tests.
- [x] 3. Link ops (pure): `src/core/link-input.ts` (`classifyLinkInput`, `suggestionTarget`, `findLinkAt`, `applyLink`) with full unit tests. No UI yet; `wrapLink` still serves `Ctrl+K`.
- [x] 4. Suggestions backend: `list({scope:'name'})` (pg + memory), `GET /api/pages?scope=name`, `PageStore.suggest?`, `ApiPageStore` + `MemoryPageStore` implementations; tests incl. pg integration; `docs/api.md`.
- [x] 5. Toolbar: `editor-toolbar.ts` with Bold/Italic/Underline/List buttons, active/disabled state, `mousedown` focus retention; mount in `editor-lifecycle.ts`, destroy cleanup; CSS in `editor-dom.ts` (incl. mobile touch targets) and new tokens in `docs/theming.md`; `editor-toolbar.test.ts`; `docs/architecture.md` module note.
- [x] 6. Link field + cutover: `link-field.ts` (combobox, hint/error, suggestions, stale-text guard), Link button in the toolbar, `Ctrl+K` opens the field, `wrapLink` and its tests removed, shortcuts docs/help text reworded; end-to-end link tests; `docs/architecture.md` request-flow note.

## Risks & open questions

- *Accepted:* No nesting between inline marks (Non-goals); toggling bold inside `<u>…</u>` produces markers that render literally, same class of limitation as bold/italic today.
- *Accepted:* Any existing page that already contains a literal `<u>x</u>` now renders underlined instead of as visible text.
- *Accepted:* The list button applies to any non-blank line, including headings and quotes (`- # Title` renders as a list item with literal `#`), like VS Code's markdown list toggle.
- *Accepted:* Real-browser selection/focus retention on button press, `Ctrl+U` suppression, and touch behavior are verified manually only (happy-dom cannot model them); step 5/6 manual pass covers Chrome and Firefox.
- *Accepted:* `scope=name` is a new, optional `/api/pages` parameter; old clients unaffected.
- *Accepted:* Other-editor changes to the page while the link field is open cancel the pending link without a write.

## Implementation notes

- 2026-11-26 — Small refinements inside the plan's design, no change to decisions or steps:
  - `findLinkAt(text, start, end, defs)` takes the registry's token defs (so link precedence comes from the real grammar rather than a second regex); the shared single-line token scan is `coveringTokens` in `editor-format.ts`, reused by `activeFormats`.
  - The selection-capture / stale-text guard lives in a small `editor-link.ts` controller; `link-field.ts` owns only the field DOM and typing/suggestion UX (Design had both in the field).
  - Suggestion ranking is the pure `rankSuggestions` in `link-input.ts`, applied by the field (stores return the raw matches).
  - The shared worktree was provisioned by copying `.env` and `node_modules` from the main checkout (as the #17 worktree was); pg integration tests ran against the existing local Postgres (`worldnotes_test`).
## Review
