# Architecture

WorldNotes is a single Fastify application: a Postgres-backed pages store, an
OIDC auth layer with per-account roles, a server-rendered read path for
visitors (anonymous access can be switched off from `/admin`), and a
client-side inline markdown editor that **replaces** the read view for
editors/admins (the editor lives at `/{slug}` too).

```
Browser (anonymous)                  Browser (authenticated)
   │ GET /{slug}  (SSR, ETag)          │ GET /{slug} → client editor bundle
   ▼                                   │ PUT /api/pages/{slug} (If-Match)
┌──────────────────────────── Fastify ────────────────────────────┐
│ core static renderer (SSR) ── bounded LRU + ETag                │
│ / → home|index · /all · /search/{terms} · /{slug} catch-all    │
│   (editor for editor|admin, LAST) · 404/403 status documents  │
│ OIDC RP (state+PKCE+nonce) ── AES-GCM cookie sessions (claims)  │
│ role resolver ── users row per request (sole req.user writer)   │
│ /api/pages CRUD ── requireRole(editor|admin) + same-origin      │
│ /api/settings, /api/users/role ── requireRole(admin)            │
│ login-only gate ── settings.requireLogin (HTML 403 / JSON 403)  │
│ /api/settings ── SettingsRepository ── key/value table          │
│ /api/users/role ── UsersRepository (advisory-locked guard)      │
│ /api/media[/photos] ── MediaRepository (pg bytea) ── /media/{id}│
│ /api/themes CRUD ── ThemeService/ThemesRepository ── requireRole(admin) │
│ @fastify/static /assets/* (dist/client) · /icons/* (public)     │
└──────────────────────────────────────────────────────────────────┘
                              │ pg pool + advisory-locked migrations
                              ▼
              PostgreSQL `pages`, `settings`, `media`, `users`, `themes`
```

## Source layout

| Directory     | Runs in        | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`   | browser + node | The ONE render engine: line tokenizer + document-level **block pass** (`document.ts` — fenced code, pipe tables as multi-line regions), content plugins (each with an interactive `render()` and a static `renderToHTML()`; block plugins add a declarative `BlockDef`), interactive DOM renderer (`renderer.ts`/`line-renderer.ts`) + DOM-free static renderer (`static-renderer.ts`, used by the SSR read path), shared DOM↔source text model (`content-text.ts`), editor DOM/state/render/navigation/lifecycle, editing shortcuts (`editor-keymap.ts` + pure `editor-text-ops.ts`/`editor-format.ts`), plugin registry, `PageBuffers` (content model), `PageStore` contract, editor stylesheets (`styles.ts`) |
| `src/client/` | browser        | Editor bootstrap: `main.ts` mounts the editor over `api-page-store.ts` (fetch + versions + conflicts) and builds the header actions (Search / All pages / Admin — admins only / sign-out)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/server/` | node           | Fastify app: config, auth (OIDC/sessions/role resolver/login gate), DB (pool/migrations/repositories incl. users), render (reader adapter over core static renderer, layout, status documents, title extraction), routes, LRU cache                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/shared/` | both           | Env-agnostic code: `slug.ts` policy, `roles.ts` (role enum, single source of truth), `url-policy.ts`, `url-helpers.ts`, `dto.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

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
  that invariant and writable only via `PUT /api/settings` (**admin role** —
  see `docs/api.md` trust model). The `/admin` page omits the bands so
  broken branding can never hide the recovery form.
- **Nav-page links are engine-extracted chrome:** the `navSlug` setting
  designates a page whose top-level list items containing internal links
  become header nav links (reader layout + editor shell). Extraction
  (`src/server/render/nav.ts`) rides the ONE engine — `buildDocument` + the
  shared inline scan — so list-marker grammar, fence/table regions, and
  image-vs-link precedence can never drift from the rendered page; hrefs are
  `validateSlug`-gated (the same charset guard that makes wiki-link hrefs
  injection-safe). The parse is memoized in the render cache under
  `nav:{slug}`; a nav-page write evicts it, a `navSlug` change is
  self-busting (different key + settings revision). Chrome, not renderer
  grammar.
