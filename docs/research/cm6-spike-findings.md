# CM6 spike findings (GH-4 / issue #5)

Branch `feature/cm6-spike`. Deliverable from the issue: one page edited in a
CodeMirror 6 `EditorView`, live-preview hiding driven by the existing
tokenizer + `BlockDef` grammar, plus a known-issues list. This document is
evidence for the "what does *single renderer* mean" decision; it does not make
that decision.

## What was built

| File | Role |
|---|---|
| `src/core/cm6/grammar-spans.ts` | DOM-free. Walks `buildDocument()` (the reader's model) and emits offset-addressed spans: `line` / `mark` / `hide` / `replace` / `image`. |
| `src/core/cm6/live-preview.ts` | `ViewPlugin`: spans → `Decoration`s. Per-line activation (selection-touched lines expand; fences/tables block-expand). |
| `src/core/cm6/editor.ts` | `createCm6Editor`: history, default keymap, list Enter/Tab/Shift-Tab (reuses `editor-indentation.ts` helpers), link clicks, `setText`. |
| `src/core/cm6/theme.ts` | The only CSS written for CM6: overrides where reader CSS assumes tree *shape*. |
| `src/client/cm6-spike.ts` | Mounts the shared shell + CM6 view; breadcrumb/nav/popstate/toasts via shared modules; unchanged `ApiPageStore` / If-Match / debounced autosave (dirty-only). |
| `src/client/chrome.ts` | Shared by BOTH surfaces: header actions, popstate bridge, save/conflict/auth toast events. |
| `src/core/breadcrumb.ts` | Shared by BOTH surfaces: breadcrumb painter (extracted from `editor-render.ts`). |
| `src/client/main.ts` | `?cm6=1` opt-in, via dynamic import (keeps CM6 out of the default chunk). |

Try it: `npm run build`, run the server, open `/{slug}?cm6=1` while signed in.

## Evidence

Exercised, not inferred:

- **Source fidelity.** Select-all + `copy` in Brave returned a string `===` the
  server-side saved content. The document is always the exact markdown.
- **Save flow unchanged.** Mock-API smoke run: edits produced `PUT`s with
  `If-Match: "1"`, then `"2"` (versions track through `ApiPageStore`); saved
  content ended `…\n- item **three**\n- next [[Other Page]]`.
- **List continuation.** Real `Enter` in the browser continued `- `; unit tests
  cover ordered numbering, empty-item-ends-list, Tab/Shift-Tab caret mapping,
  and that a fenced `1. step` is not a list item.
- **Navigation.** Wiki-link activation on a collapsed line navigated
  (`/home` → `/other-page?cm6=1`, empty new page). On the caret's own line the
  click places the caret instead; Ctrl/Cmd-click always navigates (unit-tested).
- **Grammar-level parity.** `cm6-grammar-spans.test.ts` asserts that for a
  corpus the CM6 collapsed text (source − hidden spans + replacements) equals
  the reader's `textContent` minus nodes reader CSS hides — including that
  unsafe links/images/wiki targets stay **literal** on both surfaces.
- **Cost.** Whole-document `grammarSpans()` pass: 0.3 ms @100 lines, 2.5 ms
  @1 000, 8.6 ms @5 000 (node, mixed-markup corpus).
- **Bundle.** Lazy chunk `cm6-spike-*.js` (CM6 state/view/commands + spike
  code + `@codemirror/language`/lezer pulled in by `commands`): 446 kB
  unminified / 278 kB minified (esbuild) / ≈91 kB gzip of the minified file.
  Default `main` chunk (no CM6): 81 kB minified, ≈24 kB gzip. The current
  `vite build` output was observed unminified (`--minify esbuild` did not change
  sizes), so the shipped delta today is the unminified figure.
- **Size of the swap.** Spike: 797 lines (incl. client bootstrap). Files that
  are *candidates* for removal on a switch: 3 003 lines (`caret-offset`,
  `content-text`, `cursor`, `editor-dom`, `editor-lifecycle`,
  `editor-navigation`, `editor-text-ops`, `editor-render`, `editor-keymap`,
  `renderer`, `line-renderer`, `editor-history`, `page-buffers`). [INFERENCE]
  that most of that goes; chrome in `editor-dom.ts` (header, toolbar, panels,
  toasts) would be kept and rehomed.
- **Test infra.** CM6 state, decorations and keymaps run fine under the
  existing happy-dom project (no layout). GH-1..GH-3-style selection/clipboard
  bugs are not reproducible in happy-dom either way.

## Known issues / not done

Divergences and gaps — each is work a real cutover must do or consciously drop.

1. **Tables.** Rows render as raw source with dimmed pipes; reader hides pipes
   and lays cells out (flex). Flat `.cm-line`s have no row wrapper, so reader CSS
   cannot apply. Options: block widget when collapsed (loses native selection
   inside cells), or per-cell inline-block marks + fixed column widths. Excluded
   from the parity corpus on purpose.
2. **Decisions duplicated, not shared.** `grammar-spans.ts` re-implements what
   each plugin's `render()` / `renderToHTML()` decide (link scheme safety via
   `isSafeHref`, wiki slug folding, `isSafeImageUrl`, list bullet vs ordered).
   The parity test catches drift only for its corpus. A real port needs a
   plugin-side `decorate(token): Span[]` hook so there is one decision site per
   token. This is the central design cost of option 2 and the security-relevant
   one (reader strings are served to anonymous users).
