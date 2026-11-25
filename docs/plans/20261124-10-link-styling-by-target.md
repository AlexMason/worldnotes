---
issue: 10
title: Style links by target — existing vs missing internal pages, icon for external links
type: feature
branch: feature/10-link-styling-by-target
status: in-review
created: 2026-11-24
pr: ""
---

# Style links by target — existing vs missing internal pages, icon for external links

Issue: #10

## Goal

Internal links (`[[wiki]]` and `[text](internal)`) render differently depending on whether the target page exists: **solid underline** when it exists, **dotted underline plus a trailing `/` marker** when it does not. Off-site http(s) links carry a proper **icon** (SVG, themeable) instead of the current `↗` text glyph. Behaviour is identical on the reader (zero-JS server HTML) and the editor DOM, and both are themeable through `--wn-*` tokens.

## Non-goals

- The opt-in CodeMirror 6 spike surface (`?cm6=1`, `src/core/cm6/`, `src/client/cm6-spike.ts`): not updated.
- `mailto:` and `#fragment` / `?query` links: no icon, no existence check.
- Real-time push of existence changes between sessions (no websockets/polling). Editor entries refresh on navigation after 60 s; the reader is bounded by its existing cache TTL.
- Changing link navigation: a link to a missing page still navigates (the editor auto-creates on first edit; anonymous readers get the existing 404).
- Nav-page links, the all-pages list and search results (chrome, not article content).
- Backlinks / "what links here".

## Context

