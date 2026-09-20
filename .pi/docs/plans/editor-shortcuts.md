# Editor Shortcuts Plan (rev 2 — after dual review)

- **Date:** 2026-09-20 17:26 UTC (rev 2 same session)
- **Branch (to create):** `feature/editor-shortcuts`
- **Author decisions (interview):** full shortcut set incl. markdown
  formatting; VS Code-style multi-line move (selection preserved); Ctrl/Cmd
  modifier parity; discovery via docs page **and** in-editor help overlay.
- **rev 2 = plan stress-tested by two adversarial reviewer subagents.**
  Both verified the core architecture (pure-ops layer, `setPageText` commit,
  undo granularity, fidelity/single-renderer safety, no keymap/plugin
  conflicts, `wn-overlay` genuinely unused, `Ctrl+Backspace` bug claim) and
  returned "amend before implementing". All P1/P2 findings below are merged
  into this revision; the changelog is at the bottom.

## Goal

Add a coherent set of VS Code-style keyboard shortcuts to the inline editor:
line moving/duplication/deletion, word-wise deletion and motion, markdown
wrapping (bold/italic/link), manual save flush, and a toggling shortcuts-help
overlay — all undoable in one step each and safe under the single-renderer /
byte-exact text-fidelity constraints.

## Approach

Two layers, mirroring the existing split between pure helpers
(`editor-indentation.ts`) and DOM glue (`editor-lifecycle.ts`):

1. **Pure document-string ops** (`editor-text-ops.ts`, `editor-format.ts`) —
   no DOM, fully unit-testable.
2. **One keymap glue module** (`editor-keymap.ts`) that maps DOM selection ↔
   raw offsets via direction-biased `caret-offset.ts` helpers, runs the pure
   op, commits with `setPageText` (one undo step, one autosave schedule),
   re-renders, and restores caret *or selection* via `setSelectionOffsets`.

The help overlay is a `UIPlugin` mounted into the unused `wn-overlay` slot;
it owns `Ctrl+/`/`Escape` itself (capture + `stopPropagation`) and renders
its table **from the keymap's exported binding data** — no duplicated table,
no double-binding.

This fixes latent bugs on the way: `Ctrl+Backspace` currently falls into the
plain-Backspace branch (word-delete never worked; no modifier guard), and
Tab/Enter fallbacks lack modifier guards too (`Ctrl+Enter` inserts a newline
today).

## Shortcut table (v1)

The binding table lives as **exported data in `editor-keymap.ts`**
(`SHORTCUT_BINDINGS: { group, keys[], action }[]`) — the help overlay and
`docs/shortcuts.md` both derive from it. Ctrl = Ctrl/Cmd; Alt = Alt/Option.

| Keys | Action |
|---|---|
| `Alt+↑` / `Alt+↓` | Move every line touched by the selection up/down; selection follows. No-op at document edges. Collapsed caret → caret's line only |
| `Ctrl+Shift+D` | Duplicate every line touched by the selection; selection lands on the copy |
| `Ctrl+Shift+K` | Delete every line touched by the selection; caret lands at start of the replacing line (or new last line if doc empties) |
| `Ctrl+Backspace` (alias `Alt+Backspace`) | Delete word left, **line-scoped**: if caret is exactly at line start → delete the preceding `\n` (join); else delete the whitespace run directly left (stop at line start, never cross `\n`); else delete the same-class run (`[A-Za-z0-9_]` vs. punctuation) leftward. Non-collapsed selection → delete selection |
| `Ctrl+←/→`, **alias `Alt+←/→`** | Move caret by word; classes: word `[A-Za-z0-9_]` / whitespace / punctuation; whitespace runs include `\n`, so motion crosses lines (VS Code-like). Alt alias because macOS swallows `Ctrl+←/→` (Mission Control) and `Cmd+←` is browser-back |
| `Ctrl/Alt+Shift+←/→` | Extend/shrink selection by word **from the focus end** (direction from live Selection, not DOM order; see happy-dom note) |
| `Ctrl+B` | Toggle `**bold**` around selection (exact surrounding-match unwrap). Collapsed → insert `****`, caret between |
| `Ctrl+I` | Same with `*italic*` |
| `Ctrl+K` | Wrap selection as `[selection]()`, URL slot selected (type-over). Collapsed → `[]()`, caret in parens |
| `Ctrl+S` | Flush the debounced save immediately (`saveNow()`; see §Save wiring — replaces the window-level handler in `main.ts`) |
| `Ctrl+/` | Toggle shortcuts-help overlay (owned by the overlay plugin, document-level capture; `Escape` closes while open) |

