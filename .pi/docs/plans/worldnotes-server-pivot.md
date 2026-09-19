# Plan: WorldNotes — Client Library → Authenticated Server (CMS pivot) — rev 3

**Date:** 2026-09-19 (UTC) — rev 3 after dual review + user decisions (rev 3: nested-slug routing)
**Branch:** `feature/server-pivot`
**Status:** Revised (pending user approval)

## Goal

Transform WorldNotes from a publishable client-side collaborative editor library into a
single self-hosted server application: anonymous visitors get **cached, server-rendered
read-only semantic HTML**; users authenticated via **generic OIDC** get the existing
inline Markdown editor with **debounced autosave**. Multiplayer/Yjs is removed entirely.

## Decisions (interview + review adjudication — do not re-litigate)

| Area | Decision |
|------|----------|
| Collaboration | **Removed.** No Yjs, no WebSockets, no awareness/remote cursors. |
| Content store | **PostgreSQL** — `pages` table, Markdown text. No revision history. |
| Save model | Debounced autosave (default 1.5 s idle, env-configurable); save = live. **Optimistic concurrency (If-Match/409) is REQUIRED in v1** — promoted from stretch goal after review flagged silent-edit-clobbering as a launch correctness bug. |
| Viewer experience | **markdown-it (+ custom `[[wikilink]]` rule, `html:false`) rendered HTML**, cached: bounded LRU + ETag/`Cache-Control`. Decided rev 2: the existing plugin `renderToHTML` outputs an *edit-preview* (literal `**`/`#` markers, `data-page` spans with no `href`) — it is **not** reused for the read path. |
| Auth | Generic OIDC via `openid-client` v6: discovery, **state + PKCE + nonce**, `iss`/`aud` validation. Any authenticated user may edit. Identity = `sub` claim. |
| Search | v1: simple `ILIKE` on slug/title/content; public route `GET /search/{terms}` (no `?q=` anywhere), search box on index navigates there. |
| Deployment | Dockerfile + docker-compose (app + Postgres) in scope. |
| Packaging | Fold into one app; drop npm exports/`dist/` (un-commit `dist/`, gitignore it). |
| Framework | Node + Fastify, TypeScript, `tsx` dev. Single-process assumption documented (in-memory caches); horizontal scaling out of scope. |
| Wiki features | **Nested slugs ARE the URLs**: every page has a globally-unique slug (`blog/post-name`) served directly at `GET /{slug}` — no `/p/` prefix, no query strings on public routes. `[[Blog Post]]` → `/blog-post` via a shared `slugify()`. Missing slug → 404 with **create** overlay prefilled with that slug. Slugs are lowercase `[a-z0-9-]` segments (DB CHECK-enforced); titles keep case and are separate. Reserved first segments: `api oidc edit search assets static healthz`. |
| Hierarchy | Slug nesting is cosmetic: `/blog/post` does not require a `/blog` parent page to exist; no tree table, breadcrumb from slug segments. |
| Editor UI | Keep inline editor as authenticated edit surface. |
| 403 page | **Dropped** — after removing storage-adapter `PermissionError` there is no producer; unauthenticated writes get `401` JSON. |

## Architecture Overview

```
Browser (anonymous)                 Browser (authenticated)
   │ GET /{slug}  (SSR, ETag)         │ GET /edit/{slug} (SPA shell) + /api/**
   ▼                                   ▼
┌────────────────────────────── Fastify ──────────────────────────────┐
│ read render: markdown-it + wikilink rule → bounded LRU + ETag       │
│ OIDC: /oidc/login|callback|logout → signed cookie session           │
│ /api/pages/** (writes: auth + If-Match/409) → PagesRepository       │
│ static client bundle (Vite)              → PostgreSQL               │
└──────────────────────────────────────────────────────────────────────┘
```

Repo layout after the pivot:

```
src/
  core/       # editor* , tokenizer, renderer (edit-view), caret-offset, cursor,
              #   navigation, notifications, plugin registry + content plugins
  client/     # main.ts — mounts editor, autosave+conflict UI, auth-aware chrome
  server/
    app.ts        # buildApp(deps) — Fastify factory (tests via app.inject)
    index.ts      # bootstrap: env, pg pool, migrate, listen
    config.ts     # zod-validated env
    db/
      pool.ts migrate.ts        # pg Pool; numbered .sql runner under
                                #   pg_try_advisory_lock (concurrent-boot safe)
      pages-pg.ts pages-memory.ts
    auth/
      oidc.ts session.ts        # discovery+code flow+nonce; cookie session
    render/
      markdown.ts               # markdown-it env: html:false, wikilink inline
                                #   rule, task-checkbox rule, URL-scheme allowlist
    routes/
      pages-api.ts pages-html.ts status.ts
    cache.ts        # bounded LRU (max entries + TTL), version-invalidated;
                    #   index page cached under '__index__' key, evicted on write
  shared/     # dto.ts (PageDto, MeDto), slugify.ts, url-policy.ts (scheme allowlist,
              #   same-origin redirect validation)
migrations/001_init.sql
Dockerfile docker-compose.yml .env.example
```

**Data model:**

```sql
CREATE TABLE pages (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE        -- nested, e.g. 'blog/post-name'
                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  title       TEXT NOT NULL,              -- display title, case kept; derived from first
                                          --   '# heading' via TOKENIZER, else create-form name
  content     TEXT NOT NULL DEFAULT '',
  version     BIGINT NOT NULL DEFAULT 1,     -- bumped per save → ETag/If-Match basis
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT                           -- OIDC sub (display name resolved client-side)
);
```

No revisions. **Conflict semantics:** `PUT` requires `If-Match: "<version>"`;
mismatch → `409` + current `{version}`; client shows conflict toast: *Reload theirs*
(discards local buffer) or *Overwrite* (PUT with fresh version). Full-content PUT only.

**Render cache:** LRU keyed by slug: `{html, version, etag}`; `maxEntries` (default 200)
+ TTL (default 55 s, < `Cache-Control max-age=60`); writes bump version and evict the
page + `__index__`. Responses: `ETag`, `Cache-Control: public, max-age=60,
stale-while-revalidate=300`. Anonymous hot reads never touch Postgres.

**Session handling:** signed httpOnly cookie (`@fastify/secure-session` sodium
secretbox — encrypted, not just base64-visible; or signed-cookie fallback) holding
`{sub, email, name, exp}`; `SameSite=Lax; Secure` (prod), 8 h `maxAge`, re-issue on
login; `SESSION_SECRETS` comma list for rotation (encrypt with first, try all);
logout clears cookie + provider end-session when advertised. CSRF: SameSite=Lax
blocks cross-site state-change; additionally `@fastify/csrf-prevention` origin check
on non-GET `/api/**`. `AUTH_DISABLED=1` dev fake-user, refused when `NODE_ENV=production`.

**Security (viewer XSS):** markdown-it `html:false` escapes raw HTML; wikilink and
`linkPlugin`/autolink hrefs pass through shared `url-policy.ts` allowlist
(`http: https: mailto:` + same-origin absolute paths + relative); `javascript:`/`data:` → rendered
as text. Applied to read-path AND the editor's link-render plugins; tested.

**Routing (rev 3 — nested slugs, zero public query strings):**
- `GET /{slug}` → SSR page (catch-all Fastify wildcard route registered **last**, after
  static/api/oidc/edit/search) · `GET /` → index (page list, cached under `__index__`)
- `GET /search/{terms}` → ILIKE results page (URL-decoded, re-escaped for display)
- `GET /edit/{slug}` → SPA shell (unauthenticated → read-only + login CTA)
- `GET/PUT/DELETE /api/pages/{slug}` · `GET /api/pages` (list) · `GET /api/search/{terms}`
  — writes auth-only (401 JSON), `If-Match`/409 on PUT
