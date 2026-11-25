---
issue: 12
title: Resolve relative wiki links against the current page
type: feature
branch: feature/12-relative-wiki-links
status: draft
created: 2026-11-24
pr: ""
---

# Resolve relative wiki links against the current page

Issue: #12

## Goal

A wiki link has two forms. `[[/beta]]` (leading `/`) resolves from the site root, to `/beta`, on every page. `[[beta]]` resolves as a **child of the page it is written on**: on `/alpha` it links to `/alpha/beta`, and on `/alpha/gamma` to `/alpha/gamma/beta`. It does so whether or not a root-level `/beta` exists. Every consumer of a wiki link agrees on the resolved target: the reader `href`, editor click navigation (and therefore create-on-first-edit of a missing page), the existing/missing link class on both surfaces, the reader's existence lookup, the editor's first-paint existence seed, and nav-page header links.

## Non-goals

- `../` parent traversal. `slugify` already drops `.`/`..` segments, so `[[../x]]` keeps folding to a child `x`. This is unchanged and not documented as a feature.
- Markdown links `[text](beta)`. They keep root semantics (`/beta`) everywhere.
- Rewriting stored page content. No data migration (see Decision 6).
- The opt-in CodeMirror 6 spike (`?cm6=1`, `src/core/cm6/`, `src/client/cm6-spike.ts`). It keeps root resolution, as in #10.
- Chrome that does not render page content: breadcrumbs, all-pages list, search results.

## Context

- Grammar: `src/core/plugins/wikiLink.ts`. `parseWikiLink` (`src/core/navigation.ts`) trims the target and splits `|display`. The reader `renderToHTML` folds the target with `wikiTargetToSlug` → `<a class href="/{slug}" data-page="{raw target}" data-raw>`, and an unfoldable target becomes escaped literal text. The editor `render()` emits `<span class data-page="{raw target}" data-raw>`, and `onNavigate` calls `context.navigate(rawTarget)`.
- Folding: `src/shared/slug.ts`. `slugify` splits on `/`, folds each part, and drops empty parts, so a leading `/` is already ignored. `validateSlug` enforces charset, 255-char length and reserved first segments. `navTargetToSlug === wikiTargetToSlug`.
- Everything downstream folds `data-page` / the navigate argument with root semantics:
  - `editor-navigation.ts` `pageAddressToSlug` (click → canonical slug → buffers/trail/URL/saves);
  - `link-existence-sync.ts` (in-place `wn-link-missing` toggle);
  - `plugins/link-class.ts` `wikiLinkClass(target, pageExists)`.
- Static engine: `src/core/static-renderer.ts`. `pageExists` is threaded positionally through `renderInlineHTML`, `renderDocumentToHTML`, `renderDocModelToHTML`, `renderDocumentHtml` and `staticContext()`. `collectLinkSlugs` (`src/core/link-slugs.ts`) records what the real render asks about.
- Editor context: built per render by `editor-state.ts` `toContext()` from the trail (`getCurrentPage()`). `options.homeSlug` is the raw setting, and the trail root falls back to `'home'`.
- Server reader: `src/server/render/reader.ts`. `createReaderRenderer(pages).render(src)` and `resolveLinkExistence(pages, src)`.
  - `routes/pages-html.ts` `renderArticle(slug, home)` renders the article (cache key `p:{slug}`) and computes the editor shell's `linkExists` seed.
  - The home page is served at `/` via `renderArticle(homeSlug, true)` and also at `/{homeSlug}`.
  - `render/status-page.ts` renders the designated 404/403 page body (cache `s:{kind}:{slug}`, callers in `pages-html.ts` and `admin.ts`).
- Nav: `src/server/render/nav.ts`. `extractNavLinks(content)` folds wiki targets with `wikiTargetToSlug`. `createNavLinksService` caches `nav:{navSlug}` and has `settings`.
- Settings: `PUT /api/settings` (`routes/settings-api.ts`) updates `homeSlug`. Today nothing evicts the render cache on a settings change; the reader ETag mixes in the settings revision.
- Tests: vitest `dom` + `node` projects. Relevant suites: `static-renderer`, `link-slugs`, `surface-parity`, `editor-navigation`/`editor-lifecycle`, server `reader-renderer`, `nav`, `pages-html`, `settings-api`, and `node-smoke` (DOM-free guard).

