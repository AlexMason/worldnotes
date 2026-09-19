# Architecture

WorldNotes is a single Fastify application: a Postgres-backed pages store, an
OIDC auth layer, a server-rendered read path for anonymous visitors, and a
client-side inline markdown editor for authenticated editors.

```
Browser (anonymous)                  Browser (authenticated)
   │ GET /{slug}  (SSR, ETag)          │ GET /edit/{slug} → client bundle
   ▼                                   │ PUT /api/pages/{slug} (If-Match)
┌──────────────────────────── Fastify ────────────────────────────┐
│ markdown-it viewer ── bounded LRU + ETag                        │
│ / → index · /search/{terms} · /{slug} catch-all (registered    │
│   LAST) · 404 create overlay                                    │
│ OIDC RP (state+PKCE+nonce) ── AES-GCM cookie sessions           │
│ /api/pages CRUD ── requireAuth + same-origin ── PagesRepository │
│ @fastify/static /assets/* (dist/client)                         │
└──────────────────────────────────────────────────────────────────┘
                              │ pg pool + advisory-locked migrations
                              ▼
                        PostgreSQL `pages`
```

## Source layout

| Directory | Runs in | Purpose |
|---|---|---|
| `src/core/` | browser | The inline editor: tokenizer, edit-preview renderer, editor DOM/state/render/navigation/lifecycle, plugin registry + content plugins, `PageBuffers` (content model), `PageStore` contract |
| `src/client/` | browser | `/edit` bootstrap: `main.ts` mounts the editor over `api-page-store.ts` (fetch + versions + conflicts) |
| `src/server/` | node | Fastify app: config, auth (OIDC/sessions), DB (pool/migrations/repositories), render (markdown-it viewer, layout, title extraction), routes, LRU cache |
| `src/shared/` | both | Env-agnostic code: `slug.ts` policy, `url-policy.ts`, `url-helpers.ts`, `dto.ts` |

Boundary rules (enforced by tooling):

- `src/shared` may be imported everywhere and must touch no platform APIs
  (ESLint gives Node globals only to `src/server`; core/client tsconfigs use
  `types: []`).
- The server may import DOM-free parts of `src/core` (tokenizer, navigation).
  A node-project smoke test (`src/server/__tests__/node-smoke.test.ts`) fails
  if any top-level DOM usage creeps in.
- The **read path never uses the core editor renderers**: `renderToHTML`
  produces edit-preview markup (literal `**` markers, `data-page` spans).
  Readers get `src/server/render/markdown.ts` (markdown-it, `html:false`,
  `[[wiki-link]]` rule, task checkboxes, `rel=noopener` on external links).

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
| `GET /` | index (page list + search form island) | anon ok |
| `GET /search/{terms}` | ILIKE results | anon ok |
| `GET /edit` | → `/edit/home` | — |
| `GET /edit/{slug}` | SPA shell (+ embedded `{slug, autosaveMs}` JSON); anonymous → redirect to `/{slug}` | editors |
| `GET /{slug}` (catch-all, last) | SSR article + chrome; miss → 404 create overlay | anon ok |
| `GET /api/pages`, `GET /api/pages/{slug}` | JSON reads + ETags | anon ok |
| `POST/PUT/DELETE /api/pages[/{slug}]` | writes; `requireSameOrigin` + `requireAuth` | editors |
| `GET /oidc/login|callback|logout`, `GET /api/me` | auth | mixed |
| `GET /assets/*` | built client bundle | anon ok |
| `GET /healthz` | liveness | anon ok |

Slugs are lowercase `[a-z0-9-]` segments (`blog/post-name`), validated by a
shared `validateSlug()` **and** a DB `CHECK` constraint. Nesting is cosmetic:
no parent must exist; breadcrumbs derive from segments. First segments
`api, oidc, edit, search, assets, static, healthz, favicon.ico` are reserved.

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
renderer output (auth-independent); layout chrome is composed per request, so
ETags track article bytes and anonymous/authenticated revalidation never
diverges. Writes (any route path) invalidate `p:{slug}` and the index.
Responses carry `ETag` + `Cache-Control: public, max-age=60,
stale-while-revalidate=300`; `If-None-Match` → 304. Single-process scope.

## Database

`migrations/NNN_*.sql` applied at boot inside a transaction under
`pg_try_advisory_lock` (concurrent boots safe), tracked in
`schema_migrations`. `001_init.sql` creates `pages(slug UNIQUE CHECK, title,
content, version, created_at, updated_at, updated_by)` + index on
`updated_at DESC` and seeds the `home` page. `PagesRepository` has two
implementations: `pages-pg` (production) and `pages-memory` (tests); route
tests run against memory, CI also runs the pg suite against a service
container (`WN_TEST_PG_URL`).

## Test projects

Vitest projects: `dom` (happy-dom — core/client) and `node` (server/shared).
Coverage thresholds (80 %) include server modules; only bootstrap/composition
roots and type-only files are excluded (`vitest.config.ts`).

## Security posture (read path)

- markdown-it `html:false` — author HTML is escaped, never emitted
- shared `url-policy` scheme allowlist (`http/https/mailto` + relative/same-origin)
  applied to link hrefs, wiki-link generation, and linkify
- `rel="noopener noreferrer nofollow"` on external links
- cookie sessions encrypted (no claim leakage), SameSite=Lax + origin checks
  for state-changing API calls
- slug validation everywhere (URL, body, DB CHECK); ETag/304 without
  per-user variance
