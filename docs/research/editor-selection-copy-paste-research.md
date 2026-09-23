# Editor Research: Selection, Copy & Paste in worldnotes vs. Modern Markdown Editors

**Date:** 2026-09-23 · **Status:** research report — no code changed
**Scope:** Why selection, copy and paste feel janky in the worldnotes inline editor; how Obsidian (CodeMirror 6), TipTap/ProseMirror, Lexical, Outline and the CM6 "live preview" ecosystem solve the same problems; what is worth fixing vs. re-architecting.
**Method:** Full read of the worldnotes editor core; cloned and read upstream sources (ProseMirror model/state/transform/view, prosemirror-markdown, codemirror view/state/lang-markdown, lexical, tiptap, outline); ProseMirror guide; Obsidian developer docs, forums and the open-source CM6 live-preview reimplementations. Code citations below refer to upstream files (`<repo>@main/<path>`); clones lived in `/tmp/editor-research` during this session.

---

## 1. Executive summary

The worldnotes editor keeps the markdown source in a page buffer and renders it as a contenteditable tree of `div[data-line]` containers. The **buffer-side architecture is good** — all keyboard shortcut ops compute on the raw string and commit through one `setPageText`. The jank comes from three systemic gaps relative to every modern editor we studied:

1. **The clipboard is not wired to the model.** There is no `copy`/`cut` handler at all — the browser serializes the *rendered DOM*, which deliberately differs from the source (wiki links show only the label, list bullets show `•` instead of `-`, table pipes are CSS-hidden). Copying markdown therefore produces **wrong markdown**. Every editor we studied intercepts copy/cut and serializes the **document model** instead.
2. **Every render replaces the entire DOM and collapses the selection to a caret.** `renderDocLines()` does `editorDiv.innerHTML = ''` and `render()` always finishes by placing a *collapsed* caret (`setLineOffset`). A multi-line selection cannot survive any re-render, and re-renders fire exactly when selection begins (mousedown on a new line → collapsed `selectionchange` → rAF rebuild → the browser's drag selection is anchored to now-detached nodes → selection breaks or jumps). Obsidian/CM6 avoid this with coordinate-derived mouse selection and incremental DOM diffing; the open-source Obsidian clones explicitly added a "mouse-freeze guard" for this class of bug.
3. **Browser-native text mutation on multi-line selections corrupts the source model.** Native backspace / delete / type-over removes DOM text but not the empty `div[data-line]` containers; `extractContentText()` still counts a `\n` per line container — so deleting a 3-line selection leaves stray newlines, and pasting over a selection inherits the same bug (`range.deleteContents()` first). CM6 has a dedicated detection for exactly this Chrome/Safari behavior ("cross-line insertion… flattens the line after the selection") and rewrites the change as a replace of the *state* selection.

Fixing these three in the current architecture is feasible without touching the single-renderer invariant (all three fixes live in the event layer: `copy`/`cut` from buffer offsets, selection-preserving renders, `beforeinput`-based model edits). A strategic decision is also in scope: worldnotes is re-implementing, on its own, the problem space that CodeMirror 6 exists to solve — worth an explicit adopt-vs-own decision before more investment. The recommended GitHub issue set is in §6.

---

## 2. How the worldnotes editor actually works today

Data flow per keystroke (all paths end in a full rebuild):

```
contenteditable div.wn-editor (children: div[data-line] per source line,
                                div[data-block] wrappers for fences/tables)
   │
   ├─ keydown ──► undo/redo ──► editing keymap (string ops on buffer ✔)
   │                         ──► plugin onKeydown (list Tab/Enter, ✔)
   │                         ──► Tab / Enter / Backspace fallbacks ✘ DOM edit
   ├─ input ───► extractContentText(DOM) → setPageText → render()  (full rebuild)
   ├─ paste ───► preventDefault → insertTextAtSelection(text) → synthetic input
   ├─ selectionchange ─► (collapsed only) rAF → render() on line change
   ├─ copy/cut/drop/composition/beforeinput ─► NOT HANDLED (browser native)
   ▼
render(force, offset): buildDocument → renderDocLines → editorDiv.innerHTML = ''
                       → rebuild every line → setLineOffset(offset)  [collapsed caret]
```

Key files: `src/core/editor-lifecycle.ts` (events), `src/core/editor-render.ts:57` (`render`), `src/core/line-renderer.ts:50` (`innerHTML = ''`), `src/core/caret-offset.ts` (DOM↔raw mapping, direction-biased, `setLineOffset` collapses), `src/core/content-text.ts` (serialization rules), `src/core/plugins/*` (`data-raw` token spans, `wn-punct` spans).

What is already good (keep):

- Raw markdown is the single source of truth; ops compute on strings (`editor-text-ops.ts`, `editor-format.ts`) and commit via one `setPageText` → one undo step.
- `caret-offset.ts` maps DOM selections to raw offsets with explicit end-bias — this is the hard part done, and it's exactly what the clipboard fixes below need.
- Text fidelity rule (punctuation is real text, no `data-raw` on lines) makes `extract()` lossless. (It does **not** make the *clipboard* lossless — see §3.1 — because the browser's copy serializer excludes `display:none`/zero-size content and `data-raw` spans display substituted glyphs.)

## 3. Symptom → root cause catalogue

### 3.1 Copy: the clipboard sees the rendered DOM, not the source

No `copy` or `cut` handler exists anywhere in `src/core` / `src/client` (verified by grep). The browser produces `text/plain` from the *rendered* selection. Each deliberate display substitution is therefore a copy corruption:

| Construct | Source | DOM copy yields | Round-trip? |
|---|---|---|---|
| Wiki link (`wikiLink.ts:38`) | `[[blog/post\|Client Portal]]` | `Client Portal` | ✘ target lost |
| Markdown link (`link.ts:64,84`) | `[label](https://…)` | `label` | ✘ url lost |
| List bullet (`listItem.ts:36`) | `- item` | `• item` | ✘ not re-parsed as a list |
| Table row (`styles.ts:193` pipes `display:none`) | `a \| b \| c` | `a`↵`b`↵`c` (no pipes) | ✘ |
| Table separator (`styles.ts:176` `font-size:0`) | `---\|---` | dashes dropped by many browsers | ✘ |
| Image src (`styles.ts:239` `display:none`) | `![alt](/media/x)` | `![alt]()` | ✘ |
| Bold/italic/strikethrough (`wn-punct` visible) | `**x**`, `~~x~~` | `**x**`, `~~x~~` | ✔ (punct-fidelity pays off here) |
| Code fence body (byte-exact text) | verbatim | verbatim | ✔ |

Consequences: copy-paste inside worldnotes degrades content; copying into Slack/GitHub loses link targets; copying from worldnotes is *not* "what you wrote", which is Obsidian's core promise. Obsidian solves it identically in principle: CM6's `handlers.copy/cut` never touch the DOM — they build `text/plain` from `state.sliceDoc(range.from, range.to)` (`codemirror/view/src/input.ts` `copiedRange`, `handlers.copy`), so copy always returns exact source, even with syntax marks visually hidden. Bonus semantics there: line-wise copy when the selection is empty (VS Code-style), `lastLinewiseCopy` enabling line-wise paste, and multi-range selections joined with the doc's line break. ProseMirror goes further for WYSIWYG: `serializeForClipboard` puts schema-serialized **HTML** in `text/html` *and* model-derived text in `text/plain`, plus a `data-pm-slice` marker so the editor's own paste can restore exact open-node context (`prosemirror-view/src/clipboard.ts`).

Also missing: `text/html` flavor on copy (PM sets it; optional for worldnotes), and Firefox's select-all (whole page) would mix chrome text into copies — CM6's guard "if the DOM selection is outside this editor, don't intercept" is a nice touch to copy.

### 3.2 Cut: same as copy + native DOM delete corrupts the model

Cut has no handler, so after the browser deletes DOM nodes, the `input` event re-extracts from DOM. Single-line cuts mostly survive; multi-line cuts produce the §3.3 class of corruption (see below) *and* the clipboard gets the lossy rendered text of §3.1. CM6 cuts by dispatching a model change (`changes: ranges, userEvent: "delete.cut"`) with the selection text written from state; PM dispatches `tr.deleteSelection()`. Neither ever lets the browser define the document edit.

### 3.3 Multi-line selection: destroyed by re-render, and native edits leak newlines

Several distinct mechanisms, all observed as "selecting multiple lines is janky":

1. **Drag-select across lines starts with a rebuild.** Mousedown places a collapsed caret on the clicked line → `selectionchange` → `checkSelectChange()` (editor-render.ts:107) only re-renders when *collapsed*, i.e. exactly at drag start → `render()` rebuilds every line (`innerHTML = ''`) → the drag's anchor node is detached → browser drag selection dies/jumps; the caret may snap to the old `activeLine` if the offset unmaps (`tryGetLineOffset → null`). `fedoup/markdown-editor` (an Obsidian-style CM6 clone) names this the **"mouse-freeze guard"**: "Clicks don't trigger a decoration rebuild mid-interaction — eliminates a class of cursor-drift bugs". CM6's answer is stronger: it implements its own mouse selection (`view/src/input.ts` `MouseSelection`): every `mousemove` re-derives the selection from **coordinates** (`posAtCoords`) and dispatches a state selection, so DOM churn cannot orphan it; it even auto-scrolls while dragging near the viewport edge.
2. **Any re-render collapses a live selection.** `render()` ends in `setLineOffset(offset)` (collapsed) — including renders triggered by saves, plugin updates, undo, navigation. `setSelectionOffsets(el, start, end)` exists in `caret-offset.ts` but the render path never uses it. The keymap path restores selections after its ops; everything else loses them. Frameworks treat "selection is state" the same as "document is state": CM6 keeps `SelectionRange` (anchor/head, per-range goal column and association bias) in the *state* and maps it through every change (`state/src/selection.ts` `map(change)`) — selection survives document edits by construction.
3. **Native mutation of a multi-line selection corrupts the source.** Backspace-on-selection does `range.deleteContents()` + synthetic input (editor-lifecycle.ts:231) — deletes text, keeps empty line divs → extraction re-adds `\n` between them → deleted lines come back as blank lines. Type-over-selection (just start typing with a 2+ line selection) lets the browser do its own thing; Chrome/Safari flatten adjacent-line text in ways CM6 explicitly works around (`view/src/domchange.ts`: "For a cross-line insertion, Chrome and Safari will crudely take the text of the line after the selection… replaces the change with a selection replace"), plus a `typeOver` fast path in `DOMChange`. ProseMirror avoids the whole category by owning the selection as state and re-parsing DOM changes through a schema (`input.ts` `readDOMChange`).

Also note: `getSelectionOffsets` returns `null` when the range reaches outside the editor — after a Firefox select-all (whole page), keymap ops silently no-op; Enter/Tab fallbacks insert at the browser caret, so behavior diverges from the model.

### 3.4 Paste: narrow, unrepaired, and vulnerable at token boundaries

Current handler (editor-lifecycle.ts:138): `preventDefault()`, take `text/plain`, `insertTextAtSelection()`. Issues:

- **No line-ending normalization.** A Windows clipboard delivers `\r\n`; the `\r`s go straight into the buffer and are stored/saved. CM6 splits pasted text on `/\r\n?|\n/` into its `Text` line doc (state text normalization); PM's plain-text path `text.replace(/\r\n?/g, "\n")` (`prosemirror-view/src/clipboard.ts:51`) — every serious editor normalizes at the boundary.
- **Paste-over-selection inherits §3.3:** `insertTextAtSelection` begins with `range.deleteContents()` — same stray-newline bug when the selection spans lines.
- **Paste inside a `data-raw` span silently vanishes.** `insertTextAtSelection` inserts a text node wherever the caret is — including *inside* a wiki-link span's subtree (reachable via the caret clamp in `placePosition`, or after a keymap restore); the `data-raw` branch in `extractContentText` swallows the subtree → content lost. CM6 avoids DOM-position insertion entirely: paste is a model change (`replaceSelection`) + re-render from state.
- **Single flavor only.** `text/plain` or nothing. The Obsidian/Outline/PM lesson: look at *all* flavors — `text/html` (→ convert to markdown), `text/uri-list` (both CM6 `handlers.paste` and PM `getText` fall back to uri-list — pasting a file URL from a file manager currently drops text), images (worldnotes already has a media pipeline; pasted images are ignored — Obsidian saves them as attachments).
- **No Shift+paste-as-plain semantics** needed today, but worth defining when html-paste lands: Obsidian converts HTML→markdown on normal paste and reserves Ctrl+Shift+V for raw text (config `autoConvertHtml`, forum request that led to the toggle); Outline's `PasteHandler` sniffs plain text with an `isMarkdown()` heuristic and, when markdown-looking, parses it as a slice rather than inserting literal text; TipTap/PM expose `transformPastedHTML`/`transformPasted`/`clipboardTextParser` hooks for the same layering.
- **Broken-clipboard-API fallback missing.** Safari/WebKit ≤ 604 and iOS report a clipboard API that lies; both CM6 and PM fall back to a hidden contenteditable/textarea capture (`capturePaste`, `brokenClipboardAPI`). Without it, paste can be inconsistent on Safari.
- **During IME composition PM refuses to synthesize paste at all** (`editHandlers.paste`: "Handling paste from JavaScript during composition is very poorly handled by browsers… let the browser do its native thing there") — a pattern to remember if paste is ever moved to model edits (§5 fixes must re-test CJK).

### 3.5 Adjacent gaps that show up as clipboard-adjacent jank

- **No IME/composition handling.** Full `innerHTML` rebuild on every `input` (input fires per composition update) aborts CJK/accents input mid-word. CM6 tracks composition state (`composing`, `compositionFirstChange`, pending-change flags) and defers/merges; Lexical's reconciler updates changed nodes only; PM has explicit composition handling with `markCompositionEnd` and re-parse guards. For a wiki this may be out of scope — but it's a real, reported-somewhere-someday bug class.
- **No internal drag-and-drop handling.** Dragging text inside the editor performs a raw DOM node move; extraction then depends on surviving `data-line` containers. CM6 serializes `dragstart` from state and handles `drop` as a model change with `dropcursor`; PM does the same through the clipboard machinery (drop = paste).
- **No `scrollIntoView` after programmatic renders.** CM6/PM pass `scrollIntoView: true` on paste/type/cut transactions; worldnotes places the caret without scrolling — alt+↓ moving a line off-screen leaves the viewport behind.
- **Undo/redo is state-side (good) but browser-native undo still exists** (Edit menu, macOS swipe): the DOM has history the buffer doesn't. PM/CM6 neutralize native undo by always re-deriving state from DOM changes or owning the DOM; worth one defensive test ("Edit → Undo with no keydown").

## 4. How the modern editors handle this (what we actually read)

### 4.1 CodeMirror 6 — the engine under Obsidian (source-of-truth text + decorations)

Obsidian's editor is CM6 with a live-preview decoration layer: the **document is always the exact markdown source** ("Without decorations, the document would render as plain text" — Obsidian developer docs, *Decorations*; formatting marks on inactive lines are hidden by replace decorations, never removed from the doc). Consequences that map 1:1 to worldnotes' bugs:

- Copy/cut read the **state**, never the DOM (`copiedRange` → `state.sliceDoc`); line-wise copy+paste; `clipboardInputFilter`/`clipboardOutputFilter` facets let apps (Obsidian's paste-transform plugins, `obsidian-smarter-paste` etc.) convert HTML→markdown before insertion.
- Selection is per-range state with anchor/head/assoc/goal-column, mapped through every change (`SelectionRange.map`, `EditorSelection`), so vertical caret position survives edits — the browser's hidden "caret column" memory is *also* preserved because CM6 only touches DOM where content changed.
- DOM updates are incremental diffs between viewState and current DOM (`docview.ts`, viewport-aware); the view keeps DOM outside the changed range stable, so drag selection and IME aren't destroyed by decoration churn.
- `MouseSelection`: mouse drag selection is implemented by CM6 itself from **coordinates** — immune to DOM churn (see §3.3.1).
- `DOMChange` + `findDiff`: where the browser *did* mutate the DOM (type-over, Android enter, autocorrect double-period…), CM6 detects the diff against the expected slice and rewrites it into a sane model change, including a dedicated cross-line typeOver branch and iOS/Android key emulation.
- Paste: text-only by design (`text/plain` → uri-list fallback), normalized, `input.paste` user-event tagged; multi-caret paste distributes lines one-per-cursor (`changeByRange` in `doPaste`).
- Lexical (Meta) and the old Draft.js pain points confirm the same conclusion from a different stack: a reconciler that patches only changed nodes, plus explicit `COPY_COMMAND`/`PASTE_COMMAND` handling that serializes the *editor state* (`$getHtmlContent` / `$generateJSONFromSelectedNodes` / `$insertDataTransferForRichText` in `lexical-clipboard`).

### 4.2 ProseMirror / TipTap — schema document + slice-based clipboard

PM's model is a structured document (not text), but its clipboard design is the most fully worked-out and transfers directly as *principles*:

- **Copy** = `serializeForClipboard(view, selection.content())`: schema `DOMSerializer` → `text/html`, `clipboardTextSerializer` → `text/plain`, plus a `data-pm-slice="openStart openEnd ctx"` attribute so its *own* paste restores the exact slice context (`parseFromClipboard` reads it back and re-wraps with `addContext`). TipTap ships a `ClipboardTextSerializer` extension (custom `blockSeparator`, per-range text serializers via `getTextBetween`), i.e. plain-text flavor is first-class, not "whatever Chrome extracts".
- **Paste** = `parseFromClipboard`: html → schema `DOMParser.parseSlice` with context (`$context`, `preserveWhitespace`), plain text (or Shift+V) → split on `/\r\n?/|\n+/` into paragraphs; `normalizeSiblings` + `Slice.maxOpen` make foreign fragments fit the current node; `handlePaste` prop lets apps replace the whole policy (Outline does); `transformPastedHTML`/`transformPastedText`/`transformPasted` hook chain lets each extension clean on the way in (Outline uses it for Dropbox-HTML fixes; Obsidian plugins like Smart Paste / Paste Reformatter are this idea as userland).
- PM's guide makes the DOM-respect policy explicit and is the best articulation of what worldnotes violates: *"Many events are let through as they are, and only then reinterpreted… The browser is quite good at cursor and selection placement… which is a really difficult problem when you factor in bidirectional text."* and *"the DOM selection is only updated when it is actually out of sync… to avoid disrupting the various pieces of 'hidden' state that browsers keep along with the selection."*
- Table copy is handled as a first-class case (CellSelection serializes per-cell), the analogue of worldnotes' broken table-row copy.

### 4.3 Outline — the closest product analog (markdown wiki, reader + one editor)

Outline's editor is ProseMirror + markdown storage; its `PasteHandler` extension shows the pragmatic layering a wiki wants: sniffs `text/html` (iframe embeds, YouTube, internal doc links → mentions), falls back to plain text; `isMarkdown()` heuristic + `normalizePastedMarkdown` before parsing; Shift = paste as plain text. It is evidence that "paste markdown text → become structured content" (rather than literal insertion) is the direction user expectations run in — optional for worldnotes, but the sniff/normalize ordering is the pattern.

### 4.4 Obsidian-specific behaviors worth naming in issues

- Copy is **byte-for-byte the source** even for hidden marks and rendered previews (CM6 model copy) — the atomic-editor clone documents it as a test: "copy / save / round-trip through any other markdown tool are byte-for-byte identical to a plain textarea" (`kenforthewin/atomic-editor` README).
- Live preview activation is per-**line under the cursor**; the cursor's line expands to raw syntax, everything else renders — *worldnotes already has this exact model* (`activeLines` in editor-render).
- Paste HTML→markdown conversion is a **core setting** (`autoConvertHtml`), bypassable with Ctrl+Shift+V (forum history: shipped in v0.10.1, made toggleable in 0.10.3 after pushback — lesson: make conversions toggleable, keep raw paste on a modifier).

## 5. What is worth fixing — ranked, with approach

The buffer-centric architecture is sound and already has the hardest primitive (direction-biased DOM↔raw offset mapping). Fixes 1–4 below change only the event layer; they do not touch the renderers, `content-text.ts`, or the single-renderer invariant.

| # | Fix | Effort | Impact | Reference pattern |
|---|-----|--------|--------|-------------------|
| 1 | **`copy`/`cut` from the model.** Handler reads `getSelectionOffsets()` → takes `bufferText.slice(start,end)` → `clipboardData.setData('text/plain', …)` (+ `preventDefault`). Cut additionally: single `setPageText` edit + render + save (one undo step), mirroring the keymap commit path. Guard: if selection un-mappable or outside the editor, let the browser handle. | S | **copy correctness (fixes §3.1 + cut)** | CM6 `copiedRange`; PM `serializeForClipboard` (text flavor) |
| 2 | **Selection-preserving render.** `render()` should restore `{start,end}` (via existing `setSelectionOffsets`) when the pre-render selection was non-collapsed, and freeze line-activation churn while a pointer-drag is in progress (suppress `checkSelectChange` rebuilds between mousedown and mouseup; do one deferred render on mouseup that preserves the selection). | M | **kills the multi-line selection jank (§3.3)** | CM6 state-mapped selection + mouse-freeze guard |
| 3 | **`beforeinput` for selection edits.** `deleteContentBackward`/`deleteContentForward` and `insertText` with a **non-collapsed, multi-line** selection: `preventDefault()`, compute the string edit on the buffer (the pure-op machinery already exists), render + restore caret. Collapsed and single-line edits keep the native fast path (don't break IME/spellcheck per PM's guide). | M | **fixes type-over/backspace corruption (§3.3.3, §3.4)** | CM6 DOMChange typeOver branch; PM readDOMChange |
| 4 | **Harden paste.** Normalize `\r\n?`→`\n` before insertion; on non-collapsed selection apply the model delete (§3) then insert at raw offset in the buffer rather than `insertTextAtSelection`; fall back to `text/uri-list`; no-op cleanly when `text/plain` empty. (Optional follow-up: HTML→markdown conversion behind a toggle + Shift+V escape, Obsidian-style.) | S–M | **paste correctness (§3.4)** | CM6 `doPaste`/filters; PM `parseFromClipboard` text path; Obsidian `autoConvertHtml` |
| 5 | **`scrollIntoView` after programmatic renders** (caret row outside viewport → scroll). | XS | polish | CM6 `scrollIntoView: true` on user events |
| 6 | **Select-all scoping + unmappable-selection consistency.** Intercept Ctrl/Cmd+A (select buffer range `0..len` via `setSelectionOffsets`); make the plain-key fallbacks (§3.3's insertTextAtSelection paths) refuse when the selection is outside the editor. | S | polish; enables copy/cut correctness in FF | CM6 selectAll keymap |
| 7 | **Line-wise copy semantics** (empty-selection copy = whole line; matching paste inserts line-above). | S | nice-to-have; familiar from VS Code/Obsidian | CM6 `lastLinewiseCopy` |
| 8 | **Internal drag-and-drop** → model change from text, not raw DOM move. | M | polish; prevents §3.5 corruption | CM6 dropcursor + `dragstart` from state |
| 9 | **IME composition guard** — at minimum, suspend full rebuild while `compositionstart`…`compositionend` (defer to end; CM6's `composing` counter). | M | needed for CJK/maccent users | CM6 composition handling; PM composition defers |
| 10 | **Native-undo safety net** — intercept the `beforeinput` `historyUndo`/`historyRedo` input types (Chrome fires them for Edit→Undo/trackpad) into the buffer stack. | XS | prevents divergence | PM/CM6 both handle via beforeinput |

Not recommended for this codebase right now: adopting ProseMirror/TipTap wholesale (its win is a *structured document* model; worldnotes deliberately chose markdown source as the truth — PM would make save-path fidelity, the block-pass grammar and the single-renderer parity tests all fight the framework), and `display:contents`-style CSS tricks for copy (fragile across browsers; model-serializing is the robust route everyone converged on).

**The strategic flag (GH-4, §6):** every fix above is "become a small CodeMirror". The Obsidian-style CM6 core (source doc + decoration live-preview, incl. `@codemirror/lang-markdown` + the documented hide-marks pattern) would provide items 1–10 out of the box, and the reader surface (static renderer) would be untouched — but it *would* end the "editor DOM is rendered by the same engine" invariant (editor DOM would be CM6's, decorated with the same plugin token info via `BlockDef`/token patterns — a re-interpretation of "single renderer" as "single tokenizer/grammar", not "single DOM builder"). That's an architecture decision for the maintainers, not a bug fix; the research report's job is to name it, not make it.

## 6. Proposed GitHub issues — four, consolidated (was ten) — **filed as #2–#5**

The ten symptom-shaped drafts consolidate by *fix site*: items landing in the same event handler, sharing one repro script, or needing one PR should be one issue. Every technical detail from the original ten is preserved in the bodies (§7). All four carry a shared `editor-ux` label. **Filed as #2–#5.**

| Issue | Labels | Title | Folds §5 fixes | Depends on |
|---|---|---|---|---|
| **GH-1** → [#2](https://github.com/AlexMason/worldnotes/issues/2) | `bug` `editor-ux` | Clipboard payloads are the rendered DOM, not the source markdown | 1, 4, 7 | none — *shares* the `commitModelEdit` helper with GH-2 (whichever lands first extracts it from `runTextOp`) |
| **GH-2** → [#3](https://github.com/AlexMason/worldnotes/issues/3) | `bug` `editor-ux` | Multi-line selection is destroyed by renders and corrupted by native edits | 2, 3, 5, 6 | none — foundational |
| **GH-3** → [#4](https://github.com/AlexMason/worldnotes/issues/4) | `bug` `editor-ux` | Browser-boundary gaps: IME composition, internal drag-drop, native undo, old-Safari clipboard | 8, 9, 10 | soft: drop-insert reuses GH-1's paste helper; IME guard coordinates with GH-2's render changes |
| **GH-4** → [#5](https://github.com/AlexMason/worldnotes/issues/5) | `discussion` `editor-ux` | Evaluate CodeMirror 6 as the editor core (Obsidian model) | — | independent; **its outcome gates whether GH-3 (and any future editor-adjacent work) is ever done** |

### Dependency & prioritization notes (for whoever picks these up)

- **No hard blockers.** GH-1 and GH-2 are each independently startable and shippable. They overlap in exactly two places, listed here so PRs don't collide:
  1. Both edit the event layer of `src/core/editor-lifecycle.ts` — **serialize the merges** (GH-2 first is recommended, see below).
  2. Both want a "commit a raw-string edit + render + restore selection, one undo step" helper. It already exists in keymap-internal form (`runTextOp`, `editor-keymap.ts:84`); whoever lands first extracts it to shared module scope, second one reuses.
- **Recommended order: GH-2 → GH-1 → GH-3.** Rationale: GH-2 lays the beforeinput/model-commit rails that GH-1's paste-over-selection and GH-3's drop-insert both ride; and "my selection vanished" is the most infuriating symptom to users, so its fixes (selection-preserving render, mouse-freeze guard) unblock the feel of everything else. GH-1's copy/cut half is *fully independent* of GH-2 and could even ship immediately after — if only one fix ever ships, make it copy/cut-from-model (content currently corrupts silently).
- **GH-3 is deliberately an umbrella** of four independently-tackled checklist items (IME guard; internal drag-drop; native-undo interception; Safari `capturePaste` fallback) — each can be its own PR referencing the umbrella; none is urgent for latin-script desktop users. Low priority unless CJK/emoji editing or mobile reports materialize.
- **GH-4 is a decision, not backlog.** If it resolves to "adopt CM6", GH-1/GH-2 remain worth doing (they're the bridge fixes users need *now* and are small), while GH-3 is superseded by CM6's built-ins and should be closed. File GH-4 first (it needs no code), then start GH-2 in parallel.

---

## 7. Issue bodies (as filed — #2, #3, #4, #5)

### GH-1 (#2) — Clipboard payloads are the rendered DOM, not the source markdown

**Symptoms.** (a) Copy: select `[[blog/post|Client Portal]]` (on a line the cursor is *not* on) and Ctrl+C — the clipboard gets `Client Portal` (target lost). Bullets copy as `• item` instead of `- item`; `[label](https://…)` copies the label only; table rows copy without pipes and one cell per line (`.wn-table-row .wn-punct{display:none}` — invisible text is excluded from copy serialization); pasted back, none of these are the markdown they came from. (b) Paste: Windows clipboards inject literal `\r` into the buffer; pasting while the caret sits inside a `data-raw` token span silently loses the pasted text (the `data-raw` branch in `extractContentText` swallows the subtree); pasting a file URL inserts raw `file:///…`; paste over a multi-line selection inherits GH-2's stray-newline corruption.

**Root cause.** No `copy`/`cut` handlers exist at all — the browser serializes the *visible DOM*, which deliberately differs from the source. Paste (`editor-lifecycle.ts:138`) does `insertTextAtSelection(text)` — DOM surgery that bypasses the buffer. Contrast Obsidian/CodeMirror 6, whose copy handler reads `state.sliceDoc(range.from, range.to)` (`view/src/input.ts` `copiedRange`) — copy is always byte-exact source even with marks visually hidden — and ProseMirror's model-derived `clipboardTextSerializer` (TipTap ships one with `blockSeparator` options).

**Scope.**
- `copy`/`cut` handlers: `getSelectionOffsets(editorDiv)` → slice the page buffer → `clipboardData.setData('text/plain', …)` + `preventDefault()`. Cut = same text, then a model commit (one `setPageText` + render + autosave = one undo step), skipping when the selection is un-mappable or outside the editor (let the browser handle; that's CM6's guard too).
- Paste handler: read `text/plain`, else `text/uri-list` (newline-joined), else ignore; normalize `\r\n?`→`\n`; apply as a model commit at the selection's raw offsets (delete-range + insert) instead of DOM insertion.
- Line-wise semantics (VS Code / CM6): empty-selection copy copies the whole line and remembers `lastLinewiseCopy`; matching paste inserts lines at the caret's line start.
- *Optional checkbox, out of first PR:* `text/html` flavor on copy produced by the static renderer; HTML→markdown paste conversion behind a setting with Shift+V raw bypass (Obsidian's `autoConvertHtml` + Ctrl+Shift+V precedent; Outline's `isMarkdown()` sniff + `normalizePastedMarkdown` pattern).

**Acceptance.** Copy of every token type (wiki link, md link, list item, table row/separator, image, strikethrough, dimmed punctuation) yields exact source bytes; worldnotes→worldnotes round-trip is lossless; cut = copy + model delete + one undo step; CRLF paste yields LF-only source; paste inside/around `data-raw` spans never loses content; empty-selection copy→paste duplicates a line. Extend `editor-lifecycle.test.ts`'s paste suite (currently only asserts preventDefault + plain insert).

### GH-2 (#3) — Multi-line selection is destroyed by renders and corrupted by native edits

**Symptoms.** (a) Click-drag across lines breaks or snaps to one line; shift-click on a far line races the rAF rebuild. (b) Any re-render (line activation, save flush, plugin update, undo, keymap restore) collapses an existing range selection to a caret. (c) Backspace/Delete or type-over with a multi-line selection leaves stray blank lines — the deleted text returns as newlines because the browser removed *text* but not the `div[data-line]` containers, and `extractContentText` counts a `\n` per surviving line div. (d) After any programmatic caret placement the caret can be off-screen; (e) Firefox select-all spans page chrome, making keymap ops consume-and-noop while native fallbacks still mutate DOM. (f) Vertical caret goal-column is lost on ragged lines (up/down jumps to line start/end) because each rebuild resets the browser's hidden selection state.

**Root cause.** `render()` always ends in a collapsed `setLineOffset` (`editor-render.ts`; `line-renderer.ts:50` is `editorDiv.innerHTML = ''`) — selection is treated as ephemeral DOM state, not model state. `setSelectionOffsets(el, start, end)` and `getSelectionFocusEnd` already exist in `caret-offset.ts` but no render path uses them. At drag *start* the collapsed `selectionchange` → `checkSelectChange` (`editor-render.ts:107`, collapsed-only) rebuilds the DOM out from under the browser's in-progress drag selection. ProseMirror's guide is the canonical statement of both rules violated here: keep DOM selection untouched when in sync (browsers hold hidden goal-column state), and let the model, not the DOM, define edits. CM6 goes further and implements mouse selection from **coordinates** (`view/src/input.ts` `MouseSelection`: re-derive on every mousemove via `posAtCoords` + edge auto-scroll) so DOM churn cannot orphan it; the open-source Obsidian clones added an explicit "mouse-freeze guard" (no decoration rebuilds mid-interaction — `kenforthewin/atomic-editor`, `fedoup/markdown-editor` READMEs) to kill exactly this bug class. CM6's `domchange.ts` carries a dedicated branch for Chrome/Safari's crude cross-line type-over ("take the text of the line after the selection… flattens any widgets") — evidence this native behavior is untrustworthy everywhere.

**Scope.**
- Selection-preserving render: capture `{start, end, focusEnd}` when the pre-render selection is non-collapsed; restore via `setSelectionOffsets` (rebuild it forward-oriented with the focus end) instead of collapsing. Keep current collapsed-caret bias behavior for empty selections.
- Mouse-freeze guard: track pointer-drag (mousedown…mouseup); suppress line-activation re-renders until mouseup, then one deferred render that restores the range.
- `beforeinput` model commits for non-collapsed **multi-line** selections on `insertText` (type-over), `deleteContentBackward`, `deleteContentForward`: `preventDefault()`, compute on the buffer (the pure-op machinery exists — `editor-text-ops.ts`), commit via the shared `commitModelEdit` helper (extracted from `runTextOp`). Single-line and collapsed edits stay on the native fast path (don't break IME/spellcheck — PM's guide rule).
- Riders: intercept Ctrl/Cmd+A to `setSelectionOffsets(0, len)`; plain-key fallbacks (Tab/Enter/Backspace at `editor-lifecycle.ts`) bail or route through the helper when `getSelectionOffsets` is null; `scrollIntoView` for the caret line after forced renders.

**Acceptance.** Click-drag, shift-click, shift+arrow, Home/End multi-line selections behave like a textarea on Chromium/Firefox/WebKit; selection survives saves, plugin updates, and undo; deleting or typing over an N-line selection removes/replaces exactly those source lines with one undo step; caret scrolls into view after programmatic ops; Ctrl+A selects only the document body; up/down across ragged lines keeps the column (goal-column test).

### GH-3 (#4) — Browser-boundary gaps: IME composition, internal drag-drop, native undo, old-Safari clipboard

An umbrella for browser interactions the pipeline doesn't model yet. Each item is independently fixable; use checkboxes, one PR each. Low priority for latin-script desktop users — promote if mobile/CJK reports arrive.

- [ ] **IME composition.** Full `innerHTML` rebuild on every `input` aborts composition (CJK, accents, some Android keyboards — input fires per composition update). Minimal fix: `composing` counter set at `compositionstart`/`compositionend`; suspend line-activation renders until it hits zero (defer one render to compositionend). References: CM6 composition machinery (`composing`, `compositionFirstChange`, pending updates); PM's paste-during-composition deferral (`prosemirror-view/src/input.ts` `editHandlers.paste`). Coordinates with GH-2's render changes.
- [ ] **Internal drag-and-drop.** Dragging text inside the editor performs a raw DOM node move; extraction then depends on surviving `data-line` containers (arbitrary results). Handle `dragstart` (serialize from the buffer via GH-1's helper) and `drop` (model insert at the drop point — `posAtCoords` equivalent); external HTML drops take the plain-text path. Reference: CM6 drop/dragstart + `dropcursor`.
- [ ] **Native-undo interception.** The buffer stack owns undo, but Edit-menu Undo / macOS trackpad gestures bypass keydown and mutate the DOM directly. Intercept `beforeinput` inputType `historyUndo`/`historyRedo` into the buffer undo/redo. (Chrome also fires synthetic key events for some paths — test matrix.)
- [ ] **Old-Safari/iOS clipboard fallback.** WebKit ≤ 604 and iOS lie about the clipboard API; CM6 and PM both fall back to `capturePaste` via a hidden textarea/contenteditable. Rare today; adopt the technique in GH-1's handlers if reported.
- [ ] (Deferred, mobile) Android keyboards' composing-always-on behavior — CM6 synthesizes Enter/Backspace from DOM diffs (`applyDOMChange` android branch); document as known limitation until mobile editing is a goal.

### GH-4 (#5) — Evaluate CodeMirror 6 as the editor core (Obsidian model)

**Question.** Every fix in GH-1–GH-3 already exists, battle-tested, inside CodeMirror 6 — model-driven clipboard (copy is `sliceDoc`, so Obsidian's copy is byte-exact source even with marks hidden), state selections with anchor/head/assoc/goal-column mapped through every change, coordinate-derived mouse selection immune to DOM churn, incremental viewport-aware DOM updates that don't disturb native selection or composition, IME machinery, drop handling, line-wise copy/paste, `clipboardInput/OutputFilter` hooks, and multi-caret editing for free. Obsidian pairs that core with a live-preview decoration layer: the document is always the exact markdown source; inactive-line formatting marks are hidden by replace decorations — the same per-line activation UX worldnotes already ships (`activeLines` in `editor-render.ts`), and the pattern the open-source clones (`kenforthewin/atomic-editor`, `fedoup/markdown-editor`, canonical hide-markdown-syntax thread) reimplement.

**The decision to record:** what does *single renderer* mean —
1. *"Same DOM-builder for editor and reader"* → the engine invariant stands; we own every fix in GH-1–GH-3 forever (plus multi-caret, mobile, bidi, accessibility, and the next browser bug nobody has found yet); or
2. *"Same grammar for editor and reader"* → editor DOM becomes CM6-rendered but decorated from the **same** tokenizer + `BlockDef` plugin grammar; the reader's static renderer is untouched; `surface-parity.test.ts` re-keys from tree-shape equality to grammar-level assertions (tokenizer decisions drive both surfaces; plugin `render()`s port to decoration sets; `content-text.ts` shrinks to the parity harness).

**Cost sketch for a spike.** Replace `src/core/editor-*` event/render plumbing with a CM6 `EditorView` (source doc = `PageBuffers` string — the buffer-centric model already matches CM6's `Text`); port plugins' `render()` to a `ViewPlugin` decoration set; keep keymap semantics (`@codemirror/commands` supplies most; Alt+↑/↓, Ctrl+Shift+K/D map to built-ins); bundle-size delta (~CM6 core); save/If-Match flow unchanged. Deliverable: a `feature/cm6-spike` branch editing one page with live-preview hiding on the existing tokenizer, plus a known-issues list.

**Interim guidance.** GH-1 + GH-2 are bridge fixes worth doing regardless (users are silently corrupting content *now*; neither is wasted if CM6 wins). GH-3 is the long-tail cost of *not* switching — do not invest in items 1/3/4 beyond the GH-2 rails until this discussion resolves. If GH-4 resolves to "switch", close GH-3 and re-scope remaining editor work against CM6 extensions instead.

---

## 8. Source map (what was read/clone for this report)

| System | Read | Key files / docs |
|---|---|---|
| worldnotes | full editor core | `editor-lifecycle.ts`, `editor-render.ts`, `editor-dom.ts`, `line-renderer.ts`, `renderer.ts`, `content-text.ts`, `caret-offset.ts`, `editor-keymap.ts`, `editor-text-ops.ts`, `document.ts`, plugins (`wikiLink`, `listItem`, `link`, `image`, `strikethrough`, `table`), `styles.ts`, docs/architecture.md |
| ProseMirror | cloned `prosemirror-model/state/transform/view` | `prosemirror-view/src/clipboard.ts` (serializeForClipboard/parseFromClipboard/data-pm-slice/normalizeSiblings/nbsp restore), `src/input.ts` (copy/cut/paste handlers, capturePaste fallbacks, composition deferral, dragstart), ProseMirror Guide (state/transactions/decorations/DOM-respect policy) |
| TipTap | cloned | `packages/core/src/extensions/clipboardTextSerializer.ts`, `paste.ts`, `ExtensionManager.transformPastedHTML` |
| CodeMirror 6 | cloned `view/state/lang-markdown/commands` | `view/src/input.ts` (copiedRange, handlers.copy/cut, doPaste + filters, MouseSelection, drop/dragstart, brokenClipboardAPI), `view/src/domchange.ts` (DOMChange, typeOver cross-line rewrite, findDiff, composition counters), `state/src/selection.ts` (SelectionRange flags/map), `state/src/text.ts` (line doc) |
| Lexical | cloned | `packages/lexical-clipboard/src/clipboard.ts` ($getHtmlContent, $insertDataTransferForRichText, copyToClipboard) |
| Outline | cloned | `app/editor/extensions/PasteHandler.tsx` (isMarkdown sniff, normalizePastedMarkdown, transformPastedHTML, Shift=plain) |
| Obsidian | closed source — docs/forum/community clones | Obsidian developer docs (Editor extensions, Decorations); forum history of `autoConvertHtml` (v0.10.1→0.10.3) and Ctrl+Shift+V; `kenforthewin/atomic-editor` README (copy-as-source tests, mouse-freeze guard, narrow invalidation); `fedoup/markdown-editor` README (per-line activation, hide-marks pattern, state preservation) |

**Repos cloned during this session:** `ProseMirror/prosemirror-{model,view,state,transform,markdown}`, `codemirror/{view,state,lang-markdown,commands}`, `ueberdosis/tiptap`, `lexical`, `outline`, all under `/tmp/editor-research` (not committed). No worldnotes files were modified — per the task, this is a pure research output.
