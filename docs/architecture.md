# Architecture

WorldNotes is a single Fastify application: a Postgres-backed pages store, an
OIDC auth layer, a server-rendered read path for anonymous visitors, and a
client-side inline markdown editor that **replaces** the read view for
authenticated editors (the editor lives at `/{slug}` too).

```
Browser (anonymous)                  Browser (authenticated)
   │ GET /{slug}  (SSR, ETag)          │ GET /{slug} → client editor bundle
   ▼                                   │ PUT /api/pages/{slug} (If-Match)
┌──────────────────────────── Fastify ────────────────────────────┐
│ core static renderer (SSR) ── bounded LRU + ETag                │
│ / → home|index · /all · /search/{terms} · /{slug} catch-all    │
│   (editor for auth, registered LAST) · 404 create overlay      │
│ OIDC RP (state+PKCE+nonce) ── AES-GCM cookie sessions           │
│ /api/pages CRUD ── requireAuth + same-origin ── PagesRepository │
│ /api/settings ── SettingsRepository ── key/value table          │
│ @fastify/static /assets/* (dist/client)                         │
└──────────────────────────────────────────────────────────────────┘
                              │ pg pool + advisory-locked migrations
                              ▼
                     PostgreSQL `pages`, `settings`
```

## Source layout

| Directory     | Runs in        | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`   | browser + node | The ONE render engine: line tokenizer + document-level **block pass** (`document.ts` — fenced code, pipe tables as multi-line regions), content plugins (each with an interactive `render()` and a static `renderToHTML()`; block plugins add a declarative `BlockDef`), interactive DOM renderer (`renderer.ts`/`line-renderer.ts`) + DOM-free static renderer (`static-renderer.ts`, used by the SSR read path), shared DOM↔source text model (`content-text.ts`), editor DOM/state/render/navigation/lifecycle, plugin registry, `PageBuffers` (content model), `PageStore` contract, editor stylesheets (`styles.ts`) |
| `src/client/` | browser        | Editor bootstrap: `main.ts` mounts the editor over `api-page-store.ts` (fetch + versions + conflicts) and builds the header actions (Search / All pages / Admin / sign-out)                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/server/` | node           | Fastify app: config, auth (OIDC/sessions), DB (pool/migrations/repositories), render (reader adapter over core static renderer, layout, title extraction), routes, LRU cache                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/shared/` | both           | Env-agnostic code: `slug.ts` policy, `url-policy.ts`, `url-helpers.ts`, `dto.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Boundary rules (enforced by tooling):

- `src/shared` may be imported everywhere and must touch no platform APIs
  (ESLint gives Node globals only to `src/server`; core/client tsconfigs use
  `types: []`).
- The server may import DOM-free parts of `src/core` (tokenizer, navigation).
  A node-project smoke test (`src/server/__tests__/node-smoke.test.ts`) fails
  if any top-level DOM usage creeps in.
- **Single renderer:** the read path IS the core engine —
  `src/server/render/reader.ts` wraps `renderDocumentHtml` from
  `src/core/static-renderer.ts` (import it directly, never the core barrel).
  Reader output is the editor's shape: `div[data-line]` lines, dimmed
  `wn-punct` markers, literal markdown source; multi-line blocks arrive as
  `div.{wrapperClass}[data-block]` regions grouped generically by both
  renderers (plugins declare detection + metadata via `BlockDef` — there are
  no structural render hooks, so `data-line`/`<br>` emission lives in exactly
  one place per surface). Grammar lives only in `src/core/plugins/` and the
  block pass (`src/core/document.ts`); cross-surface structural parity is
  pinned by `src/core/__tests__/surface-parity.test.ts` with ONE structural
  divergence (internal links: span in the editable DOM, anchor statically)
  plus CSS-only collapsed styling shared by both surfaces (hidden image
  source/pipes, hairline separators) and the editor-only `data-expanded`
  marker — the parity harness compares collapsed trees, so display states
  cannot hide structural drift.
