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

Reads are public (cached) **unless login-only mode is on** (Settings —
anonymous `GET /api/pages*` then answers `403 {error:'login required'}`,
`no-store`, and authed responses flip to `private` + `Vary: Cookie`); writes
require the session cookie, an **editor or admin** role, **and** a
same-origin `Origin` (CSRF guard), and are rate-unlimited but size-capped.
Unauthenticated writes keep the 401 contract (the editor's expiry toast);
a viewer's write is a 403.

| Verb                         | Path   | Auth                                                                                                                                                                         | Notes                                                       |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET /api/pages[?q=&limit=]` | —      | no¹                                                                                                                                                                           | list/search (ILIKE), newest first, default limit 100        |
| `GET /api/pages/{slug}`      | —      | no¹                                                                                                                                                                           | `{slug,title,content,version,updatedAt,updatedBy}` + `ETag` |
| `POST /api/pages`            | editor | body `{slug, title?, content}` — **content required and non-blank** (400 otherwise); title defaults to the first `#` heading, else humanized slug; 409 on exists             |
| `PUT /api/pages/{slug}`      | editor | body `{content, title?}` **requires `If-Match: "<version>"`**; 409 `{current:{version}}` on stale, 428 without header, 404 unknown, 403 viewer. **Blank content DELETES the page** → 204 |
| `DELETE /api/pages/{slug}`   | editor | 204 / 404 / 403 viewer                                                                                                                                                                    |

¹ Anonymous reads are refused (`403 {error:"login required"}`) while `requireLogin` is set.

Slugs: lowercase, hyphen-separated segments joined by `/`
(`blog/post-name`), max 255 chars, reserved first segments
(`api, oidc, edit, search, assets, static, healthz, favicon.ico, icons, media,
all, admin`) rejected at the
API _and_ by a DB `CHECK`. Titles keep case; slugs don't. (`icons`/`media`
back the bundled icon set and the media store below; `004_media.sql` aborts
if an existing page already uses those prefixes, so they never get silently
shadowed.)

### Conflict semantics (autosave)

The edit client saves debounced full-document PUTs:

```
PUT /api/pages/blog/post      If-Match: "7"
200 {version: 8, …}           ← success
409 {current:{version: 9}}    ← someone else saved; client offers reload/overwrite
```

⚠️ **PUT is write-or-destroy.** A `PUT` whose `content` is blank (empty or
whitespace-only) deletes the page when `If-Match` matches the live version
(204, no body); a stale version still conflicts (409) exactly like an edit —
a stale client can never blank out someone's newer content. `POST` refuses
blank content (400), so pages only come into existence holding content.
This is a route-level invariant, not a DB constraint: the repository layer
still accepts blank writes (used by tests/seeds), and blank rows predating
this behavior persist until something blanks or overwrites them. Custom
tooling that PUTs `content: ""` to "clear a page" now destroys it.

The editor mirrors this: an empty buffer on a never-created page saves with
zero network; a "Page deleted" toast confirms a blank save; typing again
(after undo or fresh input) recreates the page via the normal create path.
Reader caches: a delete invalidates the server-side render cache
immediately, but anonymous browsers may still serve the deleted page from
their own `max-age=60` cache for up to a minute before the 404 appears.
The reverse is not true: 404 responses themselves are `no-store`, so
re-enabling a listing (or creating the page) is visible on the very next
navigation instead of being shadowed by a browser-cached "Page not found".

`updated_by` records the writer's OIDC `sub` (informational). A `POST`/`PUT`
from a session whose role was demoted to viewer mid-edit answers 403; the
client surfaces it as "you no longer have edit access" — deliberately without
a re-login action, since re-authenticating cannot restore a revoked role.

## Users

Role management (admin only, `src/server/routes/users-api.ts`).

| Verb                  | Path | Auth                           | Notes |
| --------------------- | ---- | ------------------------------ | ----- |
| `PUT /api/users/role` | —    | admin + **strict** same-origin | body `{sub, role}` (`sub` travels in the BODY — OIDC subs may contain `/`); `role` validated against the enum before touching the store |