- **Link state (existing vs missing page) rides the ONE engine, with
  existence resolved BEFORE render:** internal links (`[[wiki]]` and
  `[text](internal)`) get `wn-link-missing` when the target is known not to
  exist — chosen in one place (`plugins/link-class.ts`, `wikiLinkClass`) for
  both plugins and both surfaces, driven by an optional `pageExists(slug)`
  on `StaticRenderContext` / `EditorContext` (`true`/`false`/`undefined`;
  **unknown renders like an existing page** — a false "missing" is worse than
  a missed one). Reader: `render/reader.ts` collects the document's link
  slugs (`core/link-slugs.ts` records what the plugins ask during a real
  render, so nesting/fences cannot drift), answers them with ONE
  `PagesRepository.existing()` query, and renders synchronously with the
  result. Because cached article HTML now depends on OTHER pages' existence,
  `app.ts` `invalidate(slug, change)` clears the whole render cache on page
  create/delete (`PageWriteChange` from `routes/pages-api.ts`); content-only
  writes keep per-slug eviction. Editor: `EditorOptions.pageExists` is a
  `PageExistenceResolver` (core stays transport-agnostic); the client's
  `link-existence.ts` seeds from the shell embed (`#wn-page.linkExists`,
  computed server-side with the same `resolveLinkExistence`), batches
  further lookups to `GET /api/pages-exist` (150 ms debounce, 60 s
  staleness, failures stay unknown) and records its own saves/deletes. Answers
  arriving after render re-class links IN PLACE (`link-existence-sync.ts`),
  never by re-rendering (caret/selection safety). Styling is CSS-only
  (`styles.ts`; tokens in `docs/theming.md`).
- **Page titles are one rule, `core/page-title.ts`:** a page's title is its
  first H1 (block-aware, so fenced `# x` never counts), else its humanized
  slug. The server stores it in `pages.title` on every create/save/move
  (request bodies carry no title). Reader: the tab title is the stored
  title, and every breadcrumb crumb is its ancestor's stored title (one
  `PagesRepository.titles()` query on a cache miss; crumbs are cached with
  the article and mixed into the ETag; a save that changes a title reports
  `PageWriteChange` `retitled`, which clears the render cache like
  create/delete). Editor: crumbs come from the page's buffer when loaded
  (live while the H1 is typed), else `EditorOptions.pageTitles`
  (`PageTitleResolver`; the client's `page-titles.ts` seeds from
  `#wn-page.titles` and asks `GET /api/page-titles` once per slug), else
  the humanized slug; `onTitleChange` drives `document.title`.
- **Favicon & uploads are server chrome, not renderer grammar:** the icon
  `<link>` tags come from `render/icons.ts`, fed by the `faviconMediaId`
  setting, and are emitted synchronously in BOTH the reader head
  (`render/layout.ts`) and the editor shell head — never client-side, so
  `EditorShellConfig` (shared `dto.ts`) is unchanged. Uploaded images live in
  the Postgres `media` table (`MediaRepository` pg/memory pair) served
  immutably at `/media/{id}`; the upload gate (`media-types.ts`) trusts magic
  bytes and declared dimensions, never the client's content type. The
  `public/icons/` set ships in the Docker image; `/favicon.ico` and
  `/apple-touch-icon.png` are explicit routes (registered before the SSR
  catch-all, which would otherwise 404 them as invalid slugs) reading
  `node:fs` directly — NOT `reply.sendFile`, which is only decorated when the
  `/assets/` static mount registers (never in tests). `@fastify/static` is
  skip-override, so the second mount uses `decorateReply: false` (a duplicate
  `sendFile` decorator would throw at boot). No core/rendering change.
