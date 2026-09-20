# Plan: Reader Feature Restore — lists, images, tables, code blocks (rev. 2)

- **Date:** 2026-09-19 (UTC) · rev. 2 after dual subagent adversarial review
- **Branch:** `refactor/single-renderer` (continues on this branch, per user)
- **Prior context:** `.pi/docs/plans/single-renderer.done.md`, handover `2026-09-19-225202`
- **Request:** Restore reader functionality degraded by the single-renderer pivot.

## Goal

Restore four grammar capabilities through the ONE render engine so both the
editor and the anonymous reader gain them simultaneously:

1. **Lists** — ordered markers as typed (`1.`, `a.`, `A.`, `i.`, `I.`, `II.`, …),
   unordered markers (`-`, `*`, `+`) displayed as bullet •.
2. **Images** — `![alt](src)` rendered as real `<img>` (resolution-based URL
   safety).
3. **Tables** — pipe tables with header/separator/rows and `:---:` alignment.
4. **Fenced code blocks** — ``` … ``` verbatim (no inline parsing inside;
   unclosed fence runs to EOF, GFM-style).

## Binding decisions (user interview)

| # | Decision | Value |
|---|----------|-------|
| D1 | Ordered lists | **Markers as typed** — no auto-renumbering; continuation (Enter) repeats the typed marker. |
| D2 | Unordered bullets | **• replaces marker visually** — source keeps `-`/`*`/`+`; fidelity via the existing wrapper `data-raw`. |
| D3 | Multi-line blocks | **Cursor inside any line → whole block renders raw; cursor outside → styled block.** Generalizes `activeLines` to block regions. |
| D4 | Scope | All four, this branch, full quality (image policy + CSS, alignment, docs, fixtures, parity). |

## Rev. 1 → Rev. 2 changelog (from dual subagent review — both verdicts BLOCK)

- **B1 (both):** rev. 1 was self-contradictory (verbatim regions vs
  inline-parsed cells) and proposed per-plugin `renderBlock`/`renderBlockToHTML`
  structural hooks — duplicated structural logic and re-opened parity drift.
  → **Declarative block model**: plugins declare `BlockDef { match, … }`;
  `buildDocument` tokenizes region lines itself (per-line modes from region
  state); BOTH renderers keep sole ownership of `data-line`/`<br>` emission.
  Cell rendering is a *normal* token (`table-row`), zero new structural hooks.
- **B2/M9 (both):** block pass runs before line-level defs → rev. 1's
  separator regex matched `- |---|` and even bare `---` (would eat the hr
  grammar and list lines). → **Start-line eligibility rule**: a region can
  only begin on a line that matches NO registered `^`-anchored def
  (`helpers.isPlainLine`), separators require ≥1 literal `|`, per-cell
  `^:?-{1,}:?$` (GFM 1+ dashes), header/separator column counts must match.
  Precedence restated correctly: **earliest startLine wins; ties by
  registration order** (codeBlock registered before table).
