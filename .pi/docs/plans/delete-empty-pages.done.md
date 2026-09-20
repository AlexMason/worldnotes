# Plan: Deleting all content on save removes the page (rev. 2)

Date: 2026-09-20 (rev after dual plan review) · Branch: `feature/delete-empty-pages`

## Goal

When an editor saves a page whose content is blank (empty or whitespace-only),
the page row is deleted from the database instead of being stored empty — a
no-blank-pages invariant enforced by the server API for every client.

## Decisions (from interview — fixed)

1. **Emptiness**: `content.trim() === ''` counts as "all content deleted".
2. **Enforcement**: server API (blank PUT deletes; blank/absent-content POST
   rejected), not just the editor client.
3. **Post-delete UX**: editor stays on the page, toast says "Page deleted";
   buffer remains empty so typing again recreates the page via the normal
   create path.

## Approach

Mirror the existing optimistic-concurrency pattern: add a version-guarded
`deleteIfMatch` to the repository contract (like `putIfMatch` — a route-level
get-then-delete would race a concurrent `putIfMatch` and could not produce a
correct 409 payload). In the PUT route, after the existing guards, blank
content → `deleteIfMatch` → `204 No Content` (with `onWrite` cache
invalidation, same as any write); stale version → `409` exactly like an edit
conflict (a stale blank save must never stomp newer content); missing row →
`404` (a blank PUT never recreates). POST rejects blank **or absent** content
with `400` — the wiki never gains blank pages.

Because POST-blank becomes a 400, the anonymous 404 **create overlay loses its
zero-JS "create empty row" script**: its button becomes a plain link to
`/{slug}`. This is consistent end-to-end: authenticated `GET /{slug}` already
serves the editor shell for missing pages (`pages-html.ts:108-129`, embed
`exists: false`), whose client seeds a starter heading **in the buffer only**
(`editor-navigation.ts:132-141` / the in-editor 404 "Create" toast,
`editor-render.ts:110-140`) and creates the row on the first non-blank save.
Pages now come into existence exactly when they first hold content.

The client learns of deletion through the `204` and drops the page's tracked
version, so the next non-blank autosave takes the create-via-POST path and the
page reappears — undo-friendly with no extra state.

One shared predicate (`isBlankContent` in `src/shared/`) keeps client and
server honest about what "empty" means (same precedent as `slug.ts` policy).

## Files

1. **`src/shared/content.ts`** (new) — `isBlankContent(content: string):
   boolean` = `content.trim() === ''`. No dedicated unit test; covered via
   route + client tests (also keeps coverage thresholds safe).
2. **`migrations/004_purge_blank_pages.sql`** (new; **SKIPPED by user approval —
   invariant is forward-only**) — would have run
   `DELETE FROM pages WHERE btrim(content) = '';` to complete the invariant
   for existing deployments.
3. **`src/server/db/repository.ts`** — add to `PagesRepository`:
   `deleteIfMatch(slug, ifMatch): Promise<DeleteResult>` with
   `export type DeleteResult =
     | { ok: true }
     | { ok: false; reason: 'conflict'; current: { version: number; updatedAt: number } }
     | { ok: false; reason: 'missing' }`
   (mirrors `PutResult`). Add a doc-comment to the existing unconditional
   `delete(slug)` pointing at its guarded sibling.
4. **`src/server/db/pages-pg.ts`** — implement:
   `DELETE FROM pages WHERE slug = $1 AND version = $2 RETURNING slug`; on no
   row, classify missing-vs-conflict with a follow-up
   `SELECT version, EXTRACT(EPOCH FROM updated_at)…` (same two-query shape as
   `putIfMatch` at `pages-pg.ts:95-118`).
5. **`src/server/db/pages-memory.ts`** — mirror semantics exactly.
6. **`src/server/routes/pages-api.ts`**
   - `POST /api/pages`: existing order is slug validate → coerce
     (`typeof body.content === 'string' ? … : ''`, `pages-api.ts:83`) → size →
     title → create. Insert the blank guard **after slug validation and
     coercion, before the size check**: `isBlankContent(content)` (covers
     omitted content) → `400 { error: 'cannot create an empty page' }`.
   - `PUT /api/pages/*`: existing guard order is content-string → size →
     title-length → If-Match/428 (`pages-api.ts:114-128`). Insert the blank
     branch **immediately after the 428 guard, before the title-derivation
     `get()`**: `isBlankContent(body.content)` → `deleteIfMatch`:
     - `ok` → `deps.onWrite?.(slug)` → `204`.
     - `conflict` → `409` `{ error, current }` + etag header — byte-identical
       shape to the existing conflict arm.
     - `missing` → `404 { error: 'page not found' }`.
   - Note (pin in tests): title validation still runs *before* a blank delete
     — a blank PUT carrying an over-long `title` is a `400`, consistent with
     every other write-guard rejection.