- **No `GET /api/users`**: the `/admin` Users table renders server-side from
  the repository (same posture as settings having no GET).
- Responses: `200 {user, changed}` (same-role writes are a `changed:false`
  no-op), `400` malformed body, `401` anonymous, `403` viewer/editor caller
  or missing/crossed `Origin` (this endpoint grants
  script-execution-as-admin — Origin-less requests are refused here, unlike
  the general API posture), `404` unknown `sub`, `409` demoting the last
  remaining admin (the guard runs inside the repository's single atomic
  setter, so no caller can bypass it).
- Every change logs at `warn` (`{by, sub, to}`) and stamps the row's
  `updated_at`/`updated_by` audit columns.

## Settings

Instance-wide settings — **admin only**, persisted in a `settings`
key/value table and editable from `GET /admin`.

| Verb                | Path   | Auth                                                                                                                                                                                                                                                                                                                                           | Notes |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `PUT /api/settings` | admin | body `{searchEnabled?: boolean, homeSlug?: string\|null, navSlug?: string\|null, allPagesEnabled?: boolean, siteName?: string, headerHtml?: string, footerHtml?: string, faviconMediaId?: number\|null, requireLogin?: boolean, notFoundSlug?: string\|null, forbiddenSlug?: string\|null}`; `homeSlug`/`navSlug` blank/`null` clears them; invalid slugs 400; `faviconMediaId` must reference an existing media row (400 otherwise); returns the normalized settings |

- `searchEnabled` (default `true`) — hides the search form/links everywhere;
  `/search` and `/search/{terms}` remain functional.
- `navSlug` (default unset) — designates a page as **the nav**: its top-level
  list items that contain an internal page link (wiki `[[target|label]]` or
  markdown `[label](/slug)`, same fold the link plugins use) become site-nav
  links in the header chrome, rendered before Search/All-pages on both the
  reader and the editor. Extraction runs the real engine (`buildDocument` +
  inline scan), so fence/table regions and the full list-marker grammar
  behave exactly like the rendered page. Nested items, non-list links,
  external/anchor targets, and unfoldable slugs are skipped; max 8 links,
  labels truncated to 40 chars. `/admin` names the empty state when the nav
  page is set but yields no links. The parse is cached in the render cache
  (`nav:{slug}`) and re-parsed when the nav page is saved or the setting
  changes.
- `allPagesEnabled` (default `true`) — serves the page index at `/` and
  `/all`; disabling it requires a `homeSlug` landing page (400 otherwise).
- `siteName` (default `WorldNotes`) — branding name: suffixes every tab title
  (`Page — Site`) and replaces the "Home" breadcrumb label (reader + editor).
  Whitespace-collapsed, max 200 chars; blank resets to the default.
- `headerHtml` / `footerHtml` (default empty) — **raw HTML bands** rendered
  inside `<main>` above/below the article on every reader page; in the
  editor the same HTML rides the embedded config and the client inserts the
  bands around the content column (reader placement parity). Max 20 000
  chars each; scripts inside them execute for anonymous readers.
- `faviconMediaId` (default `null`) — id of a `media` row that overrides the
  bundled default icon set. When set, both page heads emit
  `<link rel="icon">` + `<link rel="apple-touch-icon">` pointing at the
  extensionless `/media/{id}` URL (no manifest link — an installed PWA keeps
  the bundled icons until the override is cleared); the blind `/favicon.ico`
  and `/apple-touch-icon.png` requests follow the override too, self-healing
  to the bundled bytes if the referenced row is gone. Upload via
  `POST /api/media` (below); setting a new id **deletes the row the setting
  previously pointed at**, so a replace or clear leaves no orphan behind. A
  partial restore can leave the setting pointing at a deleted row — harmless
  (dead image link), and the `/admin` page names the state with a recovery
  note.