- **B3 (correctness):** rev. 1 image policy (`//` prefix test) is bypassable:
  `\evil.com\x.png` → WHATWG treats `\` as `/` for img src → origin escape
  (proved via `new URL('\\evil.com\\x.png','http://wn.invalid/')`). →
  **`isSafeImageUrl` is resolution-based**: reject `\`, parse
  `new URL(v, 'http://wn.invalid')`, require origin === base (relative) or
  protocol ∈ {http:, https:} (absolute). Fixture: `![a](\evil.com\x.png)`
  must not emit `<img`.
- **B4 (correctness):** escaping contract now explicit per field (below).
- **B5/m4 (both):** line-level `onKeydown` handlers are grammar-blind and
  assume `lineDiv.parentElement === editorDiv` (`listItem.ts:100,131,166`) —
  nesting + widened list markers made Enter/Tab **corrupt fenced code**
  (`1. install …` inside a fence). → region lines carry `data-block="<type>"`
  (both surfaces, parity-safe); `listItem` keydown handlers bail on
  `lineEl.dataset.block`; `node.parentElement` replaced by a walk to the
  `[contenteditable]` root.
- **M3/m3 (correctness):** "mirror extractContentText" was a drift trap —
  two independent raw-length models. → extract shared
  **`src/core/content-text.ts`** (`extractContentText` + `rawNodeLength`,
  nesting-aware with the `Σ inner + (n−1)` newline rule); `caret-offset.ts`
  and `editor-lifecycle.ts` import it; property test
  `extractContentText(render(buildDocument(t))) === t` over the fixture
  corpus; invariant: **block wrappers contain only `div[data-line]`
  children** (static path must `join('')`, no indented template literals).
- **M2 (correctness):** zero-text `data-raw` spans (image with only `<img>`
  inside) break `findTextInNode`/click mapping. → **image span keeps
  editor-visible punct text** (see Design §Images): DOM text == raw, no
  `data-raw`, no caret surgery — the wiki-link-style click-collapse hole
  cannot occur.
- **M3/M4/M5/M6 (both):** CSS-table (`display:table`) collides with
  expansion (anonymous one-cell rows mid-edit), `pre-wrap` phantom
  whitespace, contenteditable caret quirks — none catchable in happy-dom.
  → **flex rows for both surfaces**: `.wn-table-row { display: flex }`,
  `.wn-table-cell { flex: 1 1 0; min-width: 0; white-space: normal }`
  (display-only; extraction unaffected). Equal-width columns accepted
  (sizing out of scope). No scroll container needed (cells shrink/wrap);
  `docs/theming.md` "horizontally scrollable tables" claim corrected.
  Rejected alternatives recorded below.
- **M5/M6/M7/M8 (both):** `renderDocumentToHTML(lines, plugins)` signature
  kept (60+ test refs stay green — provable behavior preservation); new
  sibling `renderDocModelToHTML(doc, plugins)`. Parity harness rewritten to
  call `renderLines`/`renderDocumentHtml` on both sides **in step 0**,
  before any block exists.
- **m1/M1 (scope):** Files adds `plugins/index.ts`, `core/index.ts` export
  decisions, `node-smoke` block assertions; per-feature `reader-renderer`
  fixture flips move INTO steps 1/2/4/5 (they were load-bearing for "verify"
  gates); caret fix lands as its own commit with a failing dom test first.
- **m5 (scope):** fidelity rule split: **block-region lines keep byte-exact
  DOM text (no data-raw); token-level renders may substitute visible glyphs
  and rely on `data-raw`** (lists already do; images deliberately don't —
  see above).
- **m6 (scope):** the four branches that gate 80% coverage named explicitly.
- **CSP/referrer (scope M8):** `referrerpolicy="no-referrer"` on `<img>`;
  CSP absence documented in architecture.md (adding CSP = separate concern).
- **m4 (scope):** lowercase roman `[ivxlcdm]+\.` included after the
  single-letter alpha alternative (so `i.` binds as alpha, `ii.` as roman —
  as-typed display makes the distinction cosmetic).
- **m7 (scope):** relative-src page-directory resolution documented in
  api.md ("prefer root-absolute `/…`").
- Out-of-scope additions: linked images `[![a](i)](u)` stays degraded (pinned
  as a fixture, documented); `src/core/cursor.ts` (dead third extraction
  model) untouched, noted for a future chore.

## Approach

**Step 0 — shared text model + nesting-aware caret (behavior-preserving).**
Extract `src/core/content-text.ts` from `editor-lifecycle.ts`'s closure,
rewire `caret-offset.ts` (`rawSubtreeLength`/`getOffsetBeforeLine`) to use
it, make it nesting-aware per the `Σ rawLineLength(inner) + (n−1)` rule
(avoiding the double-count trap with `getOffsetBeforeLine`'s own `+1`),
define wrapper-boundary semantics for the sibling-walk fall-through
(start-of-first-inner-line / end-of-last-inner-line), rewrite the parity
harness to use the real render pipelines, add the exhaustive
`setLineOffset→tryGetLineOffset` round-trip test. Gate: full suite green,
zero block features exist yet.

**Block pass (step 3).** `ContentPlugin` gains optional
`blocks?: BlockDef[]`:

```ts
interface BlockDef {
  type: string                    // 'code-block' | 'table'
  lineTokenType?: string          // token type buildDocument may emit for region lines ('table-row')
  match(lines: string[], start: number, helpers: BlockHelpers):
    { endLine: number; state?: unknown } | null
  lineMode(index: number, state?: unknown): 'verbatim' | 'token'
  parseLine?(index: number, state?: unknown): Token[]   // required when any lineMode is 'token'
  wrapperClass: string            // 'wn-code-block' | 'wn-table'
  lineClass?(index: number, state?: unknown): string | undefined
}
interface BlockRegion { type; def: BlockDef; startLine: number; endLine: number; state?: unknown }
interface BlockHelpers { isPlainLine(line: string): boolean }  // false if any ^-anchored TokenDef matches
```

`buildDocument(text, plugins)` (new `src/core/document.ts`, DOM-free):
split lines → top-down scan; for each unclaimed line, try each plugin's
`blocks` in registration order, earliest start wins → regions → **region
lines get their `lines[i]` replaced** by `parseLine` output (token mode) or
a single `text` token with the verbatim line (verbatim mode); non-region
lines tokenize as today. `buildPluginMap` additionally registers
`lineTokenType`s → plugin, so `render`/`renderToHTML` on the normal token
pair handle cells (no structural block hooks anywhere — wrapper emission is
generic in both renderers: `line-renderer.ts` and `static-renderer.ts` wrap
consecutive region lines in `div.{wrapperClass}`, setting
`data-block="<type>"` + `lineClass` on each line div, joining with `''`
and never emitting whitespace text nodes).

**Cursor-in-block (step 3).** `editor-render.ts` keeps the current
`DocModel`; `activeLine ∈ [region.startLine, region.endLine]` → seed
`activeLines` with every region line. `renderLines`' raw branch is
unchanged. Wrapper attrs (`data-block`, classes) are present in BOTH states
and on both surfaces, so the collapsed→expanded transition is exactly the
existing raw-text swap; flex rows with one raw text child render as a
full-width line (no anonymous-cell artifacts by construction).

**Text fidelity rule (final form).** Block-region lines render byte-exact
DOM text (fences, pipes, colons visible as dimmed `wn-punct`/line class) —
never `data-raw` on a line div or its direct wrapper (the `extractContentText`
branch order makes `data-raw` + `data-line` on one element swallow the
newline). Token-level renders MAY substitute display glyphs with `data-raw`
fidelity (wiki links, list bullets).

### Feature designs

**Lists (D1+D2).** Single exported marker regex `LIST_ITEM_RE` in
`editor-indentation.ts`:
`/^(\s*)([-*+]|\d+\.|[a-z]\.|[A-Z]\.|[ivxlcdm]+\.|[IVXLCDM]+\.)\s(.*)$/`,
imported by `listItem.ts` (kills the two-sources-of-truth problem). Marker
span displays `•` for `[-*+]`, typed string otherwise; `data-raw` on the
wrapper preserves source (existing mechanism). Enter continuation reuses the
typed marker. Bullet keeps 1:1 glyph width (`- ` → `• `) as an assertion,
not a requirement (data-raw makes it safe either way).

**Images.** Inline token `/!\[([^\]]*)\]\(([^)\s]+)\)/`, registered before
`linkPlugin` (defaults ordering documents intent; `scanInline` tie-break is
registration order at equal index — the `!` match starts earlier so it wins;
noted honestly). Editor + reader SAME tree:
`<span class="wn-image"><span class="wn-punct">![</span><span class="wn-image-alt">alt</span><span class="wn-punct">](</span><span class="wn-image-src">src</span><span class="wn-punct">)</span><img class="wn-image-img" src alt loading="lazy" referrerpolicy="no-referrer"></span>`
DOM text == raw exactly → **no `data-raw`** → all caret/extract paths
already work (rev. 1's zero-text-span hole structurally impossible).
Reader-scoped CSS (sanctioned second divergence, documented beside the
anchor exception in the parity test header AND theming.md — the tree stays
identical, parity compares trees):
`.wn-article .wn-image .wn-punct, .wn-article .wn-image-src { display: none }`
→ reader sees just the rendered image (alt remains for broken images);
editor keeps the punct convention. Unsafe/failed URL → whole token renders
as escaped literal text (both surfaces, like `link.ts`).

**Code fences (verbatim).** `match`: line `^```` + unclaimed; scan for
closing `^```\s*$` else EOF (GFM open-to-EOF). `state = { info: string }`.
`lineMode`: verbatim everywhere. Fence lines get `lineClass`
`wn-code-fence` (dimmed), content `wn-code-line`. Language label is part of
the verbatim opening line. No syntax highlighting.

**Tables (token mode).** `match`: `lines[start]` passes
`helpers.isPlainLine`, contains `|`, `lines[start+1]` is a separator: split
on unescaped `\|` (strip one optional leading/trailing pipe), every cell
matches `/^:?-{1,}:?$/`, ≥1 literal `|` in the row, count matches header
cell count. `endLine`: consecutive following lines containing `|` (ragged
rows allowed → padding, see below); stops at first non-`|` line, blank
line, EOF, or a line matching any line-level def.
`state = { alignments: ('left'|'center'|'right'|null)[], headerCells: number }`.
`parseLine(i)`: header/body row → one `table-row` token whose groups carry
cells (GFM-style: rows with fewer cells pad with empty strings — the token
is built from `state`, so BOTH surfaces render identical cells; extra cells
render as overflow cells, documented); separator line → verbatim single
text token with `lineClass 'wn-table-sep'` (rendered thin via CSS, text
intact). `table-row` `renderToHTML`/`render`:
`<span class="wn-punct">| </span><span class="wn-table-cell wn-align-*">{renderInline(cell)}</span>…`
— every source char (pipes, spaces) in a text node, byte-exact.
Alignment is a **closed enum** of classes, derived from parsed colons —
never interpolated from source. Header row cells bolded via
`lineClass wn-table-head`.

**Safety contract (B4, explicit per new emitter):**

| Field | Escape |
|---|---|
| code/fence/separator verbatim lines | `escapeHTML(line)` |
| fence info string | part of verbatim line (same escape) |
| table cell text | inline-rendered (`renderInlineHTML`), fallback `escapeHTML` |
| alignment classes | fixed enum only |
| img `src`, `alt` attrs | `escapeAttr` (src additionally gated by resolution-based `isSafeImageUrl`) |
| img punct/alt/src text spans | `escapeHTML` |
| list `data-raw` attr | `escapeAttr` (unchanged) |

Reader fixtures per vector: `<script>` inside fence; `"` breakout in
`![a](x"onerror="y)`; `![a](\evil.com\x.png)`; `| <img src=x onerror=1> |`
cell; `- |---|` and `prose\n---` staying non-tables.

