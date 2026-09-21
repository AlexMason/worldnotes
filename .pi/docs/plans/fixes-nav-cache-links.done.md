# Fixes batch: navigation, cache, links, lists, 404 flow (rev 2)

Date: 2026-09-21 (UTC). Branch: `fix/nav-cache-links-batch`.
Rev 2 incorporates the dual reviewer subagent critiques (verified findings).

## Goal

Six operator-reported fixes: (1) remove the create-dialog/404 dead-end for
logged-in users, (2) double list indentation visually, (3) external-link
marker, (4) leading-slash links create ghost breadcrumb crumbs, (5) 404s
sticky in the browser cache after admin settings changes, (6) clicking links
in the editor misbehaves (lands on 404 even when the target page exists).

## User decisions (interview, 2026-09-21)

- #6 = **clicking links misbehaves** — autolinking and title-syntax OUT.
- New-page seed: **`# Auto Title`** (`slugDisplayName`), create-on-save.
- External marker: **absolute http(s) links only** (= the `target="_blank"`
  ones). mailto/#frag/internal: none. Self-host full URLs: marked — accepted.

## Root causes (confirmed by repros + live-server inspection)

1. **404 dead-end**: `navigateToPage()` store-miss → client 404 status page +
   persistent `wn-404` "Create" toast. Anonymous reader already has no create
   affordance (verified; nothing to remove server-side).
2. **Ghost crumbs / broken clicks (shared root cause)**: nav targets used
   RAW — `'/blog/first-post'.split('/')` → leading `''` trail segment (ghost
   crumb); buffer keys diverge from the store's folded keys → clicks on
   existing pages 404. Live DB shows the damage (`blog/first-post123` titled
   `/blog/first-post123`).
3. **Sticky 404s**: `respond()` sends **404s with
   `max-age=60, stale-while-revalidate=300`** → browser re-serves the cached
   404 for a minute after settings flips. Server LRU never stores 404s
   (reviewers verified) — it is purely response headers.

## Approach

**Fold + refuse in the navigation core**: `navigateToPage` folds the target
via one shared helper and **refuses (toast) non-foldable targets instead of
degrading to the raw string** — mirroring the reader contract (unfoldable
wiki targets render as literal text; `nav.ts` drops them) and closing the
ghost-URL/silent-400-save hole (`[[中文]]`, `[[api/x]]`, `[t](/all)`,
`[x]()`, bare `https://…` via public API). **Consolidate hydration in
`loadPage`** (navigateToPage's load block deleted → no double GET, one
hydration point, `clearHistory` moves into its hydrate branch). **Delete the
status-page/overlay machinery** — store-miss falls through to `loadPage`'s
existing seed branch (upgraded to a human title). **Fix autosave
page-capture** (schedule-time page, not fire-time — otherwise a stray timer
after removing the 404 dead-end persists a just-seeded, never-typed page;
reviewers proved no flush exists today). Cache hygiene = 4xx `no-store`
only; **`cache.clear()` on settings dropped as redundant** (both reviewers).
Visual fixes are CSS-only in shared `EDITOR_CONTENT_CSS` (fidelity/parity
verified safe by reviewers: no `innerText`/measurement-based caret math;
`::after`/`letter-spacing` invisible to `content-text.ts`).

## Files

1. **`src/shared/slug.ts`** — add `navTargetToSlug(target): string | null`
   (documented as THE fold: `wikiTargetToSlug` semantics + comment that
   callers must refuse `null`). Use it in `api-page-store.normalize` so the
   client folds exactly once, not "a fourth mirror".
2. **`src/core/editor-navigation.ts`** — top of `navigateToPage`: fold; if
   `null` → `notifications.notify` ("… is not a valid page address", 3s) and
   return. Else use canonical everywhere; `segments = canonical.split('/').
   filter(Boolean)` (guard lives at trail CONSTRUCTION, not render). Delete
   `navigateToStatusPage`/`resolveStatusPage`/`DEFAULT_STATUS_CONTENT` and
   the load block (hydration consolidated in `loadPage` + `clearHistory`
   moved to its hydrate branch); wrap load in `try/finally`
   (`setNavigating`) + catch → error toast (no stuck-navigating, no unhandled
   rejection). Accept a `notifications` dep (already constructed in
   `editor.ts` before navigation). Keep the `DEFAULT_HOME` branch; the
   not-found seed becomes `` `# ${slugDisplayName(page)}\n\n` ``.
3. **`src/core/editor-lifecycle.ts`** — autosave fix: `saveDebounced`
   captures `const page = state.getCurrentPage()` at schedule time;
   `saveNow(page = current)` saves THAT page's buffer. Guard the `navigate`
   instance method against rejections.
4. **`src/core/editor-render.ts`** — delete the `wn-404` block; delete
   `notifications` from `EditorRenderOptions` (+ import) — lint-unused
   otherwise (reviewer-verified rule).
5. **`src/core/editor-state.ts`** — remove `pendingRequestedPage`; also
   `configuredInitialPage.split('/')` → `filter(Boolean)` on trail build.
6. **`src/core/editor.ts`** — rewire: notifications → navigation; drop
   removed render options.
7. **`src/core/types.ts`** — drop `statusPages`, `showCreateOverlay`; fix
   stale `wn-404` doc example (notification `id` comment).
8. **`src/core/plugins/link.ts` + `wikiLink.ts`** — NO behavior change
   (fold happens centrally); one comment: `data-page` is the raw author
   target, not a buffer key (reviewer: prevents future drift).