Not bound: `Ctrl+F/P/A` (native), plain `Tab`/`Shift+Tab`/`Enter` (listItem
plugin + lifecycle fallbacks), `Ctrl+Z/Y/Shift+Z` (exist), `Ctrl+Tab` (browser
tab-switch — the new guard makes it *stop* inserting spaces, intended).

## Files

1. **`src/core/caret-offset.ts`** — **direction-biased refactor, not a bolt-on.**
   `tryGetLineOffset` hardcodes `range.startContainer/startOffset` in ~8
   places and its three ancestor-container fallbacks are start-biased (a
   block-wrapper anchor maps to the region *start*; `(el, kids.length)` maps
   one **past** document end; the `\n`-between-containers branch is
   end-oriented). Parameterize the walk as
   `mapBoundary(el, node, offset, bias: 'start' | 'end')` where each
   fallback resolves toward the document interior for `start` and away for
   `end`; clamp every mapped value to `[0, raw.length]`; **normalize start ≤
   end is a sanity assertion, not a mismapping absorber**. New exports:
   `getSelectionOffsets(el) → { start, end } | null` (null if **either** end
   fails to map or `!el.contains(endContainer)`) and
   `setSelectionOffsets(el, start, end)` (builds one Range from two
   boundary placements; `removeAllRanges()` first — happy-dom ignores
   `addRange` while a range exists). `setLineOffset` delegates for collapsed
   ranges. Existing single-caret behavior pinned unchanged by
   `caret-offset.test.ts`.
2. **`src/core/editor-text-ops.ts` (new, pure)** —
   `selectedLineRange(text, selStart, selEnd)` (exclude a boundary line when
   the selection ends exactly at its start — coherent with the clamped
   mapping), `moveLines` / `duplicateLines` / `deleteLines`
   (`→ { text, start, end } | null`), `deleteWordLeft`, `moveWord`.
3. **`src/core/editor-format.ts` (new, pure)** — `toggleWrap(text, start,
   end, marker) → { text, start, end }`, `wrapLink(text, start, end) →
   { text, urlStart, urlEnd }`.