7. **`src/server/render/layout.ts`** + **`src/server/routes/pages-html.ts`**
   - Delete `CREATE_SCRIPT` (`layout.ts:110-132`) and its `createForSlug`
     wiring; the 404 overlay's create control becomes
     `<a class="wn-create-btn" href="/{slug}">Create this page</a>` (keep the
     `.wn-create` wrapper + `data-slug` if CSS uses them; keep the
     "Log in to create" hint text for the anonymous case).
   - Behavior delta (documented): anonymous visitors clicking Create now land
     on the same 404 overlay (login is the real precondition — surfaced via
     the hint + header "Log in" action); a logged-in visitor (or one arriving
     via the hint) lands directly in the editor for the new page and the row
     is created on first save with real content.
8. **`src/client/api-page-store.ts`** — minimal inserts, no duplicated branch:
   - `ApiPageStoreEvents.onDeleted?(page: string): void`.
   - Per-page save tokens (module-level `Map<string, number>` bumped at each
     `save()` entry) so a late-resolving blank `204` cannot wipe a version a
     newer save just established: in the `204` arm, apply
     `versions.delete(page)` + `events.onDeleted?.(page)` **only if no newer
     save for that page has started**.
   - At the top of `save()`: `versions.get(page) === undefined &&
     isBlankContent(content)` → return silently (nothing to create, no
     network — covers "typed then undeleted in the 404 overlay" and the
     post-delete Ctrl+S double-tap).
   - After `let res = await put(page, content)`: new `res.status === 204` arm
     as above (never reaches `res.json()`, which would throw on the empty
     body).
   - Existing 404-recreate arm (`api-page-store.ts:113-120`): when
     `isBlankContent(content)`, do not recreate — `versions.delete(page)` and
     return silently (page already gone; no toast). Non-blank behavior
     unchanged.
   - `createWithContent`: return `{ snapshot, existed }` (existed = the POST
     itself was `409`). Both call sites (initial create, 404-recreate) then:
     `existed` → set version from snapshot + `events.onConflict(page,
     snapshot)` instead of the current false-success `onSaved` — a page
     recreated by someone else during our blank→undo window surfaces a
     conflict instead of silently adopting and later overwriting it. 201
     success path unchanged (`onSaved`).
9. **`src/client/main.ts`** — wire `onDeleted`:
   `instance?.dismiss('wn-save')` then
   `instance?.notify({ id: 'wn-save', message: 'Page deleted', type: 'warning', duration: 2500 })`.
   (`dismiss` first because `notifications.ts` idempotent-ids return early
   while a same-id toast is live — an undismissed "Saved" would swallow the
   delete notice. `type: 'warning'` matches the destructive outcome and the
   existing "Page was deleted" conflict toast.) Buffer stays empty; no
   navigation.
   - **NOT changed: `src/core/memory-page-store.ts`** — reviewed decision: the
     core in-memory store is the editor's dev/test fallback with no event
     plumbing (a blank-delete there could not toast), its blank-page contract
     is pinned by `src/core/__tests__/memory-page-store.test.ts:16-20`, and
     the interview scoped enforcement to the server API. Storage-level parity
     deliberately out of scope.
10. **Tests**
    - `src/server/__tests__/pages-api.test.ts`:
      - blank PUT (`''`, `'  \n '`) with correct If-Match → `204`, row gone,
        `writes` recorded, follow-up GETs 404 (API + `/api/pages` list).
      - stale If-Match blank PUT → `409` with `current` + etag, row **not**
        deleted, no `onWrite`; missing row → `404`, row not created, no
        `onWrite`; blank PUT without If-Match → `428`; blank PUT with
        over-long title → `400`; `PUT {content: 123}`/`{}` → `400` (not a
        delete).
      - `onWrite` must not fire on the 404/409 blank arms.
      - POST blank (`content: ''`, `'   '`) **and POST with content omitted**
        → `400` (covers the old overlay payload explicitly).
      - SSR regression (mirrors `pages-html.test.ts:216-226`): after a blank
        PUT, anon `GET /{slug}` → 404 create-overlay (server cache
        invalidated), authenticated `GET /{slug}` → editor shell with
        `exists: false` embed.
    - `src/server/__tests__/pages-memory.test.ts`: `deleteIfMatch` → deleted
      / conflict-with-current / missing arms.
    - `src/server/__tests__/pages-pg.integration.test.ts`: same three, plus
      row already-removed classifies `missing` (not `conflict`).
    - `src/client/__tests__/api-page-store.test.ts`:
      - extend `stubFetch` (currently `Response.json(body ?? {})`, which
        cannot emit a 204) to support `body: null` → `new Response(null,
        { status })`.
      - blank save with tracked version → PUT with If-Match → 204 → version
        cleared (`versionOf` null), `onDeleted` fired, `onSaved` NOT fired.
      - blank + tracked version → 404 → version cleared silently, no create.
      - blank with untracked version → zero fetches.
      - blank 409 → `onConflict`, version adopted, no recreate.
      - stale blank `204` resolving after a newer non-blank save started →
        version map untouched (token guard).
      - after blank-delete, non-blank save → POST create (201) → `onSaved`.
      - create POST that returns 409 (+snapshot) → `onConflict`, not
        `onSaved`.
    - `src/server/__tests__/pages-html.test.ts`: update overlay assertions to
        the create **link** (no CREATE_SCRIPT fetch); hint/login CTA still
        present.
    - `src/core/__tests__/memory-page-store.test.ts`: **unchanged** (pins the
      deliberately-preserved core contract).