- **Themes are an admin-trusted CSS sink (second raw sink, after the
  bands):** `themes` rows (`ThemesRepository` pg/memory pair, validation in
  `src/server/themes.ts`) hold raw CSS; the active one is the
  `activeThemeId` setting. `ThemeService.activeCss()` (memoized, cleared on
  every theme write) feeds `LayoutOptions.themeCss` on every reader surface
  — emitted as `<style id="worldnotes-theme">` AFTER the default sheet — and
  `EditorShellConfig.themeCss`, which the client hands to
  `EditorOptions.themeAppend` so `injectStyles` (`editor-dom.ts`) appends the
  same-id style directly after `#worldnotes-styles` (the older `theme` option
  still REPLACES the base sheet and is untouched). Reader ETags hash the theme
  CSS; `/admin` is deliberately passed no `themeCss` (anti-lockout). Admin
  `?previewTheme=<id>` is resolved per request in `routes/pages-html.ts`
  (`resolveTheme`) and forces `no-store`/no-304. No renderer grammar changes.
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
The debounce captures its page at SCHEDULE time, not fire time — a save
still pending when the user navigates persists the page that was TYPED ON
(fire-time `getCurrentPage()` would instead POST the destination's seeded
buffer and silently skip the originating page's edits).

**Wiki-link resolution (relative vs root):** `[[beta]]` resolves under the
page it is written on, `[[/beta]]` from the site root, and the configured
home page (served at `/`) resolves relative targets from the root. The rule
lives in ONE env-agnostic pair in `shared/slug.ts`: `wikiLinkBase(pageSlug,
homeSlug)` picks the base and `wikiLinkAddress(target, base)` turns a target
into a root-absolute address (`/alpha/beta`). Only the wiki-link plugin knows
a token is a wiki link, so it converts there — `data-page`, the reader
`href`, and `onNavigate` all carry the address — and every downstream
consumer (navigation folding below, `wikiLinkClass`, `link-existence-sync`,
the API store) keeps its single root-semantics fold. The base travels as
`linkBase` on `LinkContext` (shared by `StaticRenderContext` and
`EditorContext`): the editor derives it per render from the current page and
the RAW `homeSlug` option; the server's `createReaderRenderer(pages,
getHomeSlug)` derives it from the page slug every caller must pass
(`render(src, pageSlug)`, `linkExistence(src, pageSlug)` for the editor
shell seed; status pages pass their own slug). Nav extraction resolves
under the nav page. `PUT /api/settings` clears the render cache when
`homeSlug` changes. Markdown links keep root semantics. Targets that are not
page addresses (`classifyLinkTarget` in `shared/url-policy.ts` ≠ `internal`:
schemes, `#`, `?`) and targets that fold to nothing are never prefixed, so
navigation refuses them on every page exactly as it does at the root.