## Decisions

Decisions were made by the implementer under the user's standing instruction to run plan → implement → review → file → merge unattended. Interview answers already given (#12): relative = child of the current page; always relative even if a root page exists; no `../`; wiki links only.

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | Resolution is one shared, env-agnostic pair in `src/shared/slug.ts`. `wikiLinkBase(pageSlug, homeSlug)` returns the base slug, or `null` for root. `wikiLinkAddress(target, base)` returns the **root-absolute address** (`/alpha/Beta Page`), which every existing consumer then folds unchanged. | Teach every consumer (navigation, existence sync, `wikiLinkClass`, nav) about bases. | The plugins are the only place that knows a token is a wiki link. Converting it there to a root-absolute address means navigation, existence sync, link classes and the API store keep their single root-semantics fold. One rule, no drift. |
| 2 | `data-page` on wiki links (both surfaces) carries that root-absolute address instead of the raw target. `onNavigate` navigates to it. Markdown links keep their raw URL (already root semantics). | Add a separate `data-slug` attribute. | One convention (`data-page` = root-semantics navigation target) instead of two. Existing readers of `data-page` (existence sync) keep working. |
| 3 | The **home page resolves from the root**. When the page being rendered is the configured `homeSlug`, the base is `null`, so `[[beta]]` on the home page links to `/beta`. With no `homeSlug` configured, there is no special case. A page slugged `home` is an ordinary page on both server and client (client passes the raw `options.homeSlug`, not the `'home'` trail fallback). | Pure rule: home page `home` → `/home/beta`. | Home is served at `/`, and the user's model is URL nesting (`site.com/alpha` + `[[beta]]` → `site.com/alpha/beta`). Under that model, `site.com/` + `[[beta]]` is `site.com/beta`. |
| 4 | A relative target that folds to nothing (`[[!!!]]`) stays unresolvable (literal text on the reader, refused with a toast in the editor). Prefixing the base must never turn it into a self-link. A relative target whose joined slug exceeds 255 chars is unresolvable too. | Let `alpha/!!!` fold to `alpha`. | Prevents silently creating self-links. Same visible outcome as today for unfoldable targets. |
| 5 | The page slug flows explicitly. `StaticRenderContext` and `EditorContext` gain `linkBase?: string` (absent = root) via a shared `LinkContext` type. The static engine's positional `pageExists?` parameter becomes `links: LinkContext = {}`. `collectLinkSlugs` takes the same `links`. | A fourth positional parameter. | Two optional positionals of different meaning are error-prone. All in-repo callers migrate (clean cutover). |
| 6 | **No data migration.** Existing `[[x]]` links on pages other than the home page now point to `{page}/x`. | Rewrite stored `[[x]]` → `[[/x]]` with a migration. | Rewriting user content is destructive and would lock in the old semantics the user is moving away from. Links that change target and now point at missing pages are visibly marked by the #10 missing-link style. Recorded as an accepted risk and called out in the PR. |
| 7 | Server: `createReaderRenderer(pages, getHomeSlug)` owns the base rule. `render(src, pageSlug)` and `linkExistence(src, pageSlug)` take the **page slug**, and callers never compute bases. The status page renders with its own designated slug as the page. | Callers compute `linkBase`. | Three callers (article, status via `pages-html` and `admin`, shell seed) cannot disagree. Required `pageSlug` makes every caller decide. |
| 8 | Nav-page header links resolve against the nav page's slug (same home rule). | Nav links always from root. | The same `[[x]]` must mean the same page in the editor (where the admin edits the nav page) and in the header chrome. |
| 9 | `PUT /api/settings` clears the render cache when `homeSlug` changes. | Accept staleness until the cache TTL expires. | The home rule makes the old and new home pages' cached HTML (and nav/status entries) wrong. A home change is a rare admin action. |

## Design

### Shared (`src/shared/slug.ts`)