11. **Docs**
    - `docs/api.md`: routes table — POST `content` now **required,
      non-blank** (`400` otherwise); PUT gains `204` (blank content deletes
      the page); note this converts PUT from pure-write to write-or-destroy
      for API tooling ("stable for custom tooling" — call it out loudly in
      the conflict-semantics block); `GET /{slug}` overlay bullet — create
      navigates to the editor, row appears on first save; one line on reader
      browser-cache lifetime after a delete (up to 60 s stale `max-age`, no
      revalidation path to the new 404); phrase the invariant as
      **route-level + startup purge**, not a DB constraint.
    - `docs/architecture.md`: "Content model & save flow" — blank saves
      delete the row (version-guarded); editor stays put, next edit
      recreates; overlay creates-on-first-save.
    - `migrations/004…` header comment explaining intent.

## Steps

1. Shared predicate (`src/shared/content.ts`).
2. Repository contract + `deleteIfMatch` in memory & pg (+ their tests) —
   green before any route exists.
3. ~~Migration `004_purge_blank_pages.sql`~~ — **skipped** (user chose
   forward-only invariant; pre-existing blank rows persist until edited).
4. Routes: PUT blank branch, POST blank guard (+ route tests, incl. ordering
   pins 428/400).
5. Overlay: `layout.ts` CREATE_SCRIPT → link; `pages-html` overlay copy; SSR
   tests.
6. Client store: events, token guard, 204 arm, blank no-create arms,
   `createWithContent` existed-flag → conflict (+ stub upgrade, tests).
7. `main.ts` toast wiring (dismiss-then-notify, warning).
8. Docs (`api.md`, `architecture.md`).
9. Full validation: `npm run typecheck && npm run lint &&
   WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes
   npm run test:coverage && npm run build`.

## Risks & Mitigations

- **Stale-tab blank save destroying fresh content** — version-guarded
  `deleteIfMatch` → 409, same conflict UX as edits.
- **Cross-generation version aliasing**: recreation restarts `version` at 1
  (`pages-pg.ts` create inserts `version = 1`), so the guard holds within one
  row generation only — a tab that saw v1 of generation A can blank-delete
  generation B if it also reached v1. Same class as the existing
  `putIfMatch` overwrite (pre-existing); mitigated in the editor by the
  per-page save token + conflict-on-recreate adoption, accepted at the API.
- **pg classify race**: row created between DELETE-miss and SELECT → reported
  `conflict` with an unseen version; client adopts it (existing conflict-arm
  behavior). Accepted; documented in the integration test.
- **Unserialized saves** (`editor-lifecycle.ts:56-68` clears only the timer;
  Ctrl+S bypasses debounce): per-page save token prevents a late `204` from
  clearing a fresh version; `createWithContent` 409 now surfaces
  `onConflict` instead of a false "Saved".
- **Routine flows that can now delete rows**: Enter-on-empty-list-item
  (`plugins/listItem.ts:188-194`) rewriting the only line to `''`, or a
  cleared buffer leaving `'\n'` (browser `<br>`) — both trim to blank and
  delete the page. Consistent with the requested invariant; pinned by a
  whitespace-only route test.
- **Undo after delete**: restores text; save recreates via POST (no tracked
  version). Content preserved; version numbering restarts — acceptable
  (matches recreate semantics). If the slug was meanwhile recreated, the
  client gets a conflict toast, not a silent overwrite (step 6).
- **Migration 004 is destructive**: deletes pre-existing blank rows on deploy
  (the `home` seed has content, so it survives). Requires explicit approval;
  drop it from scope if declined — invariant is then forward-only.
- **Configured home page deleted while blank**: `GET /` already falls back to
  the index listing when the home page is missing (`pages-html.ts:214-219`) —
  same as any delete; no new handling.
- **Core memory store divergence**: dev/test fallback keeps blank pages
  in-memory (no delete, no toast). Deliberate scope call (item 8 note).
- **`WN_TEST_PG_URL` absent locally**: pg suite skips; run local validation
  with Postgres reachable per AGENTS.md; CI covers.

## Out of scope

- DB `CHECK` constraint enforcing non-blank content (breaks legitimate
  repo-level test seeds).
- Editor-side delete buttons, page history, trash/restore.
- Unconditional `DELETE /api/pages/*` route semantics (manual delete stays as
  is).
- Redesigning the general conflict UX ("keep editing after 409 overwrites").
- Auto-navigation away from deleted pages.