- **Admin-trusted HTML is the one raw sink:** the `headerHtml`/`footerHtml`
  settings are emitted verbatim — on the read path by `render/layout.ts`
  inside `<main>`, and in the editor via the config embedded by
  `render/editor-shell.ts`, which the client injects with `insertSiteBands`
  (`src/core/editor-dom.ts`) around the content column. Everything else on
  the read path is escaped or safety-gated inside the plugins (href/src
  policy, no raw-HTML markdown plugin); these bands are deliberately outside
  that invariant and writable only via `PUT /api/settings` (authenticated —
  see `docs/api.md` trust model). The `/admin` page omits the bands so
  broken branding can never hide the recovery form.
- **Text fidelity:** region lines render byte-exact DOM text — fences, pipes
  and separator dashes stay present as text (dimmed/zero-sized by CSS), so
  `extractContentText` round-trips with no `data-raw` on lines. `data-raw`
  belongs to token spans only (wiki links, list bullets, where display
  glyphs may differ from source). `content-text.ts` is the single
  implementation of this mapping for BOTH input serialization and caret
  math; the corpus property test (`content-text.test.ts`) asserts
  `extract(render(doc)) === doc`.
- **Tables are flex divs, not `<table>`:** `.wn-table-row{display:flex}` +
  `flex:1 1 0` cells. Chosen over `display:table` (anonymous-cell layout
  jumps when a row expands to raw text mid-edit; contenteditable-in-table
  caret quirks) and real `<table>` tags (the HTML parser drops stray `<tr>`
  in the string path; semantic-HTML was ruled out by the reader==editor
  decision). Columns are equal-width; sizing is out of scope.

## Content model & save flow

The editor holds whole-document strings per page in `PageBuffers`
(`Map<slug, string>` + per-page `EditorHistory` snapshot stacks; the loaded
state is the undo baseline). DOM input events extract raw markdown
(`extractContentText`, honoring plugin `data-raw` boundaries) and replace the
buffer. Debounced autosave calls `PageStore.save(page, content)`; the HTTP
store PUTs `{content}` with `If-Match: "<version>"` and handles 409 (conflict
toast with _Load theirs_), 404 (create-on-save), and 401 (auth-expired toast).
Undo granularity is per input batch (snapshot), not per character — an
accepted trade-off after removing Yjs.

## Routing

Public, no query strings anywhere:

| Route                                     | Handler                                                             | Auth                   |
| ----------------------------------------- | ------------------------------------------------------------------- | ---------------------- | ---- | ----- |
| `GET /`                                   | configured home page, else the index listing                        | anon ok                |
| `GET /all`                                | index (page list + search form island)                              | anon ok                |
| `GET /search`, `GET /search/{terms}`      | search form + ILIKE results                                         | anon ok                |
| `GET /admin`                              | settings form (search, home page, branding; bands omitted)          | editors                |
| `GET /edit`, `GET /edit/{slug}`           | legacy 302s → `/`, `/{slug}`                                        | —                      |
| `GET /{slug}` (catch-all, last)           | editor shell (auth) / SSR article (anon); miss → 404 create overlay | mixed                  |
| `GET /api/pages`, `GET /api/pages/{slug}` | JSON reads + ETags                                                  | anon ok                |
| `POST/PUT/DELETE /api/pages[/{slug}]`     | writes; `requireSameOrigin` + `requireAuth`                         | editors                |
| `PUT /api/settings`                       | instance settings write; `requireSameOrigin` + `requireAuth`        | editors                |
| `GET /oidc/login                          | callback                                                            | logout`, `GET /api/me` | auth | mixed |
| `GET /assets/*`                           | built client bundle                                                 | anon ok                |
| `GET /healthz`                            | liveness                                                            | anon ok                |

Slugs are lowercase `[a-z0-9-]` segments (`blog/post-name`), validated by a
shared `validateSlug()` **and** a DB `CHECK` constraint. Nesting is cosmetic:
no parent must exist; breadcrumbs derive from segments. First segments
`api, oidc, edit, search, assets, static, healthz, favicon.ico, all, admin`
are reserved.