```ts
/** Base for a page's relative wiki links: null = site root (the configured home page). */
export function wikiLinkBase(pageSlug: string, homeSlug: string | null | undefined): string | null {
  return !pageSlug || pageSlug === homeSlug ? null : pageSlug
}

/**
 * Root-absolute navigation address of a wiki-link target written on a page
 * whose base is `base`. `/x` and base-less targets are returned as-is (root
 * semantics); relative targets become `/{base}/{target}`. Targets that fold
 * to nothing are returned unchanged so they stay unresolvable.
 */
export function wikiLinkAddress(target: string, base: string | null | undefined): string {
  const t = target.trim()
  if (!base || t.startsWith('/') || slugify(t) === '') return t
  return `/${base}/${t}`
}
```

`wikiTargetToSlug(wikiLinkAddress(t, base))` is the resolved slug (null = unresolvable). `base` is always a validated slug, so prefixing it cannot introduce a reserved first segment. Length overflow fails `validateSlug`.

### Core

- `types.ts`: `export interface LinkContext { pageExists?: PageExists; linkBase?: string }`. `StaticRenderContext` and `EditorContext` extend it (replacing their own `pageExists` declarations).
- `static-renderer.ts`: `renderInlineHTML(text, plugins, links: LinkContext = {})`, and the same for `renderDocumentToHTML`, `renderDocModelToHTML`, `renderDocumentHtml`. `staticContext(plugins, links)` spreads only the defined keys.
- `link-slugs.ts`: `collectLinkSlugs(markdown, plugins, { linkBase?, max? })`. It passes `linkBase` into the render and records `pageExists` calls.
- `plugins/wikiLink.ts`: `const address = wikiLinkAddress(page, context.linkBase)`.
  - Reader: `slug = wikiTargetToSlug(address)`, href `/{slug}`, `data-page="{address}"`, class `wikiLinkClass(address, …)`.
  - Editor: `data-page = address`, class from `address`.
  - `onNavigate`: `context.navigate(address)`.
- `editor-state.ts` `toContext`: `linkBase` = `wikiLinkBase(currentPage, options.homeSlug)`, included only when non-null.

### Server

- `reader.ts`:
  - `ReaderRenderer { render(src, pageSlug): Promise<string>; linkExistence(src, pageSlug): Promise<Map<string, boolean>> }`.
  - `createReaderRenderer(pages, getHomeSlug: () => string | null)`.
  - `renderReaderHtml(src, links?: LinkContext)` stays the pure seam.
  - `resolveLinkExistence` becomes internal to the renderer (`linkExistence`).
- `app.ts`: `createReaderRenderer(deps.pages, () => settingsService.get().homeSlug)`. Pass `cache` to `registerSettingsApiRoutes`.
- `pages-html.ts`: `render.render(page.content, slug)`; editor shell seed `render.linkExistence(page.content, slug)`.
- `status-page.ts`: `deps.render.render(page.content, doc.customSlug)`.
- `nav.ts`: `extractNavLinks(content, linkBase: string | null = null)`. Wiki tokens resolve via `wikiTargetToSlug(wikiLinkAddress(page, linkBase))`; md links unchanged. The service passes `wikiLinkBase(navSlug, settings.homeSlug)`.
- `settings-api.ts`: `SettingsApiDeps.cache: Pick<RenderCache, 'clear'>`. After a successful update, call `cache.clear()` when `next.homeSlug !== previous.homeSlug`.

### Failure modes

- Unresolvable relative target (folds empty, or too long once nested): reader shows literal source; editor click shows the existing "not a valid page address" toast (the address is shown, e.g. `/alpha/…`).
- Missing home setting: no special case; consistent on both surfaces.
- Old cached reader HTML after deploy: in-process cache starts empty on restart; browser `max-age=60` staleness accepted (as for any content change).

## Testing

- `src/shared/__tests__/slug.test.ts`:
  - `wikiLinkBase`: home → null, empty → null, other → slug, null home → slug.
  - `wikiLinkAddress`: relative, `/`-rooted, no base, empty fold (`!!!`), whitespace.
  - Fold of the address: nested, alias-free, overflow → null.
