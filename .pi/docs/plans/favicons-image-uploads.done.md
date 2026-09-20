# Plan: Favicons & image uploads (media store)

Date: 2026-09-20 (UTC). Branch: `feature/favicons-image-uploads`.
Revision 2 — merged from dual subagent plan review (gap/risk lens +
simplicity/fit lens; both returned BLOCK, all blockers/majors incorporated).

## Goal

Give every page a real favicon: a bundled default icon set (the user's
favicon.io export, vendored to `public/icons/`) that admins can override with
a single uploaded image — and build the small general image subsystem
(multipart upload endpoint + Postgres bytea store + public serving route)
that the future "upload images in the editor" iteration will sit on.

## Decisions already made (interview)

- **Scope:** favicon + real upload now. Generic upload endpoint/storage/serving,
  but no media-management UI; editor image insertion is a later iteration.
- **Storage:** Postgres `bytea` (`media` table). No new Docker volume; uploads
  persist via normal pg backup; the image stays disposable.
- **Defaults:** the user's real icon set (copied to `public/icons/`:
  `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png` (180²), `android-chrome-192x192.png`,
  `android-chrome-512x512.png`, `site.webmanifest`). Bundled into the Docker
  image at build; no volume needed for defaults either.
- **Override input:** upload a single image (no external-URL field, no
  pick-from-set picker). Clearing the override falls back to the bundled set.
- **Formats:** raster only — PNG, JPEG, GIF, WebP, ICO. **No SVG** (no
  script-in-content vector). Type is decided by **magic-byte sniffing**, not
  by the client-declared content type.

## Approach

Follow the existing settings architecture end-to-end: a new `favicon_media_id`
key/value setting (parsed/normalized by `SettingsService`, revision-bumped so
reader ETags bust on change), a new `media` table behind a storage-agnostic
repository (pg + memory pair, like pages/settings), a public serving route
with immutable long-cache URLs, and an upload route `POST /api/media`
guarded at **`onRequest`** (before the multipart parser touches the body;
the session's app-level `onRequest` hook still runs first, so `req.user` is
available) exactly like other writes (`requireSameOrigin` + `requireAuth`,
size/type/dimension-capped).

**Media URLs are extensionless: `/media/{id}`.** The id IS the immutable
content address — `content-type` comes from the row, browsers don't need an
extension for `<link>` or `<img>`, and the render path stays a pure sync
function of settings (no per-render DB lookup, no duplicated type in a second
setting key). Replacing an icon is a new upload → new id → new URL.

