# Single Renderer: Reader = Editor, Remove markdown-it

**Date:** 2026-09-19 22:05 UTC (rev. 2 after dual-reviewer pass, 22:25 UTC)
**Branch:** `refactor/single-renderer`
**Status:** Revised — pending user approval

## Goal

Make the anonymous reader render pages with the **exact same engine** the editor
uses — the `src/core` tokenizer + content-plugin `renderToHTML` pipeline — and
delete markdown-it entirely. One grammar, one renderer, two surfaces:
interactive editor and read-only reader.

## Decisions (confirmed with user, 2026-09-19)

| Topic | Decision |
|---|---|
| Look | **Identical to editor**: reader emits the editor's HTML shape (`div[data-line]`, dimmed `wn-punct` markers, `data-raw`/`data-page` attrs) and is styled with the editor's CSS |
| Grammar | **Ship editor subset now**. Unsupported syntax renders as literal source text (no data loss). Full accepted-degradation list (see Risks): fences, tables, ordered/nested semantic lists, autolinks, task checkboxes, h4–h6, images, backslash escapes, `_underscore_` emphasis, multi-backtick spans, indented code blocks, link titles/`)` in URLs, HTML entity decoding, AND a visible label change: `[[blog/my-post]]` now displays "my-post" (last segment, core `pageDisplayName`) instead of markdown-it's full-target label |
| Links | **Real anchors on the static path** with a scheme-based classification table (below). Interactive DOM path keeps spans + `onNavigate` |
| Rollout | **Single branch, big-bang**: extend core, switch reader, remove markdown-it, invert docs/AGENTS rules — commits per milestone |

## Approach

Move the DOM-free static HTML functions out of `src/core/renderer.ts` into
`src/core/static-renderer.ts`, add the façade `renderDocumentHtml(markdown)`,
and point the server at it through a small adapter. Because that renderer will
now serve **author-supplied markup to anonymous readers**, safety must live in
the plugins themselves: attribute values must use quote-safe escaping, and
link hrefs must be classified by URL *scheme* (not the current `://`-substring
heuristic) and gated by `isSafeHref` from `src/shared/url-policy.ts`. For
visual parity, the editor's CSS strings are extracted from `editor-dom.ts`
into `src/core/styles.ts` with a strict allow/deny split so no editor chrome
leaks into the reader. `PageHtmlDeps.render` is already
`{ render(src): string }`, so routes and cache need no changes.

### Link classification table (static `renderToHTML`, replaces `://` heuristic)

Applied by **both** `link.ts` and `wikiLink.ts`, evaluated in order:

| Target shape | Static output |
|---|---|
| `[[t]]`/`(url)` with no scheme, foldable by `wikiTargetToSlug` | `<a class="wn-wiki-link" href="/{slug}" data-page data-raw>` |
| leading `#` or `?` (same-document fragment/query) | `<a class="wn-link" href="#…">` (relative, origin-safe) |
| scheme-like (`/^[a-z][a-z0-9+.-]*:/i`) or leading `//` → external | `isSafeHref` true → `<a class="wn-link" href rel="noopener noreferrer">`; **`target="_blank"` + `nofollow` only for `http(s):`** (not `mailto:`). Unsafe (`javascript:`, `data:`, `vbscript:`, `//host`, `""`) → **escaped literal source text**, no anchor |
| no scheme, NOT foldable (e.g. `[[中文]]`) | escaped literal `[[…]]` text (same as today's markdown-it viewer; no new class names) |

Security-boundary note: the foldable-internal branch's safety derives from
`validateSlug`'s `[a-z0-9/-]` charset (`src/shared/slug.ts`), *not* from
`isSafeHref`. Add a comment at both call sites and cross-reference it from the
AGENTS.md slug-policy bullet: loosening `SEGMENT_RE` would silently delete an
XSS guard.

## Files

1. **`src/core/static-renderer.ts`** *(new)* — DOM-free: shared `escapeHTML` +
   `escapeAttr` (single copies, imported by all plugins — kills the
   escapeHTML/escapeAttr duplication), `renderLineToHTML`, `renderInlineHTML`,
   `renderDocumentToHTML` (moved from `renderer.ts`), plus
   `renderDocumentHtml(markdown: string, plugins?: ContentPlugin[]): string`
   (flatten `TokenDef[]` → `tokenizeDocument` → `renderDocumentToHTML`;
   defaults to `defaultPlugins`). Also: stop `trim()`-ing each line's HTML in
   `renderDocumentToHTML` — emit raw (escaped) content, insert `<br>` only for
   genuinely empty lines, so leading/multiple spaces survive exactly as the
   editor DOM does (paired with `white-space: pre-wrap` in step 5).
2. **`src/core/renderer.ts`** — keep DOM functions only (`renderLine`,
   `renderDocument`, `renderInlineContent`, `buildPluginMap`).
3. **`src/core/index.ts`** — export static-renderer API; add
   `renderDocumentHtml`. **Server code must import
   `src/core/static-renderer` directly, never the core barrel** (the barrel
   pulls `createEditor`/`editor-dom` into the SSR graph).
4. **`src/core/plugins/link.ts`** — implement the classification table in
   `renderToHTML`; gate external hrefs in the DOM `render()` with `isSafeHref`
   too (defense-in-depth; unsafe → styled span of literal source).
5. **`src/core/plugins/wikiLink.ts`** — foldable → real anchor with
   `href="/{slug}"`; non-foldable → escaped literal `[[…]]`. DOM `render()`
   unchanged (spans; `onNavigate` intercepts).
6. **`src/core/plugins/listItem.ts`** + attribute-escape audit — fix
   `data-raw="${escapeHTML(token.raw)}"` → `escapeAttr` (quote-breaking
   attribute injection: `- x" onclick="alert(1)` currently escapes into a live
   handler); grep-audit **every `"`-delimited interpolation in all plugin
   `renderToHTML`s** and convert to `escapeAttr` (`headings`, `inline`,
   `bold/italic/strike/code/quote/hr` included).
7. **`src/core/styles.ts`** *(new)* — editor CSS extracted from `editor-dom.ts`
   with an explicit split:
   - `EDITOR_TOKENS_CSS` = only the `.wn-root { --wn-* … }` custom-property
     blocks (light + dark).
   - `EDITOR_CONTENT_CSS` = allow-list: `.wn-punct`, `.wn-h1/.wn-h1-text` …
     `.wn-h3*`, `.wn-bold`, `.wn-italic`, `.wn-inline-code`, `.wn-code-text`,
     `.wn-blockquote*`, `.wn-list-item*`, `.wn-hr`, `.wn-wiki-link*`,
     `.wn-strikethrough`, `.wn-link*`.
   - Stays in `editor-dom.ts` (deny-list): the `.wn-root` *layout* rule
     (`display:flex; height:100%; overflow:hidden` — embedding this would clip
     long reader pages and flex-item every line div), `.wn-header`,
     `.wn-toolbar`, `.wn-body`, sidepanels, `.wn-breadcrumb*`, `.wn-actions`,
     `.wn-editor-wrap/.wn-editor-col`, `.wn-placeholder`, overlays, remote
     cursors, toasts, keyframes, editor-only `@media`.
   - `editor-dom.ts` imports and concatenates → editor behavior unchanged.
8. **`src/server/render/reader.ts`** *(new; replaces `markdown.ts`)* —
   `createReaderRenderer(): { render(src: string): string }` wrapping
   `renderDocumentHtml`, importing `../../core/static-renderer` (direct path).
   Delete `src/server/render/markdown.ts`.
9. **`src/server/app.ts`** — import `createReaderRenderer` from
   `./render/reader` (routes/`pages-html.ts`/cache untouched).
10. **`src/server/render/layout.ts`** — `VIEW_CSS` becomes chrome only:
    - Delete (replaced by editor CSS): `.wn-article h1,h2,h3`,
      `.wn-article pre/code/pre code`, `.wn-article blockquote`,
      `.wn-article table/th/td`, `.wn-article hr`, `.wn-task`, the unscoped
      `.wn-wiki-link { text-decoration-style }` rule (source-order collision
      with the imported rule), and the mobile `.wn-article h1/table/pre code`
      overrides. Keep `main .wn-article { overflow-wrap: break-word }`.
    - Article wrapper: `<article class="wn-root wn-article-content">` with
      reader-side typography ported from `.wn-editor`:
      `white-space: pre-wrap; word-break: break-word;` + the
      font/line-height/color declarations (so reader preserves intra-line
      whitespace identically — core of the parity promise). Resolve token-name
      collision: chrome rules keep `--wn-*` (VIEW_CSS `:root`) OR alias the
      editor's `--wn-color-*` set on the view root — pick aliasing so both
      blocks coexist; assert in a test that no `overflow:hidden`/`height:100%`
      rule targets the reader root.
    - Note: reader anchors inherit `.wn-article a { color: var(--wn-accent) }`
      specificity traps — that rule is deleted with the rest; editor rules
      supply colors via `--wn-color-link`/`--wn-color-wiki-link`.
11. **`src/shared/viewer-renderer.ts`** — delete.
    **`src/shared/url-policy.ts`** — drop `validateLink` (markdown-it adapter)
    + stale comments; `isSafeHref` stays (consumed by core plugins).
12. **`package.json`** — `npm uninstall markdown-it` (no `@types` dep present);
    **`vitest.config.ts`** — drop the stale `src/demo.ts` coverage exclusion
    (file doesn't exist).
13. **Tests:**
    - `src/core/__tests__/static-renderer.test.ts` *(new; from
      renderer-html.test.ts)* — import-path move; per-row assertions from the
      classification table (foldable anchor, fragment/query, http/https anchor
      with `nofollow`+`_blank`, `mailto:` anchor **without** `_blank`/nofollow,
      `javascript:`/`data:`/`//host`/`""` → literal escaped text, non-foldable
      `[[中文]]` → literal text); attribute-escape regression
      `renderDocumentHtml('- x" onclick="alert(1)')` must not contain
      `" onclick=`; whitespace-preservation fixture (leading spaces survive);
      `renderDocumentHtml` end-to-end.
    - `src/server/__tests__/markdown-viewer.test.ts` → `reader-renderer.test.ts`
      — adapter pass-through + degradation fixtures (fence/`|table|`/`1. list`/
      `- [ ]`/`#### h4`/`![img](u)`/`\*esc\*`/`_em_`/`&copy;` render as literal
      source, each pinned; `&copy;` documented as *differs* — escaped, not
      decoded) + "no `markdown-it` import remains" grep-style assertion.
    - `src/core/__tests__/editor-dom.test.ts` or new — **cross-surface parity
      test (non-tautological)**: for a fixture doc, tokenize once, render via
      plugin DOM `render()` (happy-dom) and via `renderToHTML`; assert the
      DOM tree's tag/class/attribute skeleton matches the parsed static HTML
      (compare via DOMParser-equivalent normalization). Exact string equality
      is not the goal — same class vocabulary + same nesting is.
    - `src/server/__tests__/node-smoke.test.ts` — rewrite comments;
      **`await import('../render/reader')`** (+ `layout`) so the guard covers
      the actual SSR seam; execute `renderDocumentHtml` under plain node.
    - `src/server/__tests__/pages-html.test.ts` — article assertions switch
      to editor shape (`data-line` divs, `wn-h1` spans, wiki anchors);
      chrome assertions (`@media (max-width: 640px)`, `min-height: 44px`,
      `/all`, `/search`, 404 `wn-create-btn`, `<title>` from DB) must survive
      unchanged.
14. **Docs & rules:** `AGENTS.md` (invert "read path must never emit
    edit-preview HTML" → single-renderer constraint + plugin-internal
    `isSafeHref` + slug-charset-coupling warning), `docs/architecture.md`
    (diagram, module table, inverted bullet, security model: "static renderer
    escapes all author markup by construction + scheme-gated hrefs"),
    `docs/api.md` "Viewer markdown" (grammar = plugin set; full degradation
    list incl. wiki-label change), `docs/overview.md` (invariant lines 19–20
    & 25–26 — phrase-based rewrite, NOT just a `markdown-it` grep),
    `docs/theming.md` (reader embeds editor tokens + content CSS; VIEW_CSS =
    chrome), **`README.md` line 5** ("server-rendered semantic HTML" →
    "server-rendered, read-only view identical to the editor — no JavaScript
    required for reading"). Doc check must be **phrase-based** (grep
    `semantic HTML|edit-preview|never.*core.*render|markdown-it`), since
    overview.md/README assert the old architecture without naming markdown-it.

## Steps

1. **Extract static renderer** (files 1–3): move functions, add
   `renderDocumentHtml`, de-trim line output, single `escapeAttr`. Pure move —
   ✅ `npm run typecheck && npm test` green after adjusting import paths only.
2. **Anchor + safety pass** (files 4–6): classification table in
   `link`/`wikiLink` `renderToHTML`, `isSafeHref` on DOM external hrefs,
   `listItem` + all-attribute `escapeAttr` audit. ✅ tests incl. XSS
   regressions.
3. **Extract editor CSS** (file 7) with allow/deny lists. ✅ editor tests +
   `npm run build` unchanged output behavior.
4. **Server switch** (files 8–9, 11–12): `reader.ts` adapter; delete
   `markdown.ts` + `shared/viewer-renderer.ts`; `npm uninstall markdown-it`;
   url-policy cleanup; vitest exclusion fix. Update `node-smoke`,
   `reader-renderer`, `pages-html` expectations. ✅ `npm run typecheck && npm test`.
5. **Reader styling** (file 10 + test from file 13): VIEW_CSS surgery,
   `wn-root`+pre-wrap article wrapper, token aliasing. Manual pass with
   `npm run dev` (+ `AUTH_DISABLED=1`): seeded home page, a fixture page
   exercising every supported construct, degradation fixtures, 404 page,
   `/all`, `/search`, dark mode. Evidence: note screenshots/observations in
   the milestone commit message.
6. **Invert docs & rules** (file 14). Phrase-based grep check clean.
7. **Full validation:**
   `npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build`
   — coverage ≥80% incl. new modules.
8. **Review** (review skill) → conventional commits per milestone.

## Risks, Trade-offs & Follow-ups

- ⚠️ **Attribute-context XSS** (review BLOCKER 1) — `listItem`/audit in step 2;
  pinned by `" onclick=` regression test.
- ⚠️ **Href policy bypass via heuristic** (review BLOCKER 2) — `://` substring
  classification is wrong for `mailto:`/`javascript:`/`#frag`; replaced by the
  scheme-based table; every row tested.
- ⚠️ **CSS leakage** — editor `.wn-root` layout rule must NOT reach the reader
  (clips long pages); allow/deny split + "no overflow/height rule on reader
  root" test.
- ⚠️ **Content regressions** — full list in Decisions row 2; pinned by
  degradation fixtures so behavior is tested, not folklore.
- ⚠️ **Perf**: `scanInline` is quadratic (re-slices per token; markdown-it was
  linear) inside the request path. Accepted now: authors are provider-gated
  (trusted) and the deployment model is single-instance; **follow-up ticket**:
  sticky-regex cursor scan + hoist `buildPluginMap` out of the per-line loop.
- ⚠️ **Coverage threshold** — new modules ship with tests (steps 1–5 include
  them); stale `demo.ts` exclusion removed.
- ℹ️ **Cache** — in-process LRU resets on deploy; ETags hash HTML; stale reads
  across instances already a documented non-goal (`docs/overview.md`).
- ℹ️ **Two render methods per plugin** (DOM vs string) stays — the real
  single-engine constraint is one grammar/one class vocabulary; the new
  cross-surface parity test pins it. Structural unification is a follow-up.
- ℹ️ **`title.ts`** already core-tokenizer-based — unaffected; `<title>` comes
  from DB title, search uses DB titles.
