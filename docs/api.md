# HTTP API & Configuration

WorldNotes is a server application (not a library): the API below is the
contract between the built-in edit client and the server, and is stable enough
for custom tooling. There is no published npm package anymore.

## Authentication

- `GET /oidc/login[?returnTo=/app/relative/path]` — 302 to the provider
  (authorization-code flow with `state`, PKCE S256, `nonce`).
- `GET /oidc/callback` — provider redirect target; on success issues the
  session cookie and 302s to the sanitized `returnTo` (or `/`). Missing
  pending state → 400 JSON; verification failures → an HTML page (401)
  naming the provider/verification error, with the full error logged at
  error level.
- `GET /oidc/logout` — clears the session cookie; 302 to the provider
  end-session URL when advertised, else `/`.
- `GET /api/me` — `{ user: { sub, email?, name? } }` or 401.

The session is an AES-256-GCM encrypted httpOnly cookie (`wn_session`,
SameSite=Lax, `Secure` in production, `SESSION_MAX_AGE_SECONDS`). Any
authenticated OIDC account may edit.

## Pages

Reads are public (cached); writes require the session cookie **and** a
same-origin `Origin` (CSRF guard) and are rate-unlimited but size-capped.

| Verb | Path | Auth | Notes |
|---|---|---|---|
| `GET /api/pages[?q=&limit=]` | — | no | list/search (ILIKE), newest first, default limit 100 |
| `GET /api/pages/{slug}` | — | no | `{slug,title,content,version,updatedAt,updatedBy}` + `ETag` |
| `POST /api/pages` | editor | body `{slug, title?, content?}`; title defaults to the first `#` heading, else humanized slug; 409 on exists |
| `PUT /api/pages/{slug}` | editor | body `{content, title?}` **requires `If-Match: "<version>"`**; 409 `{current:{version}}` on stale, 428 without header, 404 unknown |
| `DELETE /api/pages/{slug}` | editor | 204 / 404 |

Slugs: lowercase, hyphen-separated segments joined by `/`
(`blog/post-name`), max 255 chars, reserved first segments
(`api, oidc, edit, search, assets, static, healthz, all, admin`) rejected at the
API *and* by a DB `CHECK`. Titles keep case; slugs don't.

### Conflict semantics (autosave)

The edit client saves debounced full-document PUTs:

```
PUT /api/pages/blog/post      If-Match: "7"
200 {version: 8, …}           ← success
409 {current:{version: 9}}    ← someone else saved; client offers reload/overwrite
```

`updated_by` records the writer's OIDC `sub` (informational).

## Settings

Instance-wide settings (any authenticated user), persisted in a `settings`
key/value table and editable from `GET /admin`.

| Verb | Path | Auth | Notes |
|---|---|---|---|
| `PUT /api/settings` | editor | body `{searchEnabled?: boolean, homeSlug?: string\|null}`; `homeSlug` blank/`null` clears it; invalid slugs 400; returns the normalized settings |

- `searchEnabled` (default `true`) — hides the search form/links everywhere;
  `/search` and `/search/{terms}` remain functional.
- `homeSlug` (default unset) — the page served at `/` (falling back to the
  index when unset or when the page is missing).

## HTML routes

- `GET /{slug}` — **authenticated**: the editor SPA shell (`no-store`);
  **anonymous**: server-rendered reading view (`ETag`, `Cache-Control:
  public, max-age=60, stale-while-revalidate=300`, `Vary: Cookie`, 304
  revalidation). Unknown-but-valid slugs → 404 document with a create overlay.
- `GET /` — the configured home page, else the page index; `GET /all` — the
  page index (+ search box).
- `GET /search/{terms}` — results (no query strings anywhere on public routes).
- `GET /admin` — admin settings form (authenticated only).
- `GET /edit` / `GET /edit/{slug}` — 302 redirects to `/` / `/{slug}`
  (legacy paths).
- `GET /assets/*` — client bundle; `GET /healthz` — liveness.

## Viewer markdown

The reader renders with the **same engine as the editor** (`src/core`:
line-oriented tokenizer + content plugins) — no markdown-it. Output is the
editor's read-only shape (`div[data-line]` lines with dimmed `wn-punct`
markers). Supported grammar: `#`–`###` headings, `**bold**`, `*italic*`,
`~~strike~~`, backtick inline code, `> ` blockquotes, `-`/`*`/`+` list lines
(indent is visual, not semantic), `---` rules, `[text](url)` links, and
`[[Page]]` / `[[a/b|Display]]` wiki links → `<a class="wn-wiki-link"
href="/a/b">Display</a>` (targets that can't fold to a valid slug stay
literal). Raw HTML is always escaped; hrefs use a scheme allowlist
(`http/https/mailto` + relative/same-origin).

**Not parsed** (renders as visible literal source): fenced/indented code
blocks, tables, ordered lists, semantic list nesting, autolinked bare URLs,
`- [ ]` checkboxes, `####`–`######`, images, `_underscore_` emphasis,
backslash escapes (these produce emphasis instead — no escape grammar), HTML
entities (shown literally), multi-backtick spans, link titles. Wiki-link
labels show the target's LAST segment (`[[blog/my-post]]` → "my-post").

## Environment variables

See `.env.example`; every knob is parsed and validated in
`src/server/config.ts`: `NODE_ENV LOG_LEVEL PORT HOST DATABASE_URL OIDC_ISSUER
OIDC_CLIENT_ID OIDC_CLIENT_SECRET OIDC_REDIRECT_URL
OIDC_CLOCK_TOLERANCE_SECONDS SESSION_SECRETS SESSION_MAX_AGE_SECONDS
CACHE_MAX_ENTRIES CACHE_TTL_SECONDS AUTOSAVE_DEBOUNCE_MS AUTH_DISABLED`.