- Link grammar: `src/core/plugins/link.ts` (`[text](url)`; `classifyLinkTarget` → external | same-doc | internal) and `src/core/plugins/wikiLink.ts` (`[[page|display]]`). Both emit class `wn-wiki-link` for internal targets: reader `renderToHTML` → `<a class="wn-wiki-link" href="/slug" data-page data-raw>`, editor `render()` → `<span class="wn-wiki-link" data-page data-raw>`. External: `<a class="wn-link" target="_blank">`.
- Render is **synchronous** and DOM-free for the reader: `renderDocumentHtml(markdown, plugins)` in `src/core/static-renderer.ts`, wrapped by `createReaderRenderer()` (`src/server/render/reader.ts`) as `render(src): string`. Callers: `src/server/routes/pages-html.ts:273` (article) and `src/server/render/status-page.ts:95` (custom 404/403 body).
- Reader article HTML is cached per slug (`p:${slug}`, `src/server/cache.ts`, bounded LRU, `public, max-age=60`). Today a page's HTML depends only on its own content; with this change it also depends on the **existence** of the pages it links to.
- Page-write hooks: `registerPageApiRoutes` calls `deps.onWrite(slug)` after create (POST), blank-PUT delete, content PUT, and DELETE; `app.ts` `invalidate(slug)` evicts `p:${slug}`, index, status and nav keys. Only create/delete change existence.
- `PagesRepository` (`src/server/db/repository.ts`) has memory (`pages-memory.ts`) and pg (`pages-pg.ts`) implementations; no existence-batch method.
- Editor: plugin `render(token, EditorContext)`; context built in `src/core/editor-state.ts` `toContext()`; options in `EditorOptions` (`src/core/types.ts`); client bootstrap `src/client/main.ts` reads the SSR embed `#wn-page` (built by `src/server/render/editor-shell.ts`) and wires store events (`createStoreEvents`, `onSaved`, `onDeleted`).
- Styles: `src/core/styles.ts` `EDITOR_CONTENT_CSS` (shared by editor and reader through `src/server/render/layout.ts`). Current `.wn-wiki-link` is dotted; `.wn-link[target='_blank']::after` renders a `↗` text glyph (commit 4c3e028). The issue body claims external links have no indicator — that is inaccurate; the plan replaces the glyph with an icon.
- Parity: `src/core/__tests__/surface-parity.test.ts` compares the two surfaces' trees (class lists included).
- No CSP on HTML responses (`grep` found only the media route), so a `data:` SVG in a CSS `mask` is allowed.
- Slug safety: `SEGMENT_RE` charset in `src/shared/slug.ts` keeps `href="/{slug}"` injection-safe; this plan only reads slugs produced by `wikiTargetToSlug` and never loosens it.
- Tests: `npm test` (vitest, dom + node projects); pg integration needs `WN_TEST_PG_URL`.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | Missing page = class `wn-link-missing` added alongside `wn-wiki-link`; existing page = no extra class. | A separate `wn-wiki-link-exists` class on existing links. | Zero change for existing markup/CSS/themes; "unknown" naturally degrades to the existing look. |
| 2 | **Unknown existence is treated as existing** (no class). Applies when no resolver is available, a fetch failed, or the answer is still pending. | Treat unknown as missing, or show a third "pending" style. | A false "missing" marker is worse than a missing marker. No flicker toward the alarming state; failures are invisible. |
| 3 | Visual: existing = solid underline (`text-decoration-style: solid`); missing = dotted underline + generated trailing `/` (`::after`, content from `--wn-link-missing-marker`, default `'/'`), muted colour `--wn-color-wiki-link-missing`. | Strikethrough line; red colour. | Reading of "a slash" is an assumption. The marker is a token string, so a theme can swap it (`''` to remove) without CSS surgery. Generated content never enters DOM text (fidelity tests unaffected). Not colour-only → accessible. |
| 4 | Reader resolves existence **server-side, before render**: collect link slugs from the document → one batched repository call → pass `pageExists(slug)` into `StaticRenderContext`. Renderer stays sync. | Client JS toggling classes after load; per-link async lookups. | Zero-JS reader constraint; one query per uncached render. |
| 5 | New `PagesRepository.existing(slugs): Promise<Set<string>>` (pg: `SELECT slug FROM pages WHERE slug = ANY($1)`). Slug list deduped and capped at 500 per render; slugs over the cap render as unknown (existing). | Reuse `list({limit:500})` and filter in memory; per-slug `get`. | `list` returns content-adjacent rows and caps at 500 pages overall; `get` is N queries. |
| 6 | Existence changes (create / delete) **clear the whole render cache**; content-only writes keep today's per-slug eviction. `onWrite` gains a `change: 'created' \| 'updated' \| 'deleted'` argument. | Track reverse link index and evict only dependents. | Creates/deletes are rare; single-process bounded cache; reverse index is a new subsystem. 60 s browser `max-age` staleness is accepted (as for content today). |
| 7 | Editor gets existence through an optional `EditorOptions.pageExists` resolver (`exists(slug): boolean \| undefined`, `request(slugs)`, `onChange(cb)`); plugins read it via `EditorContext.pageExists?.(slug)`. Core stays free of fetch code. | Core calls `fetch` directly. | Keeps `src/core` store/transport-agnostic (same split as `PageStore`). |
| 8 | Editor updates by **patching classes in place** on resolver change (`[data-page]` elements under the editor root), not by re-rendering. | Re-render affected lines. | Re-render risks caret/selection regressions (recent bugs #2, #3); class toggling does not touch DOM text. Later renders read the cache synchronously, so both paths agree. |
| 9 | Editor existence source: first paint seeded from the SSR embed (`#wn-page` gains `linkExists: Record<slug, boolean>`, computed with the same collector + `existing`); further slugs fetched in batches (≤100) via new `GET /api/pages-exist?slugs=a,b,c` (debounced 150 ms); entries older than 60 s re-requested on navigation; own saves/deletes update the map directly (`onSaved` → true, `onDeleted` → false). | Fetch everything via `/api/pages`; fetch only per click. | Avoids first-paint flash and unbounded lists. |
| 10 | Endpoint path `/api/pages-exist`, not under `/api/pages/…`. Same read gate as other page reads (`requireLoginJson`); `Cache-Control` follows `cacheControlFor(gated, 'public, max-age=30, stale-while-revalidate=60')`. | `/api/pages/exists`. | The `/api/pages/*` wildcard would treat `exists` as a slug. |
| 11 | External icon: replace the `↗` text glyph with an inline SVG used as a CSS `mask` on `.wn-link[target='_blank']::after`, coloured by existing `--wn-color-link-marker`. Scope unchanged (http/https only). | Keep the glyph; add an icon font; inline `<svg>` in markup. | Glyph renders inconsistently across fonts and is not a real icon; `mask` keeps markup/DOM text unchanged and themeable; no new asset or dependency. |
| 12 | Existence applies to `[[…]]` and internal `[text](…)` alike; unfoldable targets stay literal source text (unchanged). | Wiki links only. | Both emit `wn-wiki-link`; one behaviour. |
| 13 | Existing link look is `text-decoration-style: solid` for **all** `.wn-wiki-link` by default (replacing today's dotted), including in the editor. | Keep dotted for existing, different style for missing. | Issue's desired state. |

## Design

### Shared (core, DOM-free where required)

- `types.ts`: `StaticRenderContext.pageExists?(slug: string): boolean | undefined` and `EditorContext.pageExists?(slug: string): boolean | undefined`.
- New `src/core/link-slugs.ts`: `collectLinkSlugs(markdown: string, plugins: ContentPlugin[], max = 500): string[]`. Builds the document model (`buildDocument`), scans inline tokens of non-region lines (same approach as `src/server/render/nav.ts`: reuse `scanInline`, inline defs), maps `wiki-link` → `wikiTargetToSlug(parseWikiLink(g0).page)` and `link` with `classifyLinkTarget === 'internal'` → `wikiTargetToSlug(url)`; dedupes, drops nulls, truncates at `max`. Image tokens win over link tokens by tokenizer precedence (no special-casing).
- Plugins: in both `link.ts` and `wikiLink.ts`, internal branch computes `slug = wikiTargetToSlug(...)` and, when `context.pageExists?.(slug) === false`, adds ` wn-link-missing` to `class`. The editor `render()` path does the same via `EditorContext`. No change when `pageExists` is absent.
- `renderDocumentHtml(markdown, plugins, pageExists?)`; `renderDocModelToHTML`/`renderInlineHTML` thread the optional function into every `StaticRenderContext` they build.

### Server — reader

- `PagesRepository.existing(slugs)`; memory: filter against the map; pg: `= ANY($1::text[])`; empty input → empty set without querying.
- `createReaderRenderer(pages)` returns `{ render(src): Promise<string> }`: `collectLinkSlugs` → `pages.existing` → `renderDocumentHtml(src, defaultPlugins, (s) => set.has(s))`. A repository error propagates as today's render errors do (no silent fallback; the route already 500s on DB failure).
- `PageHtmlDeps.render` and `StatusDeps.render` become async; callers `await`.
- `onWrite(slug, change)`: `app.ts` `invalidate` keeps existing evictions and additionally `cache.clear()` when `change !== 'updated'`.

### Server — API

`GET /api/pages-exist?slugs=a,b/c` → `200 { exists: Record<string, boolean> }`. Validation: split on `,`, each through `validateSlug`; invalid entries are omitted from the result (not an error); more than 100 slugs → `400`; missing/empty `slugs` → `{ exists: {} }`. Uses `requireLoginJson` + `cacheControlFor` exactly like `GET /api/pages`.

### Editor

- `EditorOptions.pageExists?: PageExistenceResolver` where `PageExistenceResolver = { exists(slug): boolean | undefined; request(slugs: string[]): void; onChange(cb: () => void): () => void }` (declared in `types.ts`).
- `editor-state.ts` `toContext` exposes `pageExists: (slug) => { const v = resolver.exists(slug); if (v === undefined) resolver.request([slug]); return v }` (so rendering a link requests its existence once; requests are idempotent/deduped inside the resolver).
- Editor lifecycle subscribes `onChange` after mount and calls a new `syncLinkExistence(root)` that, for each `.wn-wiki-link[data-page]`, folds `data-page` with `navTargetToSlug` and toggles `wn-link-missing` from `resolver.exists`; unsubscribes on destroy.
- New `src/client/link-existence.ts` `createLinkExistence(seed, fetcher?)`: `Map<slug, {exists, at}>`; `request` queues unknown or >60 s-old slugs, flushes after 150 ms in ≤100-slug batches to `/api/pages-exist` (failure → entries stay unknown/unchanged, no retry loop, no toast); `set(slug, exists)` for local saves/deletes; `onChange` fires once per flush/set batch.
- `main.ts`: seed from `embed.linkExists`; pass resolver as `pageExists`; `createStoreEvents` wiring: `onSaved` → `set(page, true)`, `onDeleted` → `set(page, false)`.
- `editor-shell.ts`: `EditorShellOptions` gains `linkExists`; `renderArticle` computes it for editorial users (`collectLinkSlugs` of `page.content` + `existing`) and embeds it in `#wn-page`.

### CSS (`EDITOR_CONTENT_CSS`)

```css
.wn-wiki-link { text-decoration: underline; text-decoration-style: solid; … }
.wn-wiki-link.wn-link-missing {
  color: var(--wn-color-wiki-link-missing, var(--wn-color-fg-muted, #6f6a61));
  text-decoration-style: dotted;
}
.wn-wiki-link.wn-link-missing::after {
  content: var(--wn-link-missing-marker, '/');
  text-decoration: none; display: inline-block; margin-inline-start: .1em; opacity: .8;
}
.wn-link[target='_blank']::after {
  content: ''; display: inline-block; width: .8em; height: .8em; margin-inline-start: .2em;
  vertical-align: -.05em; text-decoration: none;
  background-color: var(--wn-color-link-marker, var(--wn-color-fg-muted, #6f6a61));
  -webkit-mask: var(--wn-icon-external, url("data:image/svg+xml,…")) center / contain no-repeat;
          mask: var(--wn-icon-external, url("data:image/svg+xml,…")) center / contain no-repeat;
}
```

(SVG: 16×16 box-with-arrow path; final path chosen in implementation.) Theme tokens `--wn-color-wiki-link-missing`, `--wn-link-missing-marker`, `--wn-icon-external` are documented in `docs/theming.md`.

### Failure modes

- Resolver/DB error on reader: render errors surface as today (500); no partial/incorrect "missing" output.
- Editor fetch failure: entries remain unknown → links look existing; no user-visible error.
- Race: page created in another session after the reader cache fill → stale ≤ cache TTL (accepted).
- Self-links and links inside code fences/tables follow existing tokenization (fences never produce link tokens; table cells do).

## Testing

All tests co-located, deterministic, no network.

- `src/core/__tests__/link-slugs.test.ts` — collection: wiki + internal md links, dedupe, unfoldable and external ignored, fence content ignored, cap respected, table cells included.
- `src/core/__tests__/plugins.test.ts` / `static-renderer.test.ts` — `wn-link-missing` present only when `pageExists(slug) === false`; absent for `true`, `undefined`, and when the context has no `pageExists`; external/same-doc never marked; HTML-injection-safe output unchanged.
- `src/core/__tests__/surface-parity.test.ts` — extend: with a resolver returning `false`, reader and editor trees both carry `wn-link-missing` on the same nodes.
- `src/server/__tests__/pages-memory.test.ts` + `pages-pg.integration.test.ts` — `existing`: subset, empty input, duplicates, non-existent.
- `src/server/__tests__/pages-html.test.ts` — reader: article with one existing and one missing link has `wn-link-missing` only on the missing one; creating the missing target via `POST /api/pages` then re-fetching shows it cleared (proves `cache.clear()` on create); deleting flips it back; content-only PUT of an unrelated page does not clear unrelated cache entries (spy on cache via existing helper); status-page custom body also resolves.
- `src/server/__tests__/pages-api.test.ts` — `/api/pages-exist`: valid/invalid slugs, 100-slug cap → 400, login-gated instance → 401/403 like `/api/pages`, `Cache-Control`/`Vary` headers.
- `src/client/__tests__/link-existence.test.ts` — batching/debounce (fake timers), dedupe, 60 s refresh rule, failure leaves unknown, `set` + `onChange`.
- `src/core/__tests__/editor-links.test.ts` — editor with a fake resolver: initial render class; `onChange` flips class in place without replacing nodes or changing `extractContentText`; destroy unsubscribes.
- Existing suites (`npm test`) must stay green; corpus fidelity property test untouched.
- Manual (`dev_environment`: `npm run dev`, needs Postgres): create pages `a` (links `[[b]]`, `[[nope]]`, `[x](https://example.com)`) and `b`; anonymous view → `b` solid underline, `nope` dotted + `/`, external icon; sign in → same in editor; type a new `[[fresh]]` → class settles within ~200 ms; save a page named `fresh` → marker clears on the link; view-source of reader HTML shows `wn-link-missing` without JS. Check dark mode + one custom theme overriding the three tokens.

## Steps

- [x] 1. Shared core: `pageExists` on `StaticRenderContext` / `EditorContext`; `link-slugs.ts` + tests; plugins (`link.ts`, `wikiLink.ts`) emit `wn-link-missing`; thread the optional resolver through `static-renderer.ts`; extend plugin, static-renderer and surface-parity tests.
- [x] 2. CSS: solid existing underline, missing style, SVG external icon, new tokens; update `docs/theming.md` (token table, selectors, replace the `↗` paragraph).
- [x] 3. Repository: `PagesRepository.existing` for memory and pg, with tests (incl. pg integration).
- [x] 4. Reader: async `createReaderRenderer(pages)`, update `pages-html.ts` and `status-page.ts` callers, `onWrite(slug, change)` + `cache.clear()` on create/delete in `pages-api.ts`/`app.ts`; reader tests (incl. cache-clear behaviour).
- [x] 5. API: `GET /api/pages-exist` with tests; document in `docs/api.md`.
- [x] 6. Editor: `PageExistenceResolver` option, context + in-place sync in core, `src/client/link-existence.ts`, `main.ts` wiring, shell embed `linkExists` (server `editor-shell.ts` + `pages-html.ts`); tests for resolver, editor links, embed.
- [x] 7. Docs and wrap-up: `docs/architecture.md` (reader existence pass, cache invalidation rule, editor resolver), update `docs/api.md` viewer-markdown section; run `npm run typecheck && npm run lint && WN_TEST_PG_URL=… npm run test:coverage && npm run build`.

## Risks & open questions

- The `/` marker as the reading of "slash" for missing pages (Decision 3) — *accepted*; swapping to a strikethrough or removing the marker is a token/CSS-only change.
- Reader staleness after a page is created by another process or after a cache TTL race (≤60 s + 300 s `stale-while-revalidate`) — *accepted*.
- `cache.clear()` on every create/delete briefly increases render load (nav/status entries too) — *accepted*; single-instance, rare events.
- Editor shows a link as existing until its existence is fetched (~150 ms) or if the fetch fails — *accepted* (Decision 2).
- Anonymous readers learn which linked slugs exist through the `wn-link-missing` class. This is already knowable via 200/404 on `/{slug}`; on `requireLogin` instances the reader and `/api/pages-exist` stay behind the existing gate — *accepted*.

## Implementation notes

- 2026-11-24 (step 1): `collectLinkSlugs` keeps the planned signature but is implemented as a recording `pageExists` driven through `renderDocumentHtml`, not a separate token walk. Reason: link tokens nested in list items, headings, quotes and table cells are rendered by their parent plugin, so a document-model walk would need per-plugin recursion and could drift from the real output. A shared `wikiLinkClass` helper (`src/core/plugins/link-class.ts`) holds the class decision for both plugins and both surfaces. Contract unchanged; no decision affected.

## Review

Mode: sub-agents (three fresh-context reviewers: A plan conformance & correctness, B code quality, C security & scalability). Review run unattended at the user's request; manual-review sign-off waived by the user (see Filed note below).