3. **Plugin API.** `ContentPlugin.render()` (DOM) and `onKeydown()` (reads DOM
   selection, round-trips through `setPageText`) have no CM6 meaning.
   `listItem.ts` handlers were re-expressed as CM6 commands here; third-party
   plugins would need a new contract (state-based keymap + decorations).
   `onNavigate` was replaced by the single `data-page` mousedown handler.
4. **Reader CSS reuse is partial.** Class vocabulary is shared (`wn-h1`,
   `wn-bold`, `wn-wiki-link`, …) so token/content CSS applies unchanged, but
   rules assuming structure had to be overridden in `theme.ts`: code-block
   wrapper (rebuilt from `wn-region-first/-last`), `wn-table-row` flex,
   `wn-table-sep` zero-height, list `display:flex` (not applied: list items are
   marks, not a wrapper). `docs/theming.md` would need a CM6 section.
5. **Hanging indent for wrapped list items** is not implemented (no wrapper
   element to pad); long bullets presumably wrap to the margin. [INFERENCE —
   not exercised.]
6. **Not incremental.** Decorations rebuild from scratch on every doc *and*
   selection change (`buildDocument` is whole-document). Fine at ≤5k lines;
   needs caching/viewport scoping beyond that. Selection moves within one line
   still trigger a full rebuild.
7. **Active-line UX is richer than production.** Production renders the caret
   line as plain unstyled text; the spike keeps heading size/bold/etc. and dims
   markers (`wn-punct`). Deliberate (avoids heading collapse on click) but a
   product call. Click-to-edit layout shift on collapse/expand is inherent to
   the model (same as Obsidian).
8. **Chrome is shared; two pieces are not ported.** The CM6 surface mounts the
   production shell (`createEditorDOM`: header, breadcrumb trail, site nav
   actions, site bands, admin theme, toasts, popstate) and navigates through the
   same code as the production editor (`applyTrailNavigation`,
   `pageAddressToSlug`, `seedContentFor`, `renderBreadcrumb`, `createStoreEvents`
   — all extracted and used by both surfaces). Not ported: the shortcuts overlay
   (its table lists production bindings that do not all exist under CM6) and the
   formatting shortcuts (`editor-format.ts` — portable via `changeByRange`).
   UI plugin slots (`wn-toolbar`) are not mounted.
9. **Undo** is CM6 `history()` (per page via fresh state on `setText`), not
   `PageBuffers`/`EditorHistory`; undo depth/semantics differ (CM6 groups typing
   by time).
10. **Unverified (needs a human/device, not exercised here):** IME composition,
    mobile soft keyboard/selection handles, bidi, screen-reader behaviour of
    replaced widgets (a11y tree showed collapsed text only — good for AT, but
    unaudited), drag-and-drop, the image widget on a real remote image (the
    smoke environment had no network; widget DOM is unit-tested only).
11. **CRLF.** CM6 normalises line separators in its document; pages stored with
    `\r\n` would change on first edit. [INFERENCE — not exercised.]
12. `surface-parity.test.ts` (tree-shape equality) cannot be re-keyed 1:1 —
    there is no editor tree to compare. The replacement is text-level
    (collapsed-text) parity plus shared class vocabulary; tree-shape assertions
    would apply only to the reader.

## Reading the evidence

- Option 2 is viable for the grammar: inline marks, headings, quotes, lists,
  fences, images and links all decorate from the unchanged tokenizer/BlockDefs,
  and the reader is untouched.
- The two real costs are (a) the plugin contract (issues 2–3) and (b) tables
  (issue 1). Neither is blocked by CM6; both need design.
- Hand-rolled GH-1..GH-3 behaviour (model-driven copy, selection mapping,
  composition) was not reimplemented here — it simply is not in the spike's
  797 lines.