## Files

Created:

1. **`src/core/content-text.ts`** — `extractContentText(el)`,
   `rawNodeLength(node)` (single nesting-aware model; wrappers of
   `data-line` children count `Σ inner + (n−1)`).
2. **`src/core/document.ts`** — `buildDocument(text, plugins)` →
   `DocModel { lines, blocks }`; block scan (earliest-start-wins,
   registration-order ties), region line tokenization,
   `regionsAt(lineIndex)` helper.
3. **`src/core/plugins/codeBlock.ts`** — fence BlockDef (verbatim), as
   designed above; `tokens: []` + `render` stub (registry tolerates empty
   `tokens`; type-only `blocks` presence validated in registration).
4. **`src/core/plugins/table.ts`** — table BlockDef (token mode) +
   `table-row` token `render`/`renderToHTML` pair + separator parse →
   alignments state.
5. **`src/core/plugins/image.ts`** — as designed above.

Modified:

6. **`src/core/types.ts`** — `BlockDef`, `BlockRegion`, `BlockHelpers`,
   `DocModel`; `ContentPlugin.blocks?`.
7. **`src/core/static-renderer.ts`** — `renderDocModelToHTML(doc, plugins)`
   (grouping + wrapper emission, `join('')`, `<br>` for empty region
   lines); `renderDocumentToHTML(lines, plugins)` UNCHANGED signature;
   `renderDocumentHtml` switches to `buildDocument`+`renderDocModelToHTML`.