4. **`src/core/editor-keymap.ts` (new)** —
   `createEditingKeymap({ editorEl, getCurrentPage, pageExists, getPageText,
   setPageText, render, scheduleSave, saveNow })` and
   `handle(event): boolean`. `scheduleSave` is called after every
   **text-changing** op (motion/overlay ops don't save). When
   `getSelectionOffsets()` returns `null` → **consume-and-noop** for every
   family (deterministic; no leaked browser defaults). Formatting is
   consume-and-noop inside `data-block` regions (R5); line/word ops are
   allowed there (R3). Exports `SHORTCUT_BINDINGS` (see table note).
5. **`src/core/editor-lifecycle.ts`** —
   - Extract `saveNow()`: **clear the pending debounce timer**, read the
     buffer at call time, run the existing save body (keeps `onSave` callback
     + error-toast semantics — unlike main.ts's raw `store.save`).
   - Construct + call `keymap.handle(e)` after the undo/redo block, before
     plugin dispatch.
   - Add modifier guards (`if (e.ctrlKey || e.metaKey || e.altKey) return/
     skip`) to the **Backspace, Tab, and Enter** fallback branches.
   - Migrate `EditorInstance.getSelection()` to `getSelectionOffsets`
     (current `start + toString().length` math is already wrong for
     multi-line / `data-raw` selections).
6. **`src/client/main.ts`** — **delete the window-level `Ctrl+S` handler
   (:208–215)**; the keymap binding + `saveNow()` supersede it (it would
   otherwise double-fire with inconsistent semantics and never clear the
   debounce timer). Ctrl+S now requires editor focus — acceptable for v1,
   noted in docs.
7. **`src/core/plugins/shortcuts-help.ts` (new)** — `UIPlugin`, slot
   `wn-overlay`. Owns `Ctrl+/` + `Escape` via a document-level **capture**
   listener that `stopPropagation()`s when it acts (single owner — the
   keymap does NOT bind `Ctrl+/`). Builds
   `<div class="wn-shortcuts" role="dialog" aria-label="Keyboard shortcuts">`
   from `SHORTCUT_BINDINGS`; hidden via inline `style.display` (the
   codebase idiom — `.wn-hidden` does not exist). `onDestroy` detaches.
8. **`src/core/plugins/defaults.ts`** — add `defaultUiPlugins` export.
9. **`src/core/editor.ts`** — register `defaultUiPlugins` in the
   `EditorBuilder` constructor alongside `defaultPlugins`.
10. **`src/core/editor-dom.ts`** — `.wn-shortcuts` chrome CSS goes in the
    **editor-only stylesheet here** (`styles.ts` is reader-shipped via
    `server/render/layout.ts` — putting overlay CSS there leaks chrome to
    anonymous readers). Panel needs `pointer-events: auto` (`.wn-overlay` is
    `pointer-events: none`). Tokens from `--wn-*` (surface, fg, fg-muted,
    border); light + auto-dark.
11. **Tests (co-located `src/core/__tests__/`):**
    - `caret-offset.test.ts` (extend) — **mandatory round-trip property
      test**: on a ≥3-line fixture incl. a fenced region and a wiki-link
      line, `setSelectionOffsets(el, s, e)` → `getSelectionOffsets(el)` ===
      `{s, e}` for both ends at line starts/ends, end inside `data-raw`,
      `(el, kids.length)`, wrapper-anchored ends; clamping; null cases.
    - `editor-text-ops.test.ts`, `editor-format.test.ts` (new) — every op
      incl. doc edges, boundary exclusion, last-line delete, empty doc,
      caret-at-line-start word join, three-class word runs incl. `[[foo]]`
      raw-vs-DOM text divergence, double-marker bold edge, unwrap exactness.
    - `editor-lifecycle.test.ts` (extend) — full pipeline per binding with
      real `KeyboardEvent`s + manually built ranges (existing idiom).
      **happy-dom traps encoded in the test helpers**: `removeAllRanges()`
      before every `addRange` (ignored otherwise); flush the rAF / call
      `checkSelectChange()` deterministically (happy-dom fires
      `selectionchange` **synchronously**, browsers don't); build
      backwards-focus selections with `setBaseAndExtent`; never rely on
      `Selection.modify` (unimplemented — we don't use it). Assert one
      shortcut = exactly one history push, incl. no-op-then-real-op
      sequences, and that `Ctrl+Backspace` no longer single-deletes.
      Word-motion line-activation (cross-line move relies on the
      selectionchange→rAF render path) tested explicitly.
    - `shortcuts-help.test.ts` (new) — toggle/escape/destroy; table content
      sourced from `SHORTCUT_BINDINGS`.
12. **Docs:** `docs/shortcuts.md` (new; generated-by-hand mirror of
    `SHORTCUT_BINDINGS` + platform/browser caveats from step 8 verification),
    `docs/architecture.md` (new modules + keydown order: undo/redo → keymap →
    plugins → guarded fallbacks; overlay owns `Ctrl+/`), `docs/theming.md`
    (`.wn-shortcuts` classes/tokens, editor-chrome location rule revisited).

## Steps

1. **caret-offset direction-biased refactor** + round-trip property tests.
   Everything depends on two-ended mapping; keep all existing
   single-caret tests green unchanged.
2. **Pure text ops** (`editor-text-ops.ts`) + tests.
3. **Pure format ops** (`editor-format.ts`) + tests.
4. **Keymap glue + lifecycle + main.ts wiring** + integration tests.
   Sub-order, verifying earlier behaviors (Tab/Enter/Backspace list
   continuation, undo/redo) after each: line ops → word delete/motion →
   formatting → `Ctrl+S` + `saveNow` extraction + main.ts handler removal +
   `getSelection()` migration.
5. **Help overlay plugin** (`shortcuts-help.ts`, `defaults.ts`, `editor.ts`,
   `editor-dom.ts` CSS) + tests.
6. **Docs** (`shortcuts.md`, `architecture.md`, `theming.md` cross-links).
7. **Full validation:** `npm run typecheck && npm run lint && npm run
   format:check && WN_TEST_PG_URL=… npm run test:coverage && npm run build`.
8. **Binding-reachability probe** (Firefox via the managed browser;
   results recorded before docs finalize): does each of `Ctrl+B`, `Ctrl+K`,
   `Ctrl+Shift+K`, `Ctrl+/`, `Ctrl+S`, `Alt+↑/↓` reach the page with
   `preventDefault` winning? ⚠️ Reviewers flagged that **Chrome reserves
   `Ctrl+B`/`Ctrl+K`** at browser level (page cannot always win) and
   Linux WMs may grab `Alt+↑/↓` — do **not** assume "Chrome unaffected".
   Any combo found dead in ≥1 major browser → report to owner with alias
   options (`Ctrl+Shift+B`-style) and decide together; no silent re-map.

## Design details pinned

- **Selection→lines / restore math:** first line = line of `selStart`; last
  = line of `selEnd` minus the boundary-exclusion rule. After the op, remap
  both ends by the moved block's delta and call `render(true, newStart)`
  then `setSelectionOffsets(el, newStart, newEnd)`.
- **Motion direction source:** focus-end extension uses
  `Selection.isBackwards()`/anchor-vs-focus comparison where available;
  in happy-dom (no native backwards ranges via `addRange`), tests
  construct with `setBaseAndExtent`. If runtime detection ever fails,
  degrade to anchor-fixed extension — recorded decision, not a guess.
- **Delete line-scoped, motion document-scoped** (see table).
- **Undo granularity:** every text-changing shortcut = one `setPageText` =
  one snapshot. No keymap op may mutate DOM + dispatch `input` (that path's
  snapshot count rides on extraction fidelity); commit via `setPageText`
  only. No-op edges (e.g. `Alt+↑` at line 0) hit `setPageText`'s
  equality guard → no empty history entries (pinned by test).
- **No render-path change:** `render(force, cursorOffset)` stays; selection
  restore rides on top. rAF clobber is provably safe (verified):
  `checkSelectChange` early-returns on non-collapsed selections and the
  restore completes in one synchronous task.

## Risks

- ⚠️ **R1 Browser/OS-reserved combos** (`Ctrl+Shift+K` Firefox DevTools,
  `Ctrl+K`/`Ctrl+B` Chrome+Firefox reserves, `Alt+↑/↓` Linux WMs):
  mitigated by step 8 probe *before* docs are finalized; fallback decision
  tree: keep binding + document caveat, or add alias — owner call.
- ⚠️ **R2 happy-dom Selection fidelity** — reduced: reviewers verified
  cross-container ranges, `setBaseAndExtent`, and sync `selectionchange`
  make multi-line selection tests feasible; the four traps are encoded in
  File item 11's helper spec. Synthetic-DOM fallback kept as contingency
  only.
- ⚠️ **R3 Line ops inside/around fenced regions** allowed (VS Code is
  markdown-oblivious too; text stays recoverable, one undo reverts).
  Formatting is consume-and-noop inside `data-block` regions.
- ⚠️ **R4 (was: selection clobber) CLOSED** — rewritten as test guidance:
  flush rAF synchronously in tests; cover motion-triggered line activation.

## Changelog rev 1 → rev 2 (from dual review)

- **P1** Keymap ops now get `scheduleSave` (autosave was silently missing
  for programmatic buffer writes).
- **P1** `main.ts` Ctrl+S handler discovered + planned for removal (was a
  double-save collision; file was absent from rev 1).
- **P1** `Ctrl+/` single owner = overlay plugin (was double-bound →
  double-toggle no-op).
- **P1** Overlay CSS moved `styles.ts` → `editor-dom.ts` (styles.ts ships
  to anonymous readers) + `pointer-events: auto` fix.
- **P1** caret-offset two-ended mapping upgraded from "addition" to
  direction-biased `mapBoundary` refactor with clamping + mandatory
  round-trip tests (start-biased fallbacks were a wrong-text data path).
- **P1** Mac `Alt+←/→` motion aliases added; R1 Chrome premise corrected
  (Ctrl+B/Ctrl+K also reserved there) → probe front-loaded, owner call on
  aliases.
- **P2s** Tab/Enter modifier guards; `getSelection()` migration; `saveNow`
  clears timer; one-push tests; R4 closed; happy-dom traps enumerated;
  `.wn-hidden` → inline `display` idiom; R5 wording contradiction fixed;
  binding table exported as single source; word-class model unified
  (3 classes, line-start `\n` join rule).