- `GET /oidc/login|callback|logout`, `GET /api/me`
- post-callback redirect target validated same-origin (open-redirect guard)
- missing `/{slug}` → 404 page with **create** overlay → `/edit/{slug}` after auth
- **Slug creation rule:** `src/shared/slugify.ts` — NFKD transliterate, lowercase,
  non-alphanumerics → `-`, collapse repeats, trim `-`; source = create-form title or
  wiki-link text (`[[Blog/Post One]]` → `/blog/post-one`). Collision at POST → auto `-2`
  suffix; slug field editable in the create overlay. Empty slug after folding (emoji/CJK
  titles) → slug must be typed manually (validated). Repository API: `get(slug)`,
  `list()`, `search(terms)`, `put(slug, {title, content, ifMatch})`, `delete(slug)`.

## De-Yjs design (the real work — verified against source)

Write-path survey: all DOM→text sync goes through `yDocState.getPage(p)` with
**whole-document reads/writes only** (`.toString()`, `.delete(0,len)`, `.insert(0,text)`
at `editor-lifecycle.ts:151-160,296-301`, `editor-render.ts:54,117,142`,
`editor-navigation.ts:54,88,131`) plus `options.onSave?.(page, ytext.toString())`
(`:110` — already the save hook; reuse it).

1. **Replace `YDocState` with `PageBuffers`** (`src/core/page-buffers.ts`):
   `Map<string, string>` page cache — `getPage/setPage/hasPage/getWorld` +
   `onChange(page)` + dirty tracking. Same façade surface the three call sites use.
2. **Undo/redo rebuild:** live undo is `Y.UndoManager` (`editor-lifecycle.ts:332`);
   `EditorHistory` is dead code. Wire `EditorHistory` (snapshot-per-batch) into the
   lifecycle's existing input handlers: push before each mutation batch (debounced
   grouping), `undo()/redo()` restore via `PageBuffers.setPage` + re-render + caret
   restore (existing `caret-offset` helpers). Known semantic downgrade (coarser
   granularity) — accepted, documented.
3. **Keep + rename `awareness-cursor.ts` → `caret-offset.ts`** (zero Yjs imports;
   `getLineOffset`/`setLineOffset` are load-bearing for caret preservation — deleting
   it breaks local editing; both reviewers flagged my rev-1 claim as an error).
   Delete only its *awareness/remote-cursor* consumers.
4. **`editor-navigation.ts` rewrite:** `storage.get()`/`PermissionError` flow → async
   `GET /api/pages/{slug}` (404 → create overlay; no more 403). Status-page materialization
   via `PageBuffers`. The legacy `?path=` query-trail URL scheme (`encodePathSearch`/
   `decodePathSearch` in `navigation.ts`) is replaced by real `/{slug}` paths + breadcrumb
   derived from slug segments.
5. **`types.ts` plugin contract change (deliberate, breaking):** drop `EditorContext.getDoc`,
   `StorageAdapter`, `PermissionError`, `syncProvider` option, awareness typings. AGENTS.md's
   "preserve plugin contract" rule and `docs/api.md` updated accordingly (library is gone).
6. **`plugins/listItem.ts`:** replace `import type * as Y from 'yjs'` + mutations with
   `PageBuffers` line ops (it also uses `getLineOffset` — preserved via rename).

## Files

### Deletions
1. `src/y-doc-state.ts` `src/yjs-storage-bridge.ts` `src/plugins/remoteCursors.ts`
   `src/plugins/importExport.ts` `src/export-import.ts` `src/storage/**` — plus their
   tests (`remote-cursors` `storage` `export-import` `importExport-plugin`).
2. `src/server/index.ts` (old WS sync server).
3. `dist/` from git (+ `.gitignore` entry, AGENTS.md repo-notes rewrite); `demo/demo.ts`
   `demo/demo.js` + root `index.html` replaced by `src/client/` + SSR at step 8.
4. Tests **rewritten, not deleted** (rev-1 omission): `editor-navigation` `plugins`
   `undo-redo-integration` `editor` `editor-render` `editor-state` `editor-lifecycle`
   `listItem` — re-targeted at `PageBuffers`/`EditorHistory`/API-backed navigation.
   `awareness-cursor.test.ts` → renamed with its module.