- `src/core/__tests__/static-renderer.test.ts` (or `link-slugs.test.ts`):
  - With `linkBase: 'alpha'`, `[[beta]]` → `href="/alpha/beta"` and `data-page="/alpha/beta"`.
  - `[[/beta]]` → `/beta`.
  - `[[Beta Page|Shown]]` → `/alpha/beta-page`, label `Shown`.
  - `[[!!!]]` stays literal.
  - `[x](beta)` stays `/beta`.
  - No `linkBase` → unchanged output.
  - Existence lookups receive the resolved slug.
  - `collectLinkSlugs` with `linkBase`.
- `surface-parity.test.ts`: rendering the fixture with a `linkBase` keeps the reader and editor trees identical (`data-page` included).
- Editor (`editor-navigation`/`editor-lifecycle` tests):
  - On page `alpha`, clicking `[[beta]]` navigates to `alpha/beta` (trail + `getCurrentPage`).
  - On the configured home page, it navigates to `beta`.
  - `[[/beta]]` from `alpha` → `beta`.
  - Existence requested for the resolved slug.
- Server (`reader-renderer`, `pages-html`, `nav`, `settings-api` tests):
  - `GET /alpha` with `[[beta]]` → `href="/alpha/beta"`.
  - `GET /` (home = `start`) with `[[beta]]` → `href="/beta"`, and `/start` renders the same.
  - Missing marker keyed on the resolved slug (`/alpha/beta` exists, `/beta` does not → no marker).
  - Editor-shell `linkExists` seed keyed on resolved slugs.
  - Custom 404 body resolves under the status page's slug.
  - Nav `[[x]]` on nav page `menu` → `/menu/x`.
  - `PUT /api/settings` changing `homeSlug` clears cached articles.
- `node-smoke` stays green (shared helper is DOM-free).
- Full: `npm run typecheck && npm run lint && WN_TEST_PG_URL=… npm run test:coverage && npm run build`.
- Manual (`npm run dev`, Postgres):
  1. Create `alpha` containing `[[beta]]`, `[[/beta]]` and `[x](beta)`.
  2. View anonymously. Hrefs are `/alpha/beta`, `/beta`, `/beta`, and missing targets show the dotted `/` marker.
  3. Sign in, click `[[beta]]`. The URL becomes `/alpha/beta` and the first edit creates it.
  4. Set the home page to `alpha` in /admin. `/` now links `[[beta]]` to `/beta`.

## Steps

- [ ] 1. Shared resolver: `wikiLinkBase` + `wikiLinkAddress` in `src/shared/slug.ts` with unit tests.
- [ ] 2. Core: `LinkContext` type; static engine `links` options object (all callers + tests migrated); wiki-link plugin resolves via `context.linkBase` on both surfaces and in `onNavigate`; `editor-state` `toContext` sets `linkBase`; `collectLinkSlugs` takes `linkBase`. Tests: static render, link-slugs, surface parity, editor navigation.
- [ ] 3. Server: `ReaderRenderer.render(src, pageSlug)` + `linkExistence`, `createReaderRenderer(pages, getHomeSlug)`; migrate `pages-html.ts`, `status-page.ts`, `admin.ts`, `app.ts`; nav extraction with the nav page's base; settings `homeSlug` change clears the render cache. Tests: reader-renderer, pages-html, nav, settings-api.
- [ ] 4. Docs: `docs/api.md` (wiki-link resolution in the viewer-markdown section, nav-page links, settings home-change cache effect), `docs/architecture.md` (link resolution rule and where it lives), `README.md`/`docs/overview.md` wiki-link wording; full local validation.

## Risks & open questions

- Existing content changes meaning: `[[x]]` on any non-home page now targets `{page}/x` (Decision 6) — *accepted*. Missing-link styling makes affected links visible; authors fix with `[[/x]]`.
- Home special case couples rendering to the `homeSlug` setting (Decision 3) — *accepted*; cache cleared on change (Decision 9), browser staleness ≤ `max-age`.
- CM6 spike keeps root semantics — *accepted* (non-goal, opt-in spike).

## Implementation notes

## Review