8. **`src/core/line-renderer.ts`** — accepts DocModel (or text+plugins,
   internally building), generic wrapper emission mirroring #7 exactly,
   `data-block` + `lineClass` attributes, active-region raw branch reuse.
9. **`src/core/editor-render.ts`** — cursor-in-block → multi-line
   `activeLines`; keeps `DocModel` from render for the keydown-adjacent
   paths (see #11).
10. **`src/core/caret-offset.ts`** — import shared content-text (#1);
    wrapper-boundary semantics for the two fall-through branches
    (`container === el` children walk, `previousSibling` walk); NO
    double-counting against `getOffsetBeforeLine`'s per-line `+1`.
11. **`src/core/plugins/listItem.ts`** — import shared `LIST_ITEM_RE`;
    • display; keydown handlers: bail when `lineEl.dataset.block` present;
    walk to `[contenteditable]` root instead of `node.parentElement`.
    Same for any other `onKeydown` plugin touching line geometry
    (audit: only listItem has one today — verify with grep).
12. **`src/core/editor-indentation.ts`** — widened `LIST_ITEM_RE` (exported,
    single source); `ListItemParts.marker` = typed string.
13. **`src/core/plugin-map.ts`** — register `lineTokenType`s from
    `blocks` defs.
14. **`src/core/plugins/defaults.ts`** — register `imagePlugin` (before
    link), `codeBlockPlugin` (before table — tie order), plus new plugins.
15. **`src/core/plugins/index.ts`** + **`src/core/index.ts`** — export new
    plugins; decide public exports: `buildDocument`, `DocModel`,
    `BlockRegion`, `BlockDef` exported (server/node-smoke consume).
16. **`src/core/styles.ts`** — `EDITOR_CONTENT_CSS` adds `.wn-code-block`,
    `.wn-code-fence`, `.wn-code-line`, `.wn-table`, `.wn-table-row`
    (flex), `.wn-table-cell` (`flex:1 1 0; min-width:0; white-space:
    normal`), `.wn-table-sep`, `.wn-table-head`, alignment classes,
    `.wn-image(-img/-alt/-src)`. `.wn-article`-scoped image-hiding rules go
    in the reader-side section of the SAME stylesheet (layout.ts already
    embeds tokens+content CSS; scope selector already differs).
17. **`src/shared/url-policy.ts`** — `isSafeImageUrl` (resolution-based;
    rejects `\`, `data:`, `mailto:`, protocol-relative incl. backslash
    forms); keep `isSafeHref` doc-comment noting the two policies are
    DELIBERATELY different contracts.
18. **Tests** — `content-text.test.ts` (+ property test over corpus incl.
    blocks); `document.test.ts` (scan, precedence, unclosed fence, EOF
    table, ragged rows, isPlainLine gating); `static-renderer.test.ts`
    adds model-driven cases (existing 60+ untouched); `plugins.test.ts` +
    per-plugin suites; dom: `caret-offset` round-trip every offset on a
    table+fence fixture; wrapper-boundary branches; `line-renderer`
    cursor-in-block expand/collapse; `listItem` Enter/Tab bail inside
    `data-block` + no corruption of `1. step` in a fence; `reader-renderer`
    fixture flips per step + the five B4/B3/B2 vectors; `surface-parity`
    harness rewritten in step 0, FIXTURE extended (bullets, ordered, safe +
    unsafe images, fence incl. `**not bold**` + blank lines, table incl.
    alignment + ragged row + inline marks), still ONE anchor exception;
    `node-smoke` renders a fenced+table doc through `renderDocumentHtml`.
19. **Docs** — `api.md`: supported grammar grows (ordered lists, images,
    fences, tables, bullet display); degradation list shrinks (add linked
    images + relative-src resolution note + roman-numeral quirk); two URL
    policies as separate contracts. `architecture.md`: block pass,
    content-text unification, flex-table rationale, reader-scoped image
    divergence, CSP-absence note. `theming.md`: new classes; correct the
    "scrollable tables" claim; sanctioned divergences list (anchor +
    reader-scoped image CSS). `AGENTS.md`: single-renderer bullet — grammar
    lives in `src/core/plugins/` AND the block pass (`document.ts`); fidelity
    rule (block lines byte-exact, token glyphs may differ with data-raw).

## Steps

0. **Shared text model + caret nesting + parity harness rewrite** —
    no features; commits: (a) failing dom test for wrapper round-trip →
    `content-text.ts` extraction + caret fixes; (b) parity harness →
    `renderLines`/`renderDocumentHtml`.
    *Verify:* full suite green; existing static-renderer assertions byte-identical.
1. **Lists (D1+D2)** — shared regex export, pattern widen, • display,
    Enter/Tab continuation for ordered items, unit + both-path tests,
    reader fixture flip for `1. one` needle (moved from step 6).
    *Verify:* tests green incl. flipped reader fixtures.
2. **Images** — `isSafeImageUrl` (+ backslash vector test), plugin, CSS,
    defaults order, reader image fixtures flipped (assert real `<img>`,
    alt/src behavior, unsafe-literal), parity line.
    *Verify:* tests green; grep proof no `data-raw` on image span.
3. **Block-pass foundation** — `types.ts`, `document.ts` (scan + line
    tokenization), plugin-map `lineTokenType`, generic grouping in both
    renderers + `data-block`, editor-render expansion, keydown bail
    (`dataset.block`) + `[contenteditable]` walk in listItem. Landed with
    code/table defs NOT yet registered (behavior-preserving; DocModel flows
    but no regions exist).
    *Verify:* FULL suite green unchanged + document/caret/keydown tests for
    synthetic in-test block defs (registration via test plugins only).
4. **Code blocks** — plugin + CSS + `wn-code-*`; fixtures: verbatim inside
    (no `**bold**`), unclosed→EOF, blank lines inside, table syntax inside
    fence stays literal, cursor-in-block dom tests, `<script>` inside fence
    escaped, reader flip + parity extension.
    *Verify:* tests; dev-server eyeball (expand/collapse keystrokes).
5. **Tables** — plugin + `table-row` token + flex CSS + alignment enum;
    fixtures: header/sep/body, ragged padding identical both surfaces,
    inline marks in cells, `prose\n---` NOT a table, `- |---|` NOT a table,
    cell XSS, cursor-in-block, EOF table, reader flip + parity.
    *Verify:* tests.
6. **Regression sweep + parity finalization** — extend parity FIXTURE
    (all features, all vectors); property test corpus extended with block
    docs; confirm single documented anchor exception still holds.
    *Verify:* parity + property tests green.
7. **Docs** — all doc edits (Files §19) incl. theming.md claim correction.
8. **Full gate** — `npm run typecheck && npm run lint &&
    WN_TEST_PG_URL=postgres://localhost:54432/worldnotes npm run
    test:coverage && npm run build`; conventional commits per step; review
    skill; coverage named-branch checklist: (a) unclosed fence, (b)
    mismatched cell count, (c) `container === el` across wrapper,
    (d) expanded-region state.

## Rejected alternatives (recorded so they aren't re-litigated)

- **Per-plugin `renderBlock`/`renderBlockToHTML` structural hooks** (rev. 1):
  duplicates `data-line`/`<br>`/index logic in 4 places and makes parity
  "two hand-written implementations that happen to match". Declarative
  regions + generic grouping strictly smaller.
- **`display: table` CSS on divs**: anonymous-cell layout jump on every
  keystroke near a table (raw rows = one-cell rows), contenteditable-in-
  table caret/Enter quirks invisible to happy-dom, phantom-whitespace under
  inherited `pre-wrap`; equal-width flex avoids all three; column sizing is
  out of scope. **`<table>` tags**: HTML parser drops stray `<tr>` in the
  static string path.
- **Reader-only block rendering**: violates the single-renderer invariant
  and the parity test.
- **Wiki-link-style `data-raw` span with zero-text content for images**:
  known caret hole (`findTextInNode` returns null → model offset vs visible
  caret desync → destructive Backspace). Punct-fidelity span avoids the
  class entirely.
- **Semantic `<ul>/<ol>/<li>/<table>` HTML** (reader a11y/SEO): contradicts
  the pivot's reader==editor decision; remains out of scope.

## Risks & Open Questions

- ⚠️ **Caret round-trip is the make-or-break invariant** — mitigated by step
  0 landing first with the exhaustive offset test, shared single model, and
  the wrapper "only data-line children" invariant (static `join('')`, no
  indented template literals inside wrappers).
- ⚠️ **happy-dom cannot see layout** — flex table layout + image display are
  dev-server eyeball steps (documented as a known test hole; computed-style
  check via CDP as in the pivot's step 5).
- ⚠️ **input inside collapsed blocks** — verbatim/byte-exact text means
  extraction stays exact; keystroke expands the region via the existing
  selectionchange→render path; dom test types into a collapsed fence line.
- ⚠️ **`pre-wrap` inside flex cells** — cells set `white-space: normal`
  (display-only; source chars preserved in DOM). Row divs keep the line's
  leading/trailing whitespace inside punct/edge cells; verify no phantom
  blank rows in dev server.
- ❓ Table at EOF/inside list indent: regions require `isPlainLine` start —
  indented table rows are simply not table starts (kept simple; can widen
  later).
- ❓ Image inside a table cell: `table-row` cells render inline → images
  work structurally; flex cell with `overflow: hidden`? Leave
  `max-width: 100%` on img; verify in dev server.
- Accepted: no syntax highlighting; no `data:` URIs; no image width syntax;
  linked images degraded; `A.`/`I.`-style prose abbreviation lines become
  list markers (D1 as-typed, requires `^` + space).

## Out of scope

Semantic HTML, autolinks, checkboxes, `####`+, `_underscore_`, backslash
emphasis-escapes, entities, link titles, multi-backtick spans, list
renumbering, nested-list semantics, table column sizing, `data:` images,
linked images, CSP header work, `src/core/cursor.ts` dead-code deletion
(separate chore).