### New
5. `src/core/page-buffers.ts` · `src/server/**` as laid out · `src/shared/{dto,url-policy}.ts`
   · `migrations/001_init.sql` · `src/client/main.ts` · `vite.client.config.ts`
   · `Dockerfile` `docker-compose.yml` `.env.example`.
6. Tests: `page-buffers` `editor-history integration (mount→type→undo→onSave)`
   `server/routes` `render/markdown` `cache` `auth` (mocked issuer via `nock`-free
   fetch stub) `pages-memory repo` + CI `pg` service smoke test (migrate + CRUD) via
   postgres container.

### Modified
7. `package.json` — scripts (`dev`, `dev:server`, `build` = `tsc -b && vite build
   --config vite.client.config.ts`, `start`); deps `+fastify @fastify/cookie
   @fastify/static @fastify/secure-session openid-client pg markdown-it zod
   @types/node @types/pg @types/markdown-it` ; `-yjs -y-protocols -y-websocket
   -y-leveldb -ws -jszip -@types/ws -fake-indexeddb -vite-plugin-dts` (lib0 note
   corrected: transitive only).
8. **tsconfig split:** `tsconfig.base.json` + `tsconfig.core-client.json` (lib DOM)
   + `tsconfig.server.json` (`types:["node"]`) + root `tsconfig.json` referencing
   (`tsc -b`) so the per-step `npm run typecheck` covers both worlds.
9. `vitest.config.ts` — projects: `node` env for `src/server/__tests__`, `happy-dom`
   for core/client; coverage `include src/**` **minus** `server/index.ts` bootstrap +
   `client/main.ts` + `shared/dto.ts` — i.e. server business modules ARE covered.