**Navigation folding:** every in-editor navigation source (link clicks,
breadcrumb/header nav, popstate, `instance.navigate`) funnels through
`editor-navigation.ts`'s `navigateToPage`, which folds the target through
`navTargetToSlug` (`shared/slug.ts` — the same fold the API store and the
plugins' static hrefs use) BEFORE anything is keyed: buffer keys, trail
segments, the pushState URL, and saves share one canonical slug, so
`[x](/Blog/First-Post)` and `[[blog/first-post]]` open the SAME page. A
target that cannot fold (empty, non-latin like `[[中文]]`, a reserved route
like `/all`, or an absolute URL — refused pre-fold, since `slugify` would
otherwise mangle `https://x/y` into a junk `https/x/y` page) is REFUSED with
a warning toast: the reader renders such targets as literal text, and opening
a raw-keyed phantom buffer would produce a page that can never persist.
Missing pages are not a dead end: navigation opens a seeded
`# Human Title` editor and the create-on-save flow persists the first edit
(the client has no 404 status page and no create dialog; the reader keeps
its plain anonymous 404). `loadPage`'s store load is wrapped in
`try/finally` + a failure toast — a network error can neither freeze the
input handler (`isNavigating` stuck) nor surface as an unhandled rejection.
**No-blank-pages invariant (route-level):** a PUT whose content is
whitespace-only deletes the page (version-guarded `deleteIfMatch` → 204, so
a stale client can never destroy newer content); blank/absent POSTs are
refused (400). The editor stays on the deleted page with a _Page deleted_
toast — the store drops the tracked version, so undoing or typing again
recreates the page through the create path; a blank save of a never-created
page performs no network at all. Undo granularity is per input batch
(snapshot), not per character — an accepted trade-off after removing Yjs.

## Keyboard handling

Keydown flows through ONE ordered pipeline in
`editor-lifecycle.ts`, with the binding table (single source for the help
overlay + `docs/shortcuts.md`) exported from `editor-keymap.ts`:

1. **Undo/redo** chords (`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`).
2. **Editing keymap** (`editor-keymap.ts`): line move/duplicate/delete,
   word delete/motion, bold/italic/underline/link wrapping (also exposed as
   `format(action)`, the one path the toolbar buttons share with the
   chords), `Ctrl+A` (page body
   only, never the chrome), `Ctrl+S` save flush.
   Selections map DOM ↔ raw offsets through the direction-biased
   two-ended mapping in `caret-offset.ts` (`getSelectionOffsets` /
   `setSelectionOffsets`; end-biased fallbacks so a range end on a line
   boundary maps to covered text, never the next line's start). Ops
   compute on pure document strings (`editor-text-ops.ts`,
   `editor-format.ts`) and commit through `commitModelEdit`
   (`editor-commit.ts`). Un-mappable selections and formatting inside block
   regions are consume-and-noop.
3. **Plugin `onKeydown`** dispatch (syntax behavior: list-item Tab/Enter
   continuation; unmodified chords only).
4. **Plain-key fallbacks** (Tab insert, Enter newline, single-code-point
   Backspace) — all modifier-guarded, so `Ctrl+Backspace` etc. can never
   leak into the naive path, and all model commits (an un-mappable
   selection changes nothing).

**Formatting toolbar.** `editor-toolbar.ts` fills the `wn-toolbar` row
(created by `editor-lifecycle.ts`, not a UIPlugin: buttons need the model-commit
path). Each button calls `EditingKeymap.format(action)` — the same code as its
chord — so toggling, the single undo step, autosave and inert-in-blocks can't
drift. `mousedown` is cancelled so a press never blurs the editor or collapses
its selection. Enabled/pressed state is derived from the markdown source
(`activeFormats` in `editor-format.ts`) on `selectionchange`, never from DOM
styling.

**Link field.** The toolbar's **Link** button and `Ctrl+K` both call
`editor-link.ts` `open()`: it captures the selection offsets AND the page text,
opens `link-field.ts` in the toolbar row (a combobox like the page-move field),
and on a valid answer applies the link through `commitModelEdit` — dropping it
without a write if the page or its text changed while the field was open.
Input classification and link construction are the pure `link-input.ts`
(URL vs wiki target, `isSafeHref`, slug fold under the current page's link
base, `findLinkAt` for editing an existing link). Page-name suggestions come
from the optional `PageStore.suggest`, which `ApiPageStore` serves from
`GET /api/pages?scope=name` (slug/title only, so body matches cannot crowd
out pages named like the query).

**Model commits.** `editor-commit.ts` is the ONE path for edits the editor
defines itself: `commitModelEdit` = `setPageText` (one undo step) → forced
render → restore caret-or-selection → scroll the caret line into view →
debounced save (plugins' `onUpdate` follows the render); `replaceSelection`
wraps it for "replace the selection with text". Besides the keymap and the
fallbacks, a `beforeinput` handler routes typing over / deleting a
**non-collapsed** selection here (`insertText`, `insertParagraph`,
`delete*`, `deleteByCut`). The browser's own version removes the text but
keeps the emptied `div[data-line]` shells (deleted lines return as blank
lines), and a range cutting into a `data-raw` span loses the edit.
Collapsed carets stay native (spellcheck/autocorrect); composition and
`insertReplacementText` are never intercepted.

**Selection is model state.** `render()` without an explicit caret target
restores a live range selection by raw offsets (direction kept, clamped to
the text; its focus end picks the active line) instead of collapsing it.
Line activation is frozen while the primary mouse button is down (a rebuild
at drag start detaches the browser's drag anchor); one check runs at
mouseup. Plain `ArrowUp`/`ArrowDown` chains keep a goal x across
line-activation rebuilds (which reset the browser's own memory) and
re-apply it on each landed line via `caretPositionFromPoint`.

**Clipboard carries source.** The rendered DOM deliberately differs from
the markdown (wiki links show labels, bullets a glyph, table pipes and image
URLs are hidden), so `copy`/`cut` never let the browser serialize it: they
write `text/plain` from the buffer slice at the selection's raw offsets,
and cut deletes through `commitModelEdit` (one undo step). An empty
selection copies/cuts the caret's whole line incl. its break; pasting that
exact text back with a collapsed caret inserts it as a line above
(VS Code/CodeMirror line-wise semantics). Paste reads `text/plain`, else
`text/uri-list`, normalizes `\r\n?` → `\n`, and commits via
`replaceSelection` — never DOM insertion (text placed inside a `data-raw`
span would be swallowed by extraction). Selections reaching outside the
editor are left to the browser. No `text/html` flavor is written yet.

**Photos: convert in the browser, validate on the server.** When
`EditorOptions.imageUploader` is set (the client passes
`createMediaUploader()`), `editor-lifecycle.ts` routes image pastes, file
drops and `instance.insertImages(files)` (the toolbar picker's entry point)
through `core/editor-image.ts`. Core never touches the network: the
uploader (`client/media-upload.ts`) first runs `client/photo-convert.ts`
(`createImageBitmap` with EXIF orientation → canvas downscale to
`PHOTO_MAX_SIDE` = 2048 px → PNG; a PNG that already fits is sent as-is), then
POSTs it to `POST /api/media/photos`. The paste rule: an image on the
clipboard wins unless the clipboard also carries both `text/plain` and
`text/html` (Word/Excel attach a rendered PNG next to real text). Images are
inserted as `![name](/media/N)` at the start of the selection through
`commitModelEdit` (one undo step each), refused inside fences/tables, and
never inserted into a different page than the one the upload started on.
The server never trusts the client's conversion: `png-sanitize.ts` verifies
the PNG chunk structure and CRCs, enforces the same `PHOTO_MAX_SIDE`
(`shared/media-policy.ts`), and rewrites the file with an allowlist of
chunks (EXIF/text/animation chunks and trailing bytes never reach
Postgres). There is no server-side image decoding and no native
dependency.

**Extension seam for other attachment types (not built).** `media` is a
generic `(media_type, bytes)` store and `GET /media/{id}` serves whatever
type is stored. A new type (PDF, BMP, …) adds a migration widening the
`media_type` CHECK (and a `filename` column if downloads need names), a
server validator in the style of `png-sanitize.ts`, a client converter where
conversion is wanted, and its route. The serve headers will need revisiting
for PDFs (`CSP default-src 'none'` blocks in-browser viewing;
`Content-Disposition`).

`Ctrl+/` + `Escape` are owned by the shortcuts-help overlay UIPlugin
(document capture + stopPropagation), NOT the keymap — single owner, no
double-toggle. See `docs/shortcuts.md` for the user-facing table and
platform caveats.

## Routing

Public, no query strings anywhere:

| Route                                                     | Handler                                                                                                    | Auth                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------- | ---- | ----- |
| `GET /`                                                   | configured home page, else the index listing                                                               | anon ok                         |
| `GET /all`                                                | index (page list + search form island)                                                                     | anon ok                         |
| `GET /search`, `GET /search/{terms}`                      | search form + ILIKE results                                                                                | anon ok                         |
| `GET /admin`                                              | settings form (search, home page, branding, access, Users; bands omitted)                                  | admins (`403` HTML for others)  |
| `GET /edit`, `GET /edit/{slug}`                           | legacy 302s → `/`, `/{slug}`                                                                               | —                               |
| `GET /{slug}` (catch-all, last)                           | editor shell (editor\|admin) / SSR article (viewer/anon); former slug → 301 to the current one; miss → 404 document (customizable) | mixed (anon reads gate)         |
| `GET /api/pages`, `GET /api/pages/{slug}`                 | JSON reads + ETags (former slug → 301)                                                                     | anon ok (403 when login-only)   |
| `GET /api/pages-exist?slugs=a,b`                          | batched existence lookup (≤100 slugs) for the editor's missing-link styling; outside `/api/pages/*` so the slug wildcard cannot claim it | anon ok (403 when login-only)   |
| `GET /api/page-titles?slugs=a,b`                          | batched stored-title lookup (≤100 slugs) for the editor's breadcrumb labels; outside `/api/pages/*` likewise | anon ok (403 when login-only)   |
| `POST/PUT/DELETE /api/pages[/{slug}]`                     | writes; `requireSameOrigin` + `requireRole(editor,admin)`; former slug → 409 `{movedTo}`                   | editors                         |
| `POST /api/page-moves`                                    | move a page + subtree, rewrite links, leave aliases; outside `/api/pages/*` (see Page moves)               | editors                         |
| `PUT /api/settings`                                       | instance settings write; `requireSameOrigin` + `requireRole(admin)`                                        | admins                          |
| `GET/POST /api/themes`, `GET/PUT/DELETE /api/themes/{id}` | theme gallery CRUD (409 deleting the active theme); `requireRole(admin)` (+ `requireSameOrigin` on writes) | admins                          |
| `PUT /api/users/role`                                     | guarded role change; **strict** Origin (no Origin-less pass)                                               | admins                          |
| `POST /api/media`                                         | multipart upload; sniff + size/dimension caps                                                              | editors (`onRequest`)           |
| `POST /api/media/photos`                                  | PNG-only upload (browser-converted); chunk validation + metadata strip, ≤ 2048 px, `PHOTO_MAX_BYTES`      | editors (`onRequest`)           |
| `GET /media/{id}`                                         | stored bytes, immutable cache + hardening headers                                                          | anon ok (gated when login-only) |
| `GET /favicon.ico`, `GET /apple-touch-icon.png`           | blind-request favicon (override row or bundled `public/icons/`)                                            | anon ok                         |
| `GET /oidc/login                                          | callback                                                                                                   | logout`, `GET /api/me`          | auth | mixed |
| `GET /assets/*`                                           | built client bundle                                                                                        | anon ok                         |
| `GET /manifest.webmanifest`, `GET /sw.js`                 | PWA manifest + network-only service worker (offline fallback page, no Cache API); `render/pwa.ts` + `routes/pwa.ts` | anon ok (never gated)           |
| `GET /healthz`                                            | liveness                                                                                                   | anon ok                         |

Slugs are lowercase `[a-z0-9-]` segments (`blog/post-name`), validated by a
shared `validateSlug()` **and** a DB `CHECK` constraint. Nesting is cosmetic:
no parent must exist; breadcrumbs follow segments, each crumb labelled with
that page's title (its humanized segment when the page does not exist). First segments
`api, oidc, edit, search, assets, static, healthz, favicon.ico, icons, media,
all, admin`
are reserved.

### Page moves

A page keeps its identity (`pages.id`) when its slug changes. `POST
/api/page-moves` (`routes/pages-api.ts`) relocates a page **and its
subtree** in one `PagesRepository.move` call — on Postgres a single
transaction under `pg_try_advisory_xact_lock('wnmv')` (a second concurrent
move answers "busy" instead of queueing on a pool connection) with `FOR
UPDATE` on the moved rows and every row whose content contains `[` (planning
shared with the memory repo in `db/page-move.ts`). Inside it:

- **Links are rewritten through the ONE engine.** `src/core/link-rewrite.ts`
  (DOM-free) walks `buildDocument` output — fence lines stay verbatim — and
  asks the link plugins' `rewriteLink` hook (`wikiLink.ts`, `link.ts`; the
  grammar never leaves the plugins). Container plugins are not special-cased:
  their `renderToHTML` runs with a recording `renderInline`, which reveals
  exactly the inner text the engine treats as inline markdown, and rewritten
  inner text is spliced back into the token raw (an unlocatable splice keeps
  the token byte-exact). Rewritten targets keep their author's style
  (`styleLinkPath`/`rewriteWikiTarget` in `shared/slug.ts`); a link is
  rewritten only when it pointed at a moved page and no longer resolves to
  its new slug, so relative links inside the moved subtree stay untouched.
- **Aliases.** Every old slug gets a `page_aliases` row pointing at the page
  id (no redirect chains; cascade on delete; a move onto an alias reclaims
  it). Page and alias slugs are kept disjoint by the repository. The read path
  301s aliases (`pages-html.ts` `redirectIfMoved`, before the editor shell
  could seed a page over one); the JSON API 301s reads and answers writes
  `409 {movedTo}` — never 404, because the edit client's 404 → recreate path
  would resurrect the old page. `existing()` counts aliases, so links to
  them never render as missing.
- **Settings follow** the page (`homeSlug`, `navSlug`, `notFoundSlug`,
  `forbiddenSlug`) right after the transaction commits, judged against the
  settings as they are then; `onWrite(…, 'moved')` clears the render cache
  first (existence changed for two slugs), so a failing settings write — logged,
  move still 200 — cannot leave stale reader HTML. An anonymous `/` whose home
  setting still names a former slug redirects like any alias.

Editor side: the current page's breadcrumb crumb (or "Move page…" in the
header menu, `chrome.ts`) opens `core/page-move-field.ts` in place of the
breadcrumb — input folded like a wiki target, inline slug-policy errors, Enter
moves, Escape/blur cancels. `core/editor-page-move.ts` then **flushes the
pending and in-flight saves first** (`editor-lifecycle.ts` `flushSaves`; the
debounced save captures its page at schedule time and would otherwise land
on the old slug) and refuses to move when that flush failed. It calls the
optional `PageStore.move`, re-keys moved buffers (undo history kept,
`PageBuffers.renamePage`) **together with any save still pending for them**
(`retargetSave` — text typed while the move was in flight is saved under the
new slug; `saveNow` never saves a page the editor no longer holds, whose
empty text would read as a deleting blank save), drops buffers of rewritten
pages, reloads the current page if its own text was rewritten and nothing was
typed during the move, moves the trail, and fires `onPageMoved` BEFORE
repainting — so `main.ts` replaces the URL and `onTrailChange` never pushes a
history entry. A move made elsewhere
reaches a stale tab as a save answered `409 {movedTo}`: `ApiPageStore`
re-keys its version, retries once at the new slug and reports `onMoved`
(→ `EditorInstance.pageMoved`). Navigation follows known/learned aliases via
`PageStore.canonicalOf`. Moving the configured home page reloads the editor
(its `homeSlug` option is static).

## Auth

Generic OIDC authorization-code flow via `openid-client` v6: discovery,
`state` + PKCE (S256) + `nonce` (ID-token replay binding); `iss`/`aud`
validation by the library; `sub` is the stable identity stored in the session
and on rows (`updated_by`). Sessions are AES-256-GCM sealed cookies
(encrypted, httpOnly, SameSite=Lax, `Secure` in prod, exp enforced, multi-key
rotation). Callback `returnTo` is restricted to same-origin app paths
(open-redirect guard). `AUTH_DISABLED=1` injects a dev identity (role
`admin`) and refuses to boot in production.

**Roles** (`shared/roles.ts`: viewer | editor | admin) are NOT sealed into
the cookie. The session parser stores claims in `req.sessionClaims`; the
role resolver (`auth/roles.ts`) is the **sole writer of `req.user`** — one
indexed `users`-table SELECT per authenticated request (`ensure()` inserts
only on a miss, so GETs never write), publishing `req.user = {claims, role}`.
Structurally, a user object without a role cannot exist, and
`requireRole(...)` fails closed. Login metadata (`email`/`name`/
`last_login_at`) refresh at `/oidc/callback` (`recordLogin`), the only place
a "login" happens. Provisioning on insert: `admin` if the sub is on
`BOOTSTRAP_ADMIN_SUBS` or the table is empty (first login = admin; the grant
is logged at `warn`), else `DEFAULT_ROLE`. Both races that matter — the
bootstrap winner and the last-admin lockout — are serialized by a
`pg_advisory_xact_lock` (key `'wnus'`) inside the repository; the guarded
`setRoleGuarded` is the only role setter.

**Login-only mode** (`auth/login-gate.ts`): a settings flag read per request
(not static wiring). HTML read routes answer anonymous requests with the
`403` sign-in document (custom page when `forbiddenSlug` is set; unmatched
`/api|/oidc|/assets` wildcards keep JSON answers); JSON/media reads answer
`403 {error:"login required"}`. The gate runs at preHandler, before the
render cache is consulted, and authenticated cache headers flip to `private`

- `Vary: Cookie` while gated. Status documents (`render/status-page.ts`)
  compose through `renderLayout`, so they inherit chrome — and the chrome
  never points anonymous visitors at override `/media/` URLs in this mode.
  Designated status pages are public surfaces by definition (docs call this
  out loudly in the admin form and in `docs/api.md`).

## Caching

`src/server/cache.ts`: bounded LRU (max entries + TTL). Page entries store
renderer output (auth-independent); layout chrome is composed per request and
responses carry `Vary: Cookie` (the editor/reader split now lives on the same
URLs), so ETags track article bytes **plus a settings revision and the
extracted nav links** — branding
(`siteName`/`headerHtml`/`footerHtml`), nav toggles, and nav-page links
re-render the chrome on
every request, and the revision stamp ensures a settings change busts browser
revalidation instead of 304-ing stale chrome indefinitely. Writes (any page
route) invalidate `p:{slug}`, the index, and `nav:{slug}`. Settings are read per-request
(cached in the `SettingsService`); changing them leaves the article caches
intact (they stay settings-independent) but advances the revision mixed into
every ETag. Responses carry `ETag` + `Cache-Control: public, max-age=60,
stale-while-revalidate=300`; `If-None-Match` → 304. **4xx is the exception:
404 documents answer `no-store`** — a stale 200 is cosmetic, a cached 404 is
a WRONG answer that outlives its cause (e.g. re-enabling the all-pages
listing), and the 304 shortcut is 200-only by design so a no-store 404 never
negotiates. Single-process scope —
with multiple server instances, each process caches settings in memory and
revisions diverge; branding on every page makes that failure mode visible.

## Database

`migrations/NNN_*.sql` applied at boot inside a transaction under
`pg_try_advisory_lock` (concurrent boots safe), tracked in
`schema_migrations`. `001_init.sql` creates `pages(slug UNIQUE CHECK, title,
content, version, created_at, updated_at, updated_by)` + index on
`updated_at DESC` and seeds the `home` page (fixed in `002` to store real
newlines); `003_settings.sql` adds a `settings(key PK, value, updated_at,
updated_by)` key/value table for instance settings; `006_themes.sql` adds
`themes(id, name UNIQUE, description, css ≤ 64 KiB, timestamps)`;
`007_page_aliases.sql` adds `page_aliases(slug PK CHECK, page_id → pages.id
ON DELETE CASCADE)` — former slugs of moved pages.
After the SQL files, `db/title-backfill.ts` runs once (recorded as
`schema_migrations` row `titles-from-first-h1`, under the same advisory lock
key): it recomputes every stored `pages.title` with the core title rule
(`core/page-title.ts`: first H1, else humanized slug) without touching
`version`/`updated_at`.
`PagesRepository`,
`SettingsRepository` and `ThemesRepository` each have two implementations (`-pg` production, `-memory`
tests); route tests run against memory, CI also runs the pg suite against a
service container (`WN_TEST_PG_URL`). The page-move contract runs against
both (`__tests__/helpers/move-contract.ts`).

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
