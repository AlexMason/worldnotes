# Unify editor & reader, add admin settings

**Branch:** `feature/unify-editor-and-admin-settings`

## Goal

Address four pieces of feedback:

1. The seeded `home` page renders literal `\n` instead of line breaks.
2. For logged-in / `AUTH_DISABLED=1` users, the editor should *replace* the
   reader at `/{slug}` instead of living at a separate `/edit/{slug}` view.
3. The editor's look & feel must match the reader (light serif, same palette,
   same header chrome, centered column).
4. An "admin settings" area (any authenticated user) to (a) turn off search
   and (b) set a page as the default home instead of the index listing.

**Decisions locked with the user:**
- Editor **fully replaces** the reader for authenticated users (no
  preview/reader toggle). Anonymous users keep the SSR reader.
- **Any** authenticated user may access admin settings (no role system).
- "Turn off search" = hide the search UI everywhere, but leave `/search`
  functional (returns results; its own form is hidden too).
- The index listing moves to `/all`; `/` serves the configured home page (or
  the index when no home page is set).
- Editor restyle = **full parity**: viewer palette/fonts + same header chrome
  (breadcrumbs left, actions right) + centered ~46rem column.

## Approach

- **Settings** are persisted in a new `settings` table (key/value), exposed via
  a `SettingsRepository` (pg + memory, mirroring the pages pattern) and a
  `SettingsService` that caches parsed settings in memory (single-instance
  assumption, same as the render cache). Two keys: `search_enabled`
  (`"true"|"false"`, default true) and `home_slug` (`""` = unset, default).
- **Editor at `/{slug}`**: the SSR catch-all serves the editor shell (the
  existing `/edit/{slug}` SPA bootstrap) when `req.user` is present, and the
  reader otherwise. `/edit` and `/edit/{slug}` become 302 redirects to `/` and
  `/{slug}`. The client bootstrap reads the slug from `/{slug}` and pushStates
  to `/{slug}`.
- **Restyle** is a rewrite of the editor's token stylesheet plus a small DOM
  restructure (breadcrumb + actions live in one header bar) so the editor
  chrome matches `.wn-view-bar`/`.wn-crumbs`/`.wn-view-actions`.

### Caching (auth variant + settings)

- The reader and index responses gain `Vary: Cookie` (they are user-aware
  chrome today and the auth split now lives on the same URLs). The editor shell
  branch stays `no-store` and must **not** pass through `respond()`/`hashEtag`.
- Settings writes do **not** invalidate the SSR caches: `INDEX_CACHE_KEY` holds
  only the `<li>` list and `p:{slug}` holds only rendered article bytes — both
  are settings-independent. `/` reads `homeSlug` per-request and chooses
  index-vs-page; the home page reuses the existing `p:{homeSlug}` cache (already
  invalidated by page writes). Only the `SettingsService`'s own parse cache is
  refreshed on write.

## Files

### New

1. **`migrations/002_fix_home_seed.sql`** — `UPDATE pages SET content =
   replace(content, E'\\n', E'\n') WHERE slug='home'` (repairs the literal
   two-char `\n`, robust to lightly-edited home pages; no-ops on fresh DBs).
2. **`migrations/003_settings.sql`** — `CREATE TABLE settings (key TEXT PRIMARY
   KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(), updated_by
   TEXT)`.
3. **`src/server/db/settings-repository.ts`** — `SettingsRepository` interface:
   `getAll(): Promise<Record<string,string>>`, `set(key, value, by?)`,
   `destroy()`.
4. **`src/server/db/settings-pg.ts`** — Postgres implementation (upsert on
   `settings`).
5. **`src/server/db/settings-memory.ts`** — in-memory implementation for tests.
6. **`src/server/settings.ts`** — `AppSettings { searchEnabled: boolean;
   homeSlug: string | null }`; `DEFAULT_SETTINGS`; `createSettingsService(repo)`
   returning `{ get(): AppSettings; update(patch, by): Promise<AppSettings> }`.
   Normalizes/validates on both write **and** read (so a corrupt stored row
   degrades to defaults, never breaks `/`).
7. **`src/server/render/editor-shell.ts`** — `editorShellHtml(slug, opts)`
   extracted from `edit.ts`, embedding `{ slug, autosaveMs, searchEnabled,
   userName, authDisabled }` in the `wn-config` JSON.
8. **`src/server/routes/settings-api.ts`** — `PUT /api/settings` (auth +
   same-origin) only; body `{ searchEnabled?, homeSlug? }` → updated settings.
   (No `GET` — the admin form is server-rendered and the editor reads
   `searchEnabled` from the shell config; nothing fetches settings.)
9. **`src/server/routes/admin.ts`** — `GET /admin` (auth): server-rendered
   settings form (search toggle checkbox + home-slug input, current values
   pre-filled) with an inline `fetch` script that PUTs `/api/settings` and
   reloads.

### Modified

10. **`migrations/001_init.sql`** — change the `home` seed to `E'…\n…'` escape
    strings so `\n` becomes a real newline on fresh installs.
11. **`src/shared/slug.ts`** — add `all` and `admin` to
    `RESERVED_FIRST_SEGMENTS` (documented deliberate shadowing; a startup
    warning is optional).
12. **`src/shared/url-helpers.ts`** — add `slugFromPath(pathname)` (reads
    `/{slug}`, `""` → `home`); keep `pageUrlPath`; remove `slugFromEditPath` /
    `editUrlPath` and their callers.
13. **`src/server/app.ts`** — add optional `settings?: SettingsRepository` to
    `AppDeps` (defaults to memory), build the `SettingsService`, register
    `settings-api` + `admin` routes, and pass `settings.get`, `assetPrefix`,
    `autosaveMs` into the page-HTML routes.