10. `eslint.config.mjs` (node vs browser globals per dir), `.github/workflows/ci.yml`
    (unchanged steps + pg service for smoke test), `index.html` → SSR template,
    README/docs rewrite, `.planning/{PROJECT,REQUIREMENTS,STATE}.md` archived + rewritten
    for the server model (rev-1's "marked at pivot" deemed too thin).

## Steps

Gate after every step: `typecheck (both configs) → lint → test` green, then commit.

1. **Deps + tsconfig/vitest/eslint scaffolding** (no behavior change; old code still builds).
2. **Content model swap:** `PageBuffers` replaces `YDocState` (call sites listed above);
   delete Yjs files + `remoteCursors`/`importExport`/`export-import`/`storage/**`;
   rename `awareness-cursor`→`caret-offset`; strip `getDoc`/`StorageAdapter` from
   `types.ts`; rewrite affected tests. Commit series per module; end with full suite green.
3. **Undo rebuild:** `EditorHistory` wired into lifecycle; `undo-redo-integration` test
   rewritten on buffer+history semantics; mount→edit→undo→autosave integration test added
   (happy-dom, fake timer for debounce) — this is the step-2/3 integration gate the
   review said was missing.
4. **Core relocation** to `src/core/` + import path sweep + Node-import smoke test
   (tokenizer alone is DOM-free; markdown-it doesn't need the plugin renderers — smoke
   test asserts nothing DOM-touching is imported by `server/render`).
5. **Server skeleton:** config, app factory, `/healthz`, static, `pg` pool, advisory-locked
   migration runner, `pages-pg`/`pages-memory`; pg smoke test against CI postgres service.
6. **OIDC auth + session + URL policy** (mocked issuer; cookie encrypt/rotate; 401 guard;
   `AUTH_DISABLED`; origin-check CSRF; open-redirect guard).
7. **Pages API + search:** CRUD by slug, slug validation (regex + reserved first segments),
   version bumping, `If-Match`/409, ILIKE search endpoint, slugify + collision suffixes,
   title-from-tokenizer extraction; route tests via `app.inject` + memory repo.
8. **Read path:** `render/markdown.ts` (md-it + wikilink + checkbox + URL policy), LRU cache
   + ETag, catch-all `/{slug}` SSR route (registered last), `/` index, `/search/{terms}`,
   404 create overlay (prefilled slug), status page wiring; SSR snapshot tests; XSS scheme tests.
9. **Client wiring:** `/edit/{slug}` shell + `main.ts`: load via API, mount editor over
   `PageBuffers`, debounced `PUT` with If-Match, conflict toast, save indicator, wiki
   links → real `/{slug}` paths (catch-all route + slugify shared with server), login/logout
   chrome, read-only anonymous mode; delete demo + `?path=` URL sync helpers.
10. **Docs, Docker, polish:** README/docs/api/architecture/theming rewrite, AGENTS.md
    command table + repo notes (dist), `.planning` reconcile, Dockerfile/compose/`.env.example`,
    full `typecheck lint test:coverage build` + manual `AUTH_DISABLED=1` smoke vs local pg.

## Risks & remaining questions

- ⚠️ **Step 2+3 are a content-model replacement + undo rebuild + caret-layer preservation**,
  explicitly NOT a light refactor (rev-1 mis-scoped). Mitigation: write-path survey above
  shows a narrow whole-doc façade; integration gate at step 3; per-module commits.
- ⚠️ **Two renderers, one format** (editor tokenizer vs markdown-it read path): syntax
  supported by the editor must have viewer parity (headings/bold/code/~~strike~~/lists/
  checkboxes/wikilinks/links). Mitigation: parity snapshot fixtures (same Markdown in,
  sane HTML out) in step 8; exotic future blocks need md-it rules.
- ⚠️ **markdown-it wikilink/checkbox rules** are custom inline/block rules — pin version,
  unit-test escaping of titles containing `]]`/HTML.
- ⚠️ **`openid-client` v6** API churn: pin exact version; all auth tests against mocked
  discovery document; CI has no network dependency.
- ⚠️ **Coarser undo** post-Yjs (snapshot batching) — accepted per single-editor decision;
  revisit if annoying in practice.
- ⚠️ **Single process** assumption for caches; documented in README (multi-instance needs
  Redis/PG-notify — future work).
- ❓ Autosave default 1.5 s (env `AUTOSAVE_DEBOUNCE_MS`) — shout if you want different.
- ❓ Seed `Home` page on first migration (slug `home`? user-facing alias `/Home` — see
  rev-3 note: slug is `home`, title `Home`) — assumed yes.
- ⚠️ **Slugify lossy for non-Latin titles** (CJK/emoji → empty). Mitigation: manual slug
  entry in create overlay is mandatory when fold yields empty; wiki-link resolution uses
  the same fold, so `[[中文]]` links simply never match until created with an explicit slug.

## Review feedback adjudication (rev 1 → rev 2)

**rev 3 (user routing directive):** dropped `?path=`/`?q=` query-string routing and the
`/p/` prefix entirely — pages live at their nested slug (`/blog/post-name`), search at
`/search/{terms}`, edit at `/edit/{slug}`; API takes the slug as a path segment. Slug
charset/validation, slugify + collision rules, reserved segments, catch-all-last ordering,
and non-Latin slugify risk added.

**Fixed as directed:** keep/rename `awareness-cursor` (B1 both); undo is active re-plumb
(B2); read path = markdown-it, not plugin edit-renderers (B3, user-approved); PageBuffers
façade replaces false "line array already exists" premise (codebase B1); `editor-navigation`
added to scope (M1 both); full test-rewrite list (M3); If-Match/409 promoted to required
(M1 arch); session/CSRF/nonce/expiry/rotation spec (M2/M3 arch); LRU bound + index key +
single-process note (M4 arch); tsconfig split + @types/node + vitest projects + coverage
policy (M5/M6 both, m-cov); pg CI smoke + advisory lock (M6 arch); integration gate moved
into steps 3/5 (M7); dist/ un-committed; contract break declared; 403 dropped; path case
preserved; lib0/fake-indexeddb/vite-plugin-dts dep corrections; `.planning` reconcile;
demo/ files named; onSave reuse; title-via-tokenizer.