- `requireLogin` (default `false`) — **login-only mode**: every read surface
  requires a session. Anonymous HTML reads (including `/`, `/all`, `/search*`
  and the 404/403 documents) receive the `403` sign-in document;
  `GET /api/pages*` refuses anonymous callers as described above;
  `GET /media/{id}` answers `403 {error:"login required"}` for anonymous and
  flips authenticated responses to `private` (the gate doubles as a
  sequential-id enumeration guard). **Uploaded/override media never reaches
  an anonymous request in this mode** — gated chrome links bundled icons
  only, and the blind `/favicon.ico` / `/apple-touch-icon.png` routes serve
  bundled bytes only. What it does NOT do: make the site private from
  *authenticated* visitors — any IdP-admitted account (default role
  `editor`, or `viewer` with `DEFAULT_ROLE=viewer`) can still read
  **everything**. There are no per-page ACLs. The toggle is per-process
  (in-memory settings snapshot): correct for the single-instance assumption,
  not a multi-instance control plane. Grace window after enabling: bytes
  already cached in anonymous browsers remain readable until they revalidate
  — reader HTML ≤60 s (+300 s SWR), page JSON ≤60 s, list JSON ≤30 s; media
  bytes cached before the flip are public-cache `immutable` and
  un-retractable (the going-forward `private` flip plus the enumeration
  refusal is the honest posture). Server-side gating is instant.
- `notFoundSlug` / `forbiddenSlug` (default unset) — designate wiki pages
  whose markdown renders inside the normal site chrome for `404` and `403`
  responses (see Status pages under HTML routes). **Designated status pages
  are public by definition**: their body is served to anonymous visitors
  even while login-only mode is on. A dangling/removed slug falls back to
  the built-in document.

**Trust model:** settings writes — including the raw HTML bands — are
restricted to the `admin` role (see Roles). Admin is effectively
script-execution-as-admin for every reader (there is no CSP), so treat the
IdP audience as the outer gate AND the bootstrap as the inner one: set
`BOOTSTRAP_ADMIN_SUBS` before the first roles-enabled boot that has live
sessions. Concurrent PUTs remain last-write-wins (no versioning), so two
admins editing different fields can clobber each other. The `/admin` page
deliberately renders the bands nowhere — broken branding cannot bury the
recovery form. Nav-page links ARE rendered on `/admin` (server-escaped
chrome, not raw content — same reasoning as the site name).

Reader chrome and 404 documents carry **no** sign-in affordance — reading is
open by default, and authentication stays a known route:
`GET /oidc/login?returnTo=/{slug}` (typically bookmarked by operators). The
one sanctioned exception: while `requireLogin` is on, the login-required
`403` document ships a sign-in link (with a validated, escaped `returnTo`) —
with the whole site gated, the "public button" objection no longer applies.
The editor's session-expiry toast keeps its re-login action (recovery UX).
First-admin bootstrap: see Roles (upgrade order), or run with
`AUTH_DISABLED=1` (dev mode, which grants admin).

Reader `ETag`s mix in a settings revision and the extracted nav links, so
branding/toggle/nav-page changes bust browser revalidation even when the
article bytes are unchanged — including a favicon change (the head `<link>`
tags are part of the cached chrome).

## Media

Uploaded images live in Postgres (`media` table), not on disk — the Docker
image stays disposable and `pg_dump` covers them. Rows are **immutable**: a
new upload gets a new id, which is what lets `/media/{id}` cache forever.
Reusing the store for editor-inserted images is the planned next consumer.