14. **`src/server/index.ts`** — construct `createPgSettingsRepository(pool)` and
    pass it to `buildApp`.
15. **`src/server/routes/pages-html.ts`** — the core routing change:
    - `GET /` → home page when `homeSlug` is set **and the page exists**
      (render like the catch-all: reader for anon / editor for auth); else
      index listing.
    - `GET /all` → index listing (always).
    - catch-all `/*` → editor shell when `req.user`, else reader.
    - hide search form/affordances when `searchEnabled` is false.
    - refactor the page-render body into a shared helper reused by `/` and `/*`.
    - reader/index responses gain `Vary: Cookie`.
16. **`src/server/routes/edit.ts`** — `/edit` → `/` (302); `/edit/{slug}` →
    `/{slug}` (302). No shell served here anymore.
17. **`src/server/render/layout.ts`** — `searchEnabled`- and `user`-aware
    actions: Search (only when enabled), **"All pages" → `/all`**, "Admin
    settings" (when authenticated), Sign out/name; remove the now-dead
    `editSlug`/Edit action; make `searchFormHtml` conditional; update
    `CREATE_SCRIPT` post-create redirect from `/edit/` to `/{slug}` and the
    404 `returnTo` in `pages-html.ts` from `/edit/${slug}` to `/{slug}`.
18. **`src/core/editor-dom.ts`** — restructure header (`.wn-header` holds
    breadcrumb + an actions region; drop the standalone `.wn-topbar`) and
    rewrite `DEFAULT_TOKENS`/`DEFAULT_CSS` to the viewer palette (light/dark via
    `prefers-color-scheme`), serif body, ~46rem centered column, viewer-style
    header bar/crumbs/links/code/blockquote.
19. **`src/client/main.ts`** — read slug via `slugFromPath`, pushState to
    `/{slug}`, build header actions from the shell config (Search if enabled,
    **"All pages" → `/all`**, Admin settings, Sign out/name); drop the
    "← Reading view" link.

### Docs

20. **`docs/architecture.md`** — routing table (`/`, `/all`, `/admin`, editor at
    `/{slug}`, settings), storage section (`settings` table), auth/admin note.
21. **`docs/api.md`** — `PUT /api/settings`.
22. **`docs/theming.md`** — editor tokens/classes now mirror the viewer tokens;
    document the new header/actions structure.

## Steps

1. **Seed newlines** — fix `001_init.sql`; add `002_fix_home_seed.sql`
   (`replace(content, E'\\n', E'\n')`). Verify via a fresh + existing-DB
   migration run in the pg suite.
2. **Settings foundation** — `settings` table migration, repository
   (interface/pg/memory), `settings.ts` service with write+read validation, and
   unit tests (including unset/invalid `home_slug`, non-boolean
   `search_enabled`, corrupt stored row).
3. **Settings API + admin page** — `settings-api.ts` (PUT only), `admin.ts`
   with inline form script; wire into `app.ts`/`index.ts`; route tests.
4. **Reserved slugs + URL helpers** — `all`/`admin` in `slug.ts`; `slugFromPath`
   in `url-helpers.ts` + tests.
5. **Routing: editor at `/{slug}`** — `editor-shell.ts`; rewrite `edit.ts`
   redirects and `pages-html.ts` (`/`, `/all`, catch-all, search toggle,
   `Vary: Cookie`); update `app.ts` deps; update edit-routes + pages-html tests
   (redirect targets, editor-shell 200, `returnTo` assertion, `Vary` header).
6. **Layout chrome** — `layout.ts` actions (Search/All pages/Admin/sign-out),
   search-form conditional, `CREATE_SCRIPT` `/edit/`→`/{slug}`; update
   layout-dependent tests.
7. **Editor restyle** — `editor-dom.ts` header restructure + full stylesheet
   rewrite. Update **all** affected assertions: `editor-dom.test.ts` (~20 token
   names, category headers, `.wn-topbar`/`.wn-toolbar` class/ordering checks),
   `editor.test.ts` (`.wn-topbar` presence), and the mock-`EditorDOM` fixtures in
   `editor-render.test.ts`/`undo-redo-integration.test.ts`/`editor-navigation.test.ts`
   if they type against `EditorDOM`.
8. **Client bootstrap** — `main.ts` slug/history/header-actions changes.
9. **Docs + full validation** — update the three docs; run
   `typecheck → lint → test:coverage → build` (with `WN_TEST_PG_URL`).

## Risks & Resolved Questions

- ⚠️ **Auth-variant caching** — resolved: reader/index get `Vary: Cookie`;
  editor shell stays `no-store` and bypasses `respond()`.
- ⚠️ **Settings cache invalidation** — resolved: none needed for SSR caches
  (they are settings-independent); only the service's parse cache refreshes.
- ⚠️ **Reserved `all`/`admin` shadowing** — accepted as deliberate (personal
  self-hosted wiki; no such pages expected). A startup warning is optional.
- ⚠️ **Editor restyle blast radius** — step 7 enumerates every token/class/
  ordering assertion; blast radius is confined to the editor DOM tests + the
  `EditorDOM` mock fixtures.
- ✅ **Deleted home page** — if `home_slug` is set but the page is missing, `/`
  falls back to the index listing. Corrupt/invalid stored `home_slug` degrades
  to "unset" (index). Both covered by tests.
- ✅ **Unset home value** — empty/whitespace `home_slug` → `null` (unset);
  `validateSlug` only applied to non-empty values.
- ✅ **`home_slug='home'` URL ambiguity** — `/` and `/home` may render the same
  page (duplicate content); accepted. The editor's root crumb maps to page
  `home` → `/home`, consistent with the reader's Home crumb pointing at `/`.
