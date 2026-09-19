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

| Directory | Runs in | Purpose |
|---|---|---|
| `src/core/` | browser + node | The ONE render engine: tokenizer, content plugins (each with an interactive `render()` and a static `renderToHTML()`), interactive DOM renderer (`renderer.ts`) + DOM-free static renderer (`static-renderer.ts`, used by the SSR read path), editor DOM/state/render/navigation/lifecycle, plugin registry, `PageBuffers` (content model), `PageStore` contract, editor stylesheets (`styles.ts`) |
| `src/client/` | browser | Editor bootstrap: `main.ts` mounts the editor over `api-page-store.ts` (fetch + versions + conflicts) and builds the header actions (Search / All pages / Admin / sign-out) |
| `src/server/` | node | Fastify app: config, auth (OIDC/sessions), DB (pool/migrations/repositories), render (reader adapter over core static renderer, layout, title extraction), routes, LRU cache |
| `src/shared/` | both | Env-agnostic code: `slug.ts` policy, `url-policy.ts`, `url-helpers.ts`, `dto.ts` |

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
  `wn-punct` markers, literal markdown source. Grammar lives only in
  `src/core/plugins/`; cross-surface structural parity (with the documented
  internal span→anchor divergence) is pinned by
  `src/core/__tests__/surface-parity.test.ts`.

## Content model & save flow

The editor holds whole-document strings per page in `PageBuffers`
(`Map<slug, string>` + per-page `EditorHistory` snapshot stacks; the loaded
state is the undo baseline). DOM input events extract raw markdown
(`extractContentText`, honoring plugin `data-raw` boundaries) and replace the
buffer. Debounced autosave calls `PageStore.save(page, content)`; the HTTP
store PUTs `{content}` with `If-Match: "<version>"` and handles 409 (conflict
toast with *Load theirs*), 404 (create-on-save), and 401 (auth-expired toast).
Undo granularity is per input batch (snapshot), not per character — an
accepted trade-off after removing Yjs.

## Routing

Public, no query strings anywhere:

| Route | Handler | Auth |
|---|---|---|
| `GET /` | configured home page, else the index listing | anon ok |
| `GET /all` | index (page list + search form island) | anon ok |
| `GET /search`, `GET /search/{terms}` | search form + ILIKE results | anon ok |
| `GET /admin` | settings form (search toggle, home page) | editors |
| `GET /edit`, `GET /edit/{slug}` | legacy 302s → `/`, `/{slug}` | — |
| `GET /{slug}` (catch-all, last) | editor shell (auth) / SSR article (anon); miss → 404 create overlay | mixed |
| `GET /api/pages`, `GET /api/pages/{slug}` | JSON reads + ETags | anon ok |
| `POST/PUT/DELETE /api/pages[/{slug}]` | writes; `requireSameOrigin` + `requireAuth` | editors |
| `PUT /api/settings` | instance settings write; `requireSameOrigin` + `requireAuth` | editors |
| `GET /oidc/login|callback|logout`, `GET /api/me` | auth | mixed |
| `GET /assets/*` | built client bundle | anon ok |
| `GET /healthz` | liveness | anon ok |

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
URLs), so ETags track article bytes and anonymous/authenticated revalidation
never diverges. Writes (any page route) invalidate `p:{slug}` and the index.
Settings are read per-request (cached in the `SettingsService`); they do not
invalidate the SSR caches because the cached entries are settings-independent.
Responses carry `ETag` + `Cache-Control: public, max-age=60,
stale-while-revalidate=300`; `If-None-Match` → 304. Single-process scope.

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
  for every `"`-delimited attribute); author HTML is never emitted
- scheme-based link classification (`src/core/plugins/link.ts`) with the shared
  `url-policy` allowlist (`http/https/mailto` + relative/same-origin); unsafe
  and unfoldable targets render as escaped literal source, never anchors
- `target=_blank` + `rel="noopener noreferrer nofollow"` on external http(s)
  links; internal anchors ride on `validateSlug`'s charset (AGENTS.md warning)
- cookie sessions encrypted (no claim leakage), SameSite=Lax + origin checks
  for state-changing API calls
- slug validation everywhere (URL, body, DB CHECK); ETag/304 without
  per-user variance
