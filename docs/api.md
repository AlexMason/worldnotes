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
anonymous `GET /api/pages*` and `GET /api/pages-exist` then answer `403 {error:'login required'}`,
`no-store`, and authed responses flip to `private` + `Vary: Cookie`); writes
require the session cookie, an **editor or admin** role, **and** a
same-origin `Origin` (CSRF guard), and are rate-unlimited but size-capped.
Unauthenticated writes keep the 401 contract (the editor's expiry toast);
a viewer's write is a 403.

| Verb                         | Path   | Auth                                                                                                                                                                                     | Notes                                                       |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET /api/pages[?q=&limit=&scope=]` | —      | no¹                                                                                                                                                                                      | list/search (ILIKE over slug, title **and body**), newest first, default limit 100. `scope=name` restricts the search to slug/title (the editor's link-field suggestions use it so body matches can't crowd out pages named like the query) and answers `Cache-Control: no-store`; any other `scope` value is 400 |
| `GET /api/pages/{slug}`      | —      | no¹                                                                                                                                                                                      | `{slug,title,content,version,updatedAt,updatedBy}` + `ETag`; a **former slug** (alias) answers `301` → `/api/pages/{current}` |
| `GET /api/pages-exist?slugs=a,b/c` | — | no¹ | link-state lookup → `{exists:{"a":true,"b/c":false}}`. ≤100 comma-separated slugs (400 above); invalid/reserved slugs are omitted (unknown); former slugs (aliases) count as existing; `Cache-Control` like the list. Not under `/api/pages/*`, which would read it as a slug |
| `GET /api/page-titles?slugs=a,b/c` | — | no¹ | breadcrumb-label lookup → `{titles:{"a":"Stored Title"}}` — only slugs of existing pages appear (aliases and missing pages are omitted). Same cap, validation, `Cache-Control` and placement rule as `/api/pages-exist` |
| `POST /api/pages`            | editor | body `{slug, content}` — **content required and non-blank** (400 otherwise); the stored title is derived (see Titles below); 409 on exists; 409 `{movedTo}` on a former slug |
| `PUT /api/pages/{slug}`      | editor | body `{content}` **requires `If-Match: "<version>"`**; the title is re-derived from the new content; 409 `{current:{version}}` on stale, 428 without header, 404 unknown, 409 `{movedTo}` on a former slug, 403 viewer. **Blank content DELETES the page** → 204 |
| `DELETE /api/pages/{slug}`   | editor | 204 / 404 / 409 `{movedTo}` on a former slug / 403 viewer                                                                                                                                |
| `POST /api/page-moves`       | editor | body `{from, to}` — move a page **and its subtree** (see Page moves below) → `200 {moved:[{from,to}], rewritten:[slug], settings:[field]}`                                               |

¹ Anonymous reads are refused (`403 {error:"login required"}`) while `requireLogin` is set.

Slugs: lowercase, hyphen-separated segments joined by `/`
(`blog/post-name`), max 255 chars, reserved first segments
(`api, oidc, edit, search, assets, static, healthz, favicon.ico, icons, media,
all, admin`) rejected at the
API _and_ by a DB `CHECK`. Titles keep case; slugs don't. (`icons`/`media`
back the bundled icon set and the media store below; `004_media.sql` aborts
if an existing page already uses those prefixes, so they never get silently
shadowed.)

Titles: a page's title is the text of its **first H1** (`# …`, outside code
fences), else its humanized last slug segment (`lore/old-gods` → `Old Gods`).
It is derived on every write (create, save, move) and stored; request bodies
carry no title (a `title` field is ignored). The same rule names the page in
tab titles and breadcrumbs.

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

### Page moves

`POST /api/page-moves {from, to}` gives a page a new address. It lives
outside `/api/pages/*`, whose wildcard would read a `/move` suffix as part of
a slug. Same guards as other page writes (editor/admin role, same-origin);
no `If-Match` (the move does not depend on content).

- `to` folds like a wiki-link target (`Clients/Acme Corp` →
  `clients/acme-corp`), then passes the normal slug policy.
- The **whole subtree** moves: `projects/acme` → `clients/acme` also moves
  `projects/acme/*` → `clients/acme/*`.
- Every internal link in every page that pointed at a moved page is
  **rewritten** in the same transaction (wiki links and markdown links; never
  inside code fences, code spans, or text the engine does not render as a
  link). Rewritten links keep their style: `[[Projects/Acme]]` →
  `[[Clients/Acme]]`, `[[projects/acme]]` → `[[clients/acme]]`; explicit
  `|labels` are kept; relative links stay relative while they still can.
  Relative links inside the moved subtree already follow the move and are
  not touched.
- Pages whose content changed get `version + 1`; a slug-only move keeps the
  version (so a client re-keyed to the new slug can keep saving). Open
  editors of rewritten pages get the usual 409 conflict on their next save.
- Instance settings naming a moved page (`homeSlug`, `navSlug`,
  `notFoundSlug`, `forbiddenSlug`) follow it (`settings` lists the fields
  changed). Admin header/footer HTML is not rewritten.
- Every old slug becomes an **alias** of the page. Aliases point at the page
  itself, so moving again never builds redirect chains; deleting the page
  drops them; moving a page onto an alias slug reclaims it. Aliases answer
  `GET /{old}` and `GET /api/pages/{old}` with `301` to the current address
  (`public, max-age=60` with no stale-while-revalidate, `private` while
  login-only, behind the login-only gate), and writes with
  `409 {error:"page moved", movedTo}` — never 404, which an edit client would
  read as "deleted underneath me" and recreate the old page. A browser may
  keep following a cached 301 for up to a minute after the page is moved back
  onto its old slug.

All-or-nothing: on Postgres the move is one transaction, holding row locks
on the moved pages and every page that could link to them. A concurrent save
either commits first (and its content is then rewritten by the move) or waits
and then gets the normal 409 — never lost, never half-applied. Moves never
queue behind each other: while one runs, another answers 409 (try again).
Settings follow after the commit (cache invalidation happens first); if that
settings write fails it is logged, `settings` comes back empty, and the
move still answers 200.

| Status | Body | When |
| --- | --- | --- |
| 200 | `{moved, rewritten, settings}` | moved |
| 400 | `{error}` / `{error, slug}` | invalid `from`/`to`, same address, moving a page inside itself, a relocated child slug invalid (e.g. over 255 chars) |
| 404 | `{error}` | `from` is not a page |
| 409 | `{error, slug}` | a target slug is taken by another page |
| 409 | `{error:"page moved", movedTo}` | `from` is a former slug |
| 409 | `{error}` | another move is in progress |

## Users

Role management (admin only, `src/server/routes/users-api.ts`).

| Verb                  | Path | Auth                           | Notes                                                                                                                                   |
| --------------------- | ---- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
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

| Verb                | Path  | Auth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Notes |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `PUT /api/settings` | admin | body `{searchEnabled?: boolean, homeSlug?: string\|null, navSlug?: string\|null, allPagesEnabled?: boolean, siteName?: string, headerHtml?: string, footerHtml?: string, faviconMediaId?: number\|null, activeThemeId?: number\|null, requireLogin?: boolean, notFoundSlug?: string\|null, forbiddenSlug?: string\|null}`; `homeSlug`/`navSlug` blank/`null` clears them; invalid slugs 400; `faviconMediaId` must reference an existing media row and `activeThemeId` an existing theme (400 otherwise); returns the normalized settings |

- `searchEnabled` (default `true`) — hides the search form/links everywhere;
  `/search` and `/search/{terms}` remain functional.
- `navSlug` (default unset) — designates a page as **the nav**: its top-level
  list items that contain an internal page link (wiki `[[target|label]]` or
  markdown `[label](/slug)`, same fold the link plugins use; relative wiki
  targets resolve under the nav page itself, as in its editor) become site-nav
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
  extensionless `/media/{id}` URL (the manifest link stays and keeps the
  bundled icons — an installed Android PWA keeps them until the override is
  cleared; the iOS home-screen icon follows the override); the blind `/favicon.ico`
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
  _authenticated_ visitors — any IdP-admitted account (default role
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
- `activeThemeId` (default `null` = default look) — the theme from the gallery
  (see **Themes**) whose CSS is appended after the default stylesheet on the
  reader and the editor. Activation is a settings write, so it bumps the
  settings revision like every other chrome change. A pointer to a theme that
  no longer exists (restore, manual SQL) renders the default look.

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

**Theme CSS trust note:** theme CSS is raw, admin-authored text emitted
verbatim into an inline `<style>` — **no new privilege class**: the header/
footer HTML bands above already run arbitrary admin script for every reader.
Guardrails only protect the document, not the readers: 64 KiB cap, control
characters rejected, and `</style` (case-insensitive) rejected because it is
the only sequence that can leave an inline `<style>`. The session cookie is
`httpOnly` and no secret sits in DOM attributes, so CSS-exfiltration
selectors reach nothing an admin cannot already read. **Non-admin theme
authoring is out of scope** — it would need a CSS sanitizer and a CSP.

Reader chrome and 404 documents carry **no** sign-in affordance — reading is
open by default, and authentication stays a known route:
`GET /oidc/login?returnTo=/{slug}` (typically bookmarked by operators). The
one sanctioned exception: while `requireLogin` is on, the login-required
`403` document ships a sign-in link (with a validated, escaped `returnTo`) —
with the whole site gated, the "public button" objection no longer applies.
The editor's session-expiry toast keeps its re-login action (recovery UX).
First-admin bootstrap: see Roles (upgrade order), or run with
`AUTH_DISABLED=1` (dev mode, which grants admin).

Reader `ETag`s mix in a settings revision, the extracted nav links and the theme CSS, so
branding/toggle/nav-page changes bust browser revalidation even when the
article bytes are unchanged — including a favicon change (the head `<link>`
tags are part of the cached chrome).

## Themes

Admin-authored CSS stylesheets (`themes` table, migration `006_themes.sql`):
a named, raw `css` blob (≤ 65 536 characters), an optional `description`
(≤ 500) and a unique `name` (whitespace-collapsed, ≤ 100). One theme — or
none — is **active** (`activeThemeId`, see Settings). The active theme's CSS
is emitted as `<style id="worldnotes-theme">` **after** the default
stylesheet (reader: in `<head>` after the built-in sheet; editor: embedded in
the shell config and appended by the client directly after
`#worldnotes-styles`), so a theme overrides tokens/rules through the cascade
without `!important` and a syntactically broken theme degrades to the default
look. `/admin` never receives theme CSS (anti-lockout, same precedent as the
HTML bands). Themes ride the existing gates: login-only mode withholds
nothing extra, because the CSS is part of the (already gated) HTML.

All routes are **admin only**; writes additionally require a same-origin
request (`Origin` matches or is absent), mirroring `PUT /api/settings`.
Anonymous → `401`, viewer/editor → `403`.

| Verb                      | Path  | Notes                                                                                        |
| ------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| `GET /api/themes`         | admin | `200 {themes: Theme[], activeThemeId}`, oldest first, `css` included, `no-store`             |
| `POST /api/themes`        | admin | body `{name, description?, css?}` → `201 Theme`; `400` invalid; `409` name taken             |
| `GET /api/themes/{id}`    | admin | `200 Theme`; `400` malformed id (decimal positive integers only); `404`                      |
| `PUT /api/themes/{id}`    | admin | partial body `{name?, description?, css?}` → `200 Theme`; `400`/`404`/`409` as above         |
| `DELETE /api/themes/{id}` | admin | `204`; `404`; `409` while the theme is **active** — activate another theme (or `null`) first |

`Theme` = `{id, name, description, css, createdAt, updatedAt, updatedBy}`
(timestamps are epoch milliseconds). Validation messages are operator-facing
`{error}` strings. Edits to the **active** theme take effect on the next
render with no restart: the server drops its memoized CSS on every write and
reader `ETag`s hash the theme CSS itself (not just the settings revision), so
browsers revalidate within the normal ≤ 60 s window.

**Preview:** an **admin** session may append `?previewTheme={id}` to any
HTML read route (`/`, `/{slug}`, `/all`, `/search…`, 404 documents) to render
with that theme instead of the active one. The response is `no-store` and
never answers `304`; every other session and unknown/malformed ids ignore the
parameter. The `/admin` gallery's Preview links use it.

## Media

Uploaded images live in Postgres (`media` table), not on disk — the Docker
image stays disposable and `pg_dump` covers them. Rows are **immutable**: a
new upload gets a new id, which is what lets `/media/{id}` cache forever.
Editor photos use `POST /api/media/photos` (below); the favicon override flow
keeps using `POST /api/media`.

| Verb              | Path     | Auth                                                                                                                        | Notes                                                                                                                                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/media` | editor   | `requireSameOrigin` + `requireRole('editor','admin')` at `onRequest` (auth runs before the multipart parser touches a byte) | `multipart/form-data`, one `file` part; returns `{id, url, mediaType, sizeBytes, width, height}` (201)                                                                    |
| `POST /api/media/photos` | editor | same guards as `POST /api/media` | `multipart/form-data`, one `file` part that must be a **PNG** (the browser downscales to ≤ 2048 px and converts before upload) or an **animated GIF** (kept as is); the type comes from magic bytes only; sanitized server-side; returns `{id, url, mediaType: "image/png" \| "image/gif", sizeBytes, width, height}` (201). Errors: `413` over `PHOTO_MAX_BYTES` (message names the limit), `415` neither a PNG nor a GIF, `422` invalid PNG/GIF, a side over 2048 px, or a GIF with too many frames, `400` no/extra parts |
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

**Photo uploads are validated, not decoded:** `POST /api/media/photos` walks
the PNG chunk structure (signature, every chunk CRC, `IHDR` first, one
contiguous `IDAT` run, `IEND` last) and **rewrites** the file keeping only
`IHDR PLTE IDAT IEND tRNS gAMA cHRM sRGB iCCP`. EXIF/GPS (`eXIf`), text
chunks, timestamps, APNG animation chunks, unknown chunks and any bytes after
`IEND` are never stored, so metadata is stripped even for direct API callers.
Width and height must be ≤ `PHOTO_MAX_SIDE` (2048, shared with the browser's
resizer). The size ceiling is `PHOTO_MAX_BYTES` (default 15 MiB), applied per
request to the converted PNG; `MEDIA_MAX_BYTES` still governs only
`POST /api/media`. The IDAT zlib stream is not inflated, so a structurally
valid PNG with corrupt pixel data is stored and renders broken (harmless:
served `nosniff` under `CSP default-src 'none'`).

**GIFs** take the same route, validated by `src/shared/gif.ts` (the browser
uses the same module to decide whether a GIF is animated). The walker follows
the block structure without decoding LZW data and **rewrites** the file
keeping only the header, screen descriptor, global color table, graphic
control extensions, the `NETSCAPE2.0` loop-count extension and the image
blocks (with local color tables), followed by one trailer. Comments,
plain-text and other application extensions (XMP, ICC), unknown extensions and
any bytes after the trailer are never stored. A missing trailer is accepted
only at a clean block boundary. Caps: each side of the screen **and of every
frame** ≤ `PHOTO_MAX_SIDE` (2048), at most 500 frames, and the summed area of
all frames ≤ 400 million pixels (LZW compresses blank frames ~1000:1, so file
size alone would not bound the decoder work every reader's browser pays for an
immutably cached image). Output is bounded too: at most one `NETSCAPE2.0`
block and one graphic control extension (block size 4) per image are kept, so
junk extensions cannot be amplified;
the byte ceiling is `PHOTO_MAX_BYTES` as for PNGs. Animated GIFs are not
re-encoded or downscaled: the browser sends a still PNG instead when an
animated GIF is larger than 2048 px.

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
  A **former slug** of a moved page answers `301` to its current address for
  every role (`max-age=60`; the editor never seeds a page over an alias).
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
- `GET /assets/*` — client bundle (`public, max-age=1h, immutable`; chunks are
  content-hashed, and the editor shell loads the stable-named entry as
  `/assets/client.js?v=<content hash>`, so every client build gets a new URL
  and browsers pick it up on the next page load); `GET /icons/*` — the bundled default icon
  set (`public/icons/`, shipped in the image, `max-age=1h` not immutable —
  filenames are stable across deploys while bytes change);
  `GET /favicon.ico`, `GET /apple-touch-icon.png` and `GET /media/{id}` —
  favicon and uploaded media (see **Media**); `GET /healthz` — liveness.
- `GET /manifest.webmanifest` — web app manifest (`start_url`/`scope` `/`,
  `display: standalone`, bundled 192/512 icons, `name` = `siteName`;
  `max-age=300`). `GET /sw.js` — root-scoped service worker (`no-cache`).
  Both are public and **not** subject to login-only mode (browsers fetch them
  without credentials; they expose only the site name and icon paths). Every
  reader/editor/status page links the manifest and registers the worker. The
  worker is network-only: it never uses the Cache API and only answers a
  *failed navigation* with a static “You’re offline” document, so no page,
  API or media bytes persist on the device (no stale editor after sign-out,
  no gated content surviving logout). Installing needs HTTPS (or `localhost`).

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
`<a class="wn-wiki-link" href="/{slug}">Display</a>`. **Wiki-link targets
resolve against the page they are written on:** `[[beta]]` on `/alpha`
links to `/alpha/beta` (on `/alpha/gamma` to `/alpha/gamma/beta`), even when
a root-level `/beta` exists; a leading slash roots the target at the site,
`[[/beta]]` → `/beta`. The configured home page (`homeSlug`, served at `/`)
resolves relative targets from the root, so changing `homeSlug` clears the
render cache. Custom 404/403 bodies resolve under their own page's slug.
Markdown links `[text](beta)` keep root semantics (`/beta`); `../` is not
parent traversal (empty/dot segments fold away). Targets that can't fold
to a valid slug stay literal; a link whose target page does not exist also
carries `wn-link-missing` — resolved server-side per render, so the zero-JS
reader shows it too; existence changes clear the render cache),
**fenced code blocks** (`…`;
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
PHOTO_MAX_BYTES
AUTH_DISABLED DEFAULT_ROLE BOOTSTRAP_ADMIN_SUBS`. `DEFAULT_ROLE` and
`BOOTSTRAP_ADMIN_SUBS` shape account provisioning (see Roles); the
`requireLogin` toggle is NOT env — it is an admin setting.