## Auth

Generic OIDC authorization-code flow via `openid-client` v6: discovery,
`state` + PKCE (S256) + `nonce` (ID-token replay binding); `iss`/`aud`
validation by the library; `sub` is the stable identity stored in the session
and on rows (`updated_by`). Sessions are AES-256-GCM sealed cookies
(encrypted, httpOnly, SameSite=Lax, `Secure` in prod, exp enforced, multi-key
rotation). Callback `returnTo` is restricted to same-origin app paths
(open-redirect guard). `AUTH_DISABLED=1` injects a dev identity and refuses to
boot in production.

## Caching

`src/server/cache.ts`: bounded LRU (max entries + TTL). Page entries store
renderer output (auth-independent); layout chrome is composed per request and
responses carry `Vary: Cookie` (the editor/reader split now lives on the same
URLs), so ETags track article bytes **plus a settings revision** — branding
(`siteName`/`headerHtml`/`footerHtml`) and nav toggles re-render the chrome on
every request, and the revision stamp ensures a settings change busts browser
revalidation instead of 304-ing stale chrome indefinitely. Writes (any page
route) invalidate `p:{slug}` and the index. Settings are read per-request
(cached in the `SettingsService`); changing them leaves the article caches
intact (they stay settings-independent) but advances the revision mixed into
every ETag. Responses carry `ETag` + `Cache-Control: public, max-age=60,
stale-while-revalidate=300`; `If-None-Match` → 304. Single-process scope —
with multiple server instances, each process caches settings in memory and
revisions diverge; branding on every page makes that failure mode visible.

## Database

`migrations/NNN_*.sql` applied at boot inside a transaction under
`pg_try_advisory_lock` (concurrent boots safe), tracked in
`schema_migrations`. `001_init.sql` creates `pages(slug UNIQUE CHECK, title,
content, version, created_at, updated_at, updated_by)` + index on
`updated_at DESC` and seeds the `home` page (fixed in `002` to store real
newlines); `003_settings.sql` adds a `settings(key PK, value, updated_at,
updated_by)` key/value table for instance settings. `PagesRepository` and
`SettingsRepository` each have two implementations (`-pg` production, `-memory`
tests); route tests run against memory, CI also runs the pg suite against a
service container (`WN_TEST_PG_URL`).

## Test projects

Vitest projects: `dom` (happy-dom — core/client) and `node` (server/shared).
Coverage thresholds (80 %) include server modules; only bootstrap/composition
roots and type-only files are excluded (`vitest.config.ts`).

## Security posture (read path)

- source-based rendering — all text and attribute positions pass through the
  shared escapers (`src/core/escape.ts`: `escapeHTML` for text, `escapeAttr`
  for every `"`-delimited attribute); author HTML is never emitted —
  including inside verbatim fence lines and table cells (B4 vectors, pinned
  by reader fixtures)
- scheme-based link classification (`src/core/plugins/link.ts`) with the shared
  `url-policy` allowlist (`http/https/mailto` + relative/same-origin); unsafe
  and unfoldable targets render as escaped literal source, never anchors
- image srcs pass a NARROWER policy (`isSafeImageUrl`: no `mailto:`, no
  `data:`); BOTH policies resolve relative forms against a fake base and
  reject backslashes outright — Node and browsers disagree on `\evil.com\x`
  (path vs origin escape), the browser is the threat model
- no CSP is emitted by the server yet (deliberate: self-hosted scope);
  images carry `referrerpolicy="no-referrer"` because allowlisted external
  `src`s make anonymous readers fire third-party requests
- `target=_blank` + `rel="noopener noreferrer nofollow"` on external http(s)
  links; internal anchors ride on `validateSlug`'s charset (AGENTS.md warning)
- cookie sessions encrypted (no claim leakage), SameSite=Lax + origin checks
  for state-changing API calls
- slug validation everywhere (URL, body, DB CHECK); ETag/304 without
  per-user variance
