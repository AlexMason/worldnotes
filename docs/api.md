# HTTP API & Configuration

WorldNotes is a server application (not a library): the API below is the
contract between the built-in edit client and the server, and is stable enough
for custom tooling. There is no published npm package anymore.

## Authentication

- `GET /oidc/login[?returnTo=/app/relative/path]` — 302 to the provider
  (authorization-code flow with `state`, PKCE S256, `nonce`).
- `GET /oidc/callback` — provider redirect target; on success issues the
  session cookie and 302s to the sanitized `returnTo` (or `/`). Failures →
  400/401 JSON.
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
(`api, oidc, edit, search, assets, static, healthz`) rejected at the API
*and* by a DB `CHECK`. Titles keep case; slugs don't.

### Conflict semantics (autosave)

The edit client saves debounced full-document PUTs:

```
PUT /api/pages/blog/post      If-Match: "7"
200 {version: 8, …}           ← success
409 {current:{version: 9}}    ← someone else saved; client offers reload/overwrite
```

`updated_by` records the writer's OIDC `sub` (informational).

## HTML routes

- `GET /{slug}` — server-rendered reading view (`ETag`, `Cache-Control:
  public, max-age=60, stale-while-revalidate=300`, 304 revalidation).
  Unknown-but-valid slugs → 404 document with a create overlay.
- `GET /` — page index + search box.
- `GET /search/{terms}` — results (no query strings anywhere on public routes).
- `GET /edit/{slug}` — editor SPA shell (authenticated only; anonymous are
  redirected to the reading view).
- `GET /assets/*` — client bundle; `GET /healthz` — liveness.

## Viewer markdown

CommonMark via markdown-it (plus tables, `~~strike~~`, single-newline breaks,
linkify) with **raw HTML disabled** and a scheme allowlist
(`http/https/mailto` + relative). Extensions: `[[Page]]` / `[[a/b|Display]]`
→ `<a class="wn-wiki-link" href="/a/b">Display</a>` (targets that can't fold
to a valid slug stay literal), `- [ ]` / `- [x]` → disabled checkboxes.

## Environment variables

See `.env.example`; every knob is parsed and validated in
`src/server/config.ts`: `NODE_ENV PORT HOST DATABASE_URL OIDC_*
SESSION_SECRETS SESSION_MAX_AGE_SECONDS CACHE_MAX_ENTRIES CACHE_TTL_SECONDS
AUTOSAVE_DEBOUNCE_MS AUTH_DISABLED`.