| Verb              | Path    | Auth                                                                                                      | Notes                                                                                                                                                                     |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/media` | editor  | `requireSameOrigin` + `requireRole('editor','admin')` at `onRequest` (auth runs before the multipart parser touches a byte) | `multipart/form-data`, one `file` part; returns `{id, url, mediaType, sizeBytes, width, height}` (201)                                                                    |
| `GET /media/{id}` | anon ok¹ | `403 {error:"login required"}` for anonymous while `requireLogin` is on; authed responses become `private` + `Vary: Cookie` | serves the stored bytes; `public, max-age=31536000, immutable`, strong ETag `"m{id}"` (304 revalidation), `nosniff` + `CSP: default-src 'none'` + `X-Frame-Options: DENY` |

**Content sniffing, not declared types:** the stored `media_type` comes from
magic bytes — PNG, JPEG, GIF, WebP, ICO are accepted; anything else (SVG
included, so no script-in-content vector) is a 415 regardless of what the
client claimed. Declared pixel dimensions are parsed from the header and
capped at 8192 px per side / 40 MP total, so a tiny "decompression bomb"
cannot become a permanently cached decoder-DoS. Size is capped by
`MEDIA_MAX_BYTES` (default 2 MiB); over-cap is a 413. `limits.fileSize` is
the only effective multipart body ceiling (Fastify's JSON `bodyLimit` does
not apply to streamed uploads).

**Public & enumerable:** `GET /media/{id}` needs no auth (anonymous readers
fetch the favicon), and ids are sequential bigserials — a media row is
effectively public-by-guessing the moment any HTML references it, and the
editor iteration inherits this posture. Treat uploaded images as public;
delete/clear to retract. Login-only mode adds the honest caveat: the gate
makes `/media/{id}` a sequential-id **enumeration guard** for anonymous
callers (403), and new authenticated fetches are `private` — but bytes
already cached publicly-cached stay readable at the cache until they expire
(`immutable` means a year; there is no revoking a cache you did not own).

- `GET /favicon.ico` and `GET /apple-touch-icon.png` (anon ok) — blind
  browser requests that ignore the head `<link>` tags. They follow the
  current favicon (override row, or the bundled `public/icons/` file),
  served `public, max-age=3600` (no `immutable`/ETag — ≤1h staleness after a
  settings change, since these URLs are mutable; browsers that _do_ parse the
  head tags see changes immediately from fresh page HTML). No bundled dir and
  no override → 404. While `requireLogin` is on, anonymous callers receive
  **bundled bytes only** — the override row never leaves an authenticated
  context (uploaded images require login; bundled assets are public).

## HTML routes

- `GET /{slug}` — **editor/admin**: the editor SPA shell (`no-store`);
  **viewer and anonymous**: server-rendered reading view (`ETag`,
  `Cache-Control: public, max-age=60, stale-while-revalidate=300`,
  `Vary: Cookie`, 304 revalidation; viewer shares the anonymous render
  cache, chrome differs per session). While `requireLogin` is on, anonymous
  requests to every HTML read route instead get the `403` sign-in document
  (`no-store`). Unknown-but-valid slugs → plain “Page not found”
  404 document, served `Cache-Control: no-store` (a cached 404 is a wrong
  answer, not a stale one) (no create/login affordance — header chrome carries no sign-in
  link by design: authentication is a known route, `GET /oidc/login?returnTo=…`,
  typically bookmarked by operators); the editor seeds a starter and the row
  is created on the first non-blank save — the server never stores blank pages.
- `GET /` — the configured home page, else the page index; `GET /all` — the
  page index (+ search box).
- `GET /search/{terms}` — results (no query strings anywhere on public routes).
- `GET /admin` — admin settings form (**admin role only**; authenticated
  non-admins get the `403` HTML document, anonymous get `401` JSON — the
  page is a known operator route, not a public surface).

Status pages: `404`/`403` HTML documents render the designated
`notFoundSlug` / `forbiddenSlug` page markdown inside normal chrome when set
(see Settings; the login-required variant additionally carries the sign-in
link), falling back to the built-in bodies. Custom bodies are rendered
through the same read-path engine — raw HTML inside them is escaped, so a
status page cannot script its readers. All 4xx are `no-store`. (The OIDC
callback-failure page is its own diagnostic document and not customizable.)
- `GET /edit` / `GET /edit/{slug}` — 302 redirects to `/` / `/{slug}`
  (legacy paths).
- `GET /assets/*` — client bundle; `GET /icons/*` — the bundled default icon
  set (`public/icons/`, shipped in the image, `max-age=1h` not immutable —
  filenames are stable across deploys while bytes change);
  `GET /favicon.ico`, `GET /apple-touch-icon.png` and `GET /media/{id}` —
  favicon and uploaded media (see **Media**); `GET /healthz` — liveness.

## Viewer markdown

The reader renders with the **same engine as the editor** (`src/core`:
line-oriented tokenizer + content plugins + a document-level **block pass**
for multi-line constructs) — no markdown-it. Output is the editor's
read-only shape (`div[data-line]` lines with dimmed `wn-punct` markers;
block regions wrapped in `div.wn-code-block` / `div.wn-table` with
`data-block` provenance). Supported grammar: `#`–`###` headings,
`**bold**`, `*italic*`, `~~strike~~`, backtick inline code, `> `
blockquotes, list lines — bullets (`-`/`*`/`+`, displayed as `•`) **and
ordered markers as typed** (`1.`, `a.`, `A.`, `i.`, `II.`, …) that
**continue on Enter** (`1.`→`2.`, `a.`→`b.`, `i.`→`ii.`, `iv.`→`v.`;
existing lines are never renumbered, no `<ol>` — indent is visual, not
semantic) —, `---`
rules, `[text](url)` links, `[[Page]]` / `[[a/b|Display]]` wiki links →
`<a class="wn-wiki-link" href="/a/b">Display</a>` (targets that can't fold
to a valid slug stay literal), **fenced code blocks** (`…`;
unclosed fences run to EOF; nothing inside is parsed), **pipe tables**
(header + `|:---|` separator + rows; alignment honored; cells accept
inline grammar; flex-div markup, never `<table>`), and **images**
`![alt](src)` → `<img loading="lazy" referrerpolicy="no-referrer">` —
while a line is not being edited only the picture shows (source
characters stay in the DOM, hidden by CSS; the editor reveals them the
moment the cursor's line goes raw).
Raw HTML is always escaped; hrefs use a scheme allowlist
(`http/https/mailto` + relative/same-origin, resolved against a fake base);
image srcs use a **narrower policy** (no `mailto:`, no `data:`; no
backslashes anywhere — URL parsers disagree on them, see
`src/shared/url-policy.ts`).

Relative image `src`s resolve against the page's directory (pages live at
`/{slug}`) — prefer root-absolute paths like `/assets/diagram.png` or
`/uploads/img.png`.

**Not parsed** (renders as visible literal source): indented code blocks,
semantic list nesting, autolinked bare URLs, `- [ ]` checkboxes,
`####`–`######`, `_underscore_` emphasis, backslash escapes (these produce
emphasis instead — no escape grammar), HTML entities (shown literally),
multi-backtick spans, link titles, linked images (`[![alt](i.png)](url)` —
the link token wins the scan, so no `<img>`), syntax highlighting inside
fences. Wiki-link labels show the target's LAST segment
(`[[blog/my-post]]` → "my-post").

## Environment variables

See `.env.example`; every knob is parsed and validated in
`src/server/config.ts`: `NODE_ENV LOG_LEVEL PORT HOST DATABASE_URL OIDC_ISSUER
OIDC_CLIENT_ID OIDC_CLIENT_SECRET OIDC_REDIRECT_URL
OIDC_CLOCK_TOLERANCE_SECONDS SESSION_SECRETS SESSION_MAX_AGE_SECONDS
CACHE_MAX_ENTRIES CACHE_TTL_SECONDS AUTOSAVE_DEBOUNCE_MS MEDIA_MAX_BYTES
AUTH_DISABLED DEFAULT_ROLE BOOTSTRAP_ADMIN_SUBS`. `DEFAULT_ROLE` and
`BOOTSTRAP_ADMIN_SUBS` shape account provisioning (see Roles); the
`requireLogin` toggle is NOT env — it is an admin setting.