9. **`src/core/styles.ts`** —
   `.wn-list-item-indent { letter-spacing: var(--wn-list-indent, .3em) }`
   (~2-space level: ~0.5em → ~1.1em ≈ 2.2×, scales with source depth;
   token-ized per file convention);
   `.wn-link[target="_blank"]::after { content: "\2197" / "";  /* a11y alt —
   browsers without support announce the glyph; accepted */
   text-decoration: none; margin-inline-start: .15em; font-size: .85em;
   color: var(--wn-color-fg-muted, …) }`.
10. **`src/server/routes/pages-html.ts`** — `respond()`: header branch on
    `status !== 200` → `cache-control: no-store` (keep etag/vary emission
    untouched; 304 shortcut already 200-gated — say so in a comment).
11. **Tests** — precise scope (reviewer-verified locations):
    - `editor-navigation.test.ts`: status-pages describe (~394-471) →
      replaced by drop-into-editor tests; rejection test at ~481 → now
      asserts toast-swallowed rejection; NEW: memory store seeded BY SLUG
      (`{'blog/first-post': …}`) navigated via `'/blog/first-post'` (the
      fold-enabling pairing), `'[[Some Page]]'` → lands on `some-page`,
      trailing-slash `/blog/first-post/` folds, refuse-cases: `''`, `中文`,
      `api/x`, `/all`, `https://…` — trail/breadcrumb never gains an empty
      or raw segment.
    - `editor-render.test.ts` 404-toast describe (~374-448) → deleted.
    - `editor-state.test.ts:95-102` → pending-requested assertions deleted.
    - `editor-lifecycle.test.ts` + `undo-redo-integration.test.ts`: only
      hand-written `EditorStateAPI` mock trims (typecheck excess props) —
      they have NO 404 behavior (reviewer correction).
    - NEW lifecycle test: edit A → navigate to B within debounce → timer
      persists A (not B); B's seed never POSTed.
    - `pages-html.test.ts`: 404 body tests already pass — add header
      assertions: 404 = `no-store`, 200 STILL `max-age=60` (pin
      no-over-application); touch stale "create overlay" test titles.
    - API-store: `normalize` via `navTargetToSlug` unchanged behavior.
12. **Docs** — `api.md`: 404 no-store semantics + explicit acceptance that
    2xx chrome may be ≤60s stale after settings edits ("wrong answer vs
    stale answer"); `architecture.md`: fold-at-navigate + refuse policy;
    `theming.md`: `--wn-list-indent` token + external-marker rule.

## Steps

1. `navTargetToSlug` helper (+ api-page-store adopts it). Unit tests.
2. Navigation refactor (Files 2/3/5/6/7): fold+refuse+toast, consolidated
   hydration, `try/finally`, autosave page-capture, 404/overlay/status-page
   deletion, DEFAULT_HOME preserved. Update/add tests (incl. lifecycle
   autosave + mock trims).
3. Client click-through verification via core tests with slug-seeded memory
   store (step-2 tests cover: slash link → existing page, no ghost crumb,
   new page → seeded editor).
4. CSS: indent token + external marker; verify corpus + surface-parity
   green (must be untouched); eyeball 3-4 nesting levels incl. caret-line
   collapse (widened indent reverts to real spaces on the active line —
   consistent with existing • → - behavior) and 320px overflow.
5. Server: 4xx no-store branch + comment; header tests.
6. Docs updates.
7. Full validation: `npm run typecheck && npm run lint &&
   WN_TEST_PG_URL=… npm run test:coverage && npm run build`.
   **`npm run build` BEFORE any browser smoke** — `tsx watch` does not
   rebuild `dist/client`, so smoke-testing without it validates the OLD
   editor (how the junk data got made).
8. Manual smoke on localhost:3000 (new bundle): click `/blog/x`-style link
   → existing page, no ghost crumb; click missing-page link → editor with
   `# Title`, save creates it; nested lists; external ↗; toggle allPages →
   flip back within 60s → no sticky 404.

## Reviewer-verified guarantees

- Fold seam at `navigateToPage` is THE convergence point for every nav
  source (plugin mousedown, keymap, breadcrumb, header links, popstate) —
  all callers audited by reviewer #1.
- Breadcrumb clicks (`loadPage`) correctly bypass the fold: trail entries
  are server-validated or fold-produced.
- Buffer keys after this change are always canonical slugs — which ALIGNS
  memory-page-store with api-page-store (coherence win, per reviewer #1).
- Removing `statusPages`/`showCreateOverlay`/`pendingRequestedPage`: only
  consumers are the 5 core files + 3 test files (client main.ts never
  passes them; npm packaging dropped → public-API narrowing sanctioned).

## Risks & residual

- ⚠️ CJK/emoji wiki targets become NON-clickable in the editor (refuse +
  toast) where they previously opened an unsavable phantom buffer — matches
  the reader, data-loss eliminated; pinned by refuse tests.
- ⚠️ Autosave page-capture touches the save path — covered by a new
  lifecycle test; Ctrl+S semantics unchanged (current page).
- ❓ Live junk rows (`blog/first-post123`, `404` page) — operator deletes
  (no auth cookie available to this session).
- Client-level pushState/title behavior stays manually smoked (no client
  harness exists; extracting a testable helper judged over-scope).

## Commit plan (one per concern, reviewers' granularity note)

1. `fix(navigation): fold nav targets to slugs, refuse unfoldable ones`
2. `fix(editor): drop 404 status-page dead-end; missing pages open in editor`
3. `fix(autosave): capture page at schedule time, not save time`
4. `fix(server): 404 responses are no-store`
5. `style(editor): double list indentation via --wn-list-indent`
6. `style(editor): external-link arrow marker`
7. `docs: cache semantics, fold policy, theming tokens`