The two HTML heads (`render/layout.ts` reader, `render/editor-shell.ts`
editor) currently emit `<link rel="icon" href="data:,">`; both switch to one
shared `render/icons.ts` builder. Blind browser requests to `/favicon.ico`
and `/apple-touch-icon.png` get explicit routes that stream the override
bytes when set and healthy, else the bundled files read straight from disk
via `node:fs` — **never `reply.sendFile()`** (that decorator only exists when
the `/assets/` static mount registered, which it doesn't in tests).

## Files

1. **`public/icons/*`** — ✅ already vendored. One content edit:
   `site.webmanifest` icon `src`s `/android-chrome-*.png` →
   `/icons/android-chrome-*.png`, and fill `"name"`/`"short_name"` so the
   bundled manifest isn't broken.
2. **`migrations/004_media.sql`** — `media` table:
   `id BIGSERIAL PRIMARY KEY, media_type TEXT NOT NULL CHECK (media_type IN
   ('image/png','image/jpeg','image/gif','image/webp','image/vnd.microsoft.icon')),
   size_bytes BIGINT NOT NULL, width INT, height INT, data BYTEA NOT NULL,
   created_at TIMESTAMPTZ DEFAULT now(), created_by TEXT`
   (width/height stored from the sniffed header — free diagnostics, useful
   later for editor image listings). The migration **starts with a guard**:
   `DO $$ … IF EXISTS (SELECT 1 FROM pages WHERE split_part(slug,'/',1) = ANY
   (ARRAY['media','icons'])) THEN RAISE EXCEPTION 'pages using soon-reserved
   prefixes exist; rename them first' END IF; $$` — so an install with
   `media/…` pages fails loudly at migrate time instead of silently bricking
   those pages at routing time (none exist here, but the guard is the honest
   cost of extending `RESERVED_FIRST_SEGMENTS`).
3. **`src/server/db/media-repository.ts`** — contract:
   `insert({mediaType, width, height, data, by}): Promise<{id}>`,
   `get(id): Promise<{mediaType, width, height, sizeBytes, data, createdAt} | null>`,
   `delete(id): Promise<boolean>`, `destroy()`.
4. **`src/server/db/media-memory.ts`** — Map<number, row> impl (tests/dev).
5. **`src/server/db/media-pg.ts`** — pg impl.
6. **`src/shared/slug.ts`** — add `'icons'`, `'media'` to
   `RESERVED_FIRST_SEGMENTS` (`favicon.ico` already there). Extend
   `slug.test.ts` reserved-segment cases.
7. **`src/server/media-types.ts`** — magic-byte sniffers
   (PNG `\x89PNG\r\n\x1a\n`, JPEG `FF D8 FF`, GIF `GIF87a`/`GIF89a`,
   WebP `RIFF`+`WEBP`, ICO `00 00 01 00`) **plus declared-dimension parsing**
   (PNG IHDR, JPEG SOFn walk, GIF LSD, WebP VP8/VP8L/VP8X, ICO entry header),
   returning `{mediaType, width, height}` or a typed rejection reason. Caps:
   reject > 8192 px per side or > 40 MP — a ≤2 MiB "decompression bomb" must
   not become a permanently cached decoder-DoS for anonymous readers.
   `MEDIA_TYPE_EXT` map kept only for docs/accept strings.
8. **`src/server/config.ts`** — new env `MEDIA_MAX_BYTES`
   (`z.coerce.number().int().positive().default(2_097_152)` = 2 MiB).
9. **`src/server/settings.ts`** — `faviconMediaId: number | null` (default
   `null`): key `favicon_media_id`, parse (non-numeric/≤0/corrupt → null),
   serialize, patch field validated as integer ≥ 1 or null. The settings
   service stays media-repo-free — existence checks + row cleanup belong to
   the API route that owns both stores.
10. **`src/server/routes/settings-api.ts`** — accept `faviconMediaId`
    (number|null; wrong type → 400). Change flow: if patch sets a new id →
    `media.get(newId)` must exist (400 "unknown media id"); `update()`; then
    delete the previous id **iff** previous ≠ new AND the post-update
    `settings.get().faviconMediaId` still ≠ previous (interleaved-writer
    safety). `SettingsApiDeps` gains `media: MediaRepository`.
11. **`src/server/render/icons.ts`** — pure sync `iconTagsHtml(faviconMediaId:
    number | null): string`, single source for both heads:
    - **No override** (bundled set): `<link rel="icon" type="image/png"
      sizes="32x32" href="/icons/favicon-32x32.png">` + 16×16 +
      `<link rel="apple-touch-icon" sizes="180x180"
      href="/icons/apple-touch-icon.png">` + `<link rel="manifest"
      href="/icons/site.webmanifest">`.
    - **Override**: exactly `<link rel="icon" href="/media/{id}">` +
      `<link rel="apple-touch-icon" href="/media/{id}">` — no `type`/`sizes`
      (unknown synchronously; browsers cope), **no manifest** (documented
      caveat: an already-installed PWA keeps the bundled icons until the
      override is cleared — accepted).
    Both cases also keep working if the override row is dangling (a crashed
    two-step flow): readers get a 404 image link (browser falls back to its
    default icon); `/favicon.ico` self-heals to the bundled bytes (item 14);
    the admin page says so (item 15). No render-path detection is attempted.
12. **`src/server/render/layout.ts`** — `LayoutOptions.faviconMediaId?:
    number | null`; replace the `data:,` line with `iconTagsHtml(...)`.
13. **`src/server/render/editor-shell.ts`** — `EditorShellOptions.faviconMediaId`
    → same tags in the editor `<head>`. (`EditorShellConfig` in
    `src/shared/dto.ts` does NOT change — tags are server-rendered chrome, no
    client logic.)
14. **`src/server/routes/media.ts`** — registers (find-my-way precedence is
    structural — static/parametric beat the SSR `/*` wildcard regardless of
    registration order; the existing `/assets/*` mount is precedent):
    - `POST /api/media` (`onRequest: [requireSameOrigin, requireAuth]` —
      guards run before the multipart parser sees a byte; add the
      anonymous-upload-creates-no-row test): single file part via
      `req.file()`; app registers multipart with
      `{ limits: { fileSize: env.MEDIA_MAX_BYTES, files: 1, fields: 0,
      parts: 1, headerPairs: 20 } }`; map `RequestFileTooLargeError` /
      `part.file.truncated` → 413, zero-file / malformed → 400; sniff +
      dimension caps → 415 (with reason); insert; 201
      `{id, url: '/media/{id}', mediaType, sizeBytes, width, height}`.
    - `GET /media/:id` (public): non-integer/unknown → 404
      `{error:'not found'}`; else row bytes with the stored `content-type`,
      `content-length`, `etag: "m{id}"` (+`If-None-Match` → 304),
      `cache-control: public, max-age=31536000, immutable`, and
      `x-content-type-options: nosniff` + `content-security-policy:
      default-src 'none'` + `x-frame-options: DENY` (closes the
      4-byte-ICO-magic polyglot class; app has no CSP otherwise).
      No `/:name` variant — one URL, one cache key.
    - `GET /favicon.ico` + `GET /apple-touch-icon.png` (public): if
      `faviconMediaId` set AND `media.get` returns a row → stream it;
      otherwise `node:fs.readFile` from `iconsDir` ('favicon.ico' /
      'apple-touch-icon.png') with `existsSync` guard → plain 404 when the
      dir is absent (tests). These URLs are mutable (they follow settings),
      so: `cache-control: public, max-age=3600` (no immutable, no ETag —
      worst-case ≤1h staleness after a change is documented; browsers that
      parse `<link>` tags get the change immediately from fresh HTML).
15. **`src/server/routes/admin.ts`** — `AdminDeps` gains
    `media: MediaRepository` (page is `no-store`, one extra lookup is fine):
    render the current state — default icons, override thumbnail
    `<img src="/media/{id}">`, or override **missing** (dangling) with a
    "re-upload to recover" note. Icon controls sit OUTSIDE the main
    `<form>` (so the main Save never touches the icon): `<input type="file"
    accept="image/png,image/jpeg,image/gif,image/webp,image/vnd.microsoft.icon">`
    (accept values = stored canonical types) + Upload + Remove buttons.
    Script: upload → `fetch('/api/media', {method:'POST', body: new
    FormData(fileInput)})` → `PUT /api/settings {faviconMediaId: id}`
    (partial-patch semantics; main-form fields are not sent) → reload;
    remove → `PUT {faviconMediaId: null}`; failures surface in the existing
    `#wn-admin-msg` pattern. Also pass `faviconMediaId: s.faviconMediaId` to
    this page's own `renderLayout` call so /admin's head matches the site.
16. **`src/server/app.ts`** — new deps `media?: MediaRepository` (default
    memory, mirrors `settings?`) and `bundledIconsDir?: string | null`;
    register `@fastify/multipart`; second `fastifyStatic` mount
    `{ root: bundledIconsDir, prefix: '/icons/', maxAge: '1h',
    decorateReply: false }` when the dir exists — **`decorateReply: false` is
    mandatory** (the plugin is skip-override; a second `decorateReply` of
    `sendFile` throws `FST_ERR_DEC_ALREADY_PRESENT` and crash-loops boot);
    no `immutable` (filenames are stable across deploys, content changes).
    Register `registerMediaRoutes` and pass media into settings-api + admin
    routes. SSR catch-all stays last.
17. **`src/server/index.ts`** — pass `createPgMediaRepository(pool)` +
    `bundledIconsDir: resolve(here, '../../public/icons')`.
18. **`Dockerfile`** — final stage: `COPY public ./public` (icons ship in the
    image; still zero new volumes).
19. **`package.json` + `package-lock.json`** — `npm install
    @fastify/multipart` (let npm resolve the Fastify-5-compatible major —
    v10.1.1 is latest as of planning; if its peer range rejects fastify 5,
    take ^9; do NOT hard-pin blind). Commit the regenerated lockfile — both
    Docker stages (`npm ci`) and CI require it.
20. **`.env.example`** — `MEDIA_MAX_BYTES` block (with the "raise later for
    editor images" note).
21. **Tests** (co-located, following existing patterns):
    - `src/server/__tests__/media-types.test.ts` — sniff/dimension table:
      positive fixtures per format (tiny real byte blobs inline), rejection
      of SVG/HTML/exe-prefixed/over-dimension/oversized, bomb fixture
      (big-declared-size PNG bytes within 2 MiB).
    - `src/server/__tests__/media.test.ts` (upload + serving + blind icon
      routes in one file, one app fixture): 201 PNG/JPEG/ICO; anonymous and
      cross-origin POST rejected with **no row created**; 415 spoofed
      content-type; 413 oversize + truncated-part; GET immutability, ETag
      304, nosniff/CSP headers, 404 shapes; `/favicon.ico` and
      `/apple-touch-icon.png` default vs override vs dangling-override
      fallback vs missing-iconsDir 404.
    - `src/server/__tests__/admin-routes.test.ts` — extend (route-level
      `PUT /api/settings` coverage lives here): favicon set / replace deletes
      old row / unknown id 400 / clear → null + row deleted; icon form fields
      present, preview shows override / missing state.
    - `src/server/__tests__/settings.test.ts` — extend: `favicon_media_id`
      parse/serialize/round-trip, corrupt → null, revision bump.
    - `pages-html.test.ts` — reader + editor heads carry the bundled tags by
      default and the override tags when set; reader ETag changes when the
      favicon setting changes (NOT duplicated in app.test.ts — chrome is
      exercised there already; one new assertion each).
    - `src/shared/__tests__/slug.test.ts` — reserved list cases.
    - `media-pg.integration.test.ts` — gated on `WN_TEST_PG_URL` like
      pages-pg: byte round-trip, CHECK rejects `image/svg+xml`, delete.
22. **Docs** — `docs/api.md`: media routes + settings field + env knob +
    reserved-segment list (also fix the PRE-EXISTING drift: api.md's reserved
    list omits `favicon.ico` while architecture.md has it); trust-model note
    (media is public, sequential ids, public-by-guessing once any HTML
    references it — future editor images inherit this; `limits.fileSize` is
    the only effective body ceiling for multipart; fastify's 1 MiB `bodyLimit`
    does not apply to streamed multipart). `docs/architecture.md`: diagram
    (`/api/media`, `/media/{id}`, `/icons/*`, `media` table), source-layout,
    routes table, reserved segments. `docs/theming.md`: one line that
    favicon chrome is settings-driven (not `--wn-*` tokens, no viewer-CSS
    change) — courtesy note, not a doc-rule trigger.
    Coverage gate note: `media-pg.ts` branches only execute under
    `WN_TEST_PG_URL` — run the 80% threshold gate with Postgres reachable
    (per AGENTS.md local-validation command), not bare `npm test`.

## Steps

1. **Manifest fix** — `public/icons/site.webmanifest` srcs/names. (Icons
   already vendored.)
2. **Reserved segments** — `src/shared/slug.ts` + `slug.test.ts`.
3. **Migration + media repositories** — guarded `004_media.sql`, contract,
   memory, pg; pg integration test.
4. **media-types module** — sniff + dimensions + caps + unit tests.
5. **Settings field** — `faviconMediaId` parse/serialize/update + service
   tests.
6. **Config env + dep** — `MEDIA_MAX_BYTES` (config test default), `.env.example`,
   `npm install @fastify/multipart` (+ lockfile commit).
7. **Upload + serving + blind-icon routes** — `routes/media.ts` per item 14,
   app wiring per item 16; `media.test.ts`.
8. **settings-api favicon handling** — validation, existence check, guarded
   old-row cleanup; admin-routes.test.ts extensions.
9. **Icons builder + both heads + admin page** — `render/icons.ts`,
   layout.ts, editor-shell.ts, pages-html `chrome()` AND admin.ts's own
   renderLayout call; head/ETag assertions; admin UI + script.
10. **Bootstrap + Docker** — `index.ts` wiring, Dockerfile `COPY public`;
    `docker build` + compose smoke if docker available locally (else note
    CI).
11. **Docs** — item 22.
12. **Full validation** — `npm run typecheck && npm run lint &&
    WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes
    npm run test:coverage && npm run build`; manual smoke: `npm run dev` →
    `/` has default icon tags; `/admin` upload swaps them + preview;
    `/media/{id}` headers; `/favicon.ico` follows override; Remove restores
    defaults.

## Risks & gotchas

- ⚠️ **Reserved segments vs existing pages** — adding `media`/`icons` makes
  pages at those prefixes unreachable (router shadows them, slug validation
  rejects writes). Mitigated by the migration-004 guard (loud failure, not
  silent bricking) — verified no such pages exist in the local DB during
  implementation.
- ⚠️ **`decorateReply: false` on the second static mount** is load-bearing
  (boot crash otherwise) — the `/icons/` mount exists in production only
  when the dir is present; blind icon routes deliberately use `node:fs` and
  work in all environments.
- ⚠️ **Dangling override** (uploaded, never set / set from a restored DB
  without the media table — impossible in single-DB restores, possible only
  via a crashed two-step flow): link tag 404s (browser default icon),
  `/favicon.ico` self-heals to bundled, admin page names the state. No
  render-path existence check (that would put a DB hit per page render).
  Accepted.
- ⚠️ **`reply.sendFile` is only decorated when the `/assets/` mount
  registers** (absent in tests) — another reason the fs-based blind-icon
  path exists; do not "simplify" it back to sendFile later.
- ⚠️ **2 MiB cap / raster-only / apple-touch scaling** — iOS prefers opaque
  180² PNGs; we serve whatever was uploaded for that role (browsers scale
  down fine, up less so). Raising the cap for the editor iteration is the
  documented one-liner; size/type/dimension validation is shared.
- ⚠️ **Multipart DoS posture** — guards at `onRequest` (no parsing pre-auth),
  hard `files/fields/parts/headerPairs` limits, `truncated` → 413, dimension
  caps. bytea materializes per uncached request; `/media/{id}` is
  immutable-cached and blind routes carry `max-age=3600`, so steady-state DB
  load is ~nil; documented.
- ⚠️ **No CSRF token concept** — same posture as the settings API:
  `SameSite=Lax` cookie + `requireSameOrigin`; the admin upload is
  same-origin JS fetch.
- ⚠️ **Coverage gate** — run with `WN_TEST_PG_URL` (pg-only branches), per
  AGENTS.md.

## Out of scope (explicit)

- Editor inline image insertion (next iteration, same subsystem: toolbar/
  paste handler calling `POST /api/media` + `![](/media/{id})` insertion —
  `isSafeImageUrl`'s same-origin relative-URL rule already accepts it, so no
  renderer grammar change).
- Media listing/management UI, ref counting / GC sweep, per-user quotas, SVG,
  content-addressed dedup (a re-upload of identical bytes makes a new row —
  fine at icon sizes).
- `manifest.json` theming/PWA polish beyond wiring the bundled manifest;
  installed-PWA icon updates under an override.
- Serving the bundled defaults under root paths (only `/icons/*` + the two
  blind-request routes).
