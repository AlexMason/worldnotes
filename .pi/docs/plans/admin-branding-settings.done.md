# Plan: Admin Branding Settings (site name, header/footer HTML) — REV 2

Date: 2026-09-20 (per `date -u`)
Branch: `feature/admin-branding-settings`
Status: REVISED after dual reviewer subagent critique — awaiting approval

## Goal

Expand instance settings with **site name**, **header HTML**, and **footer HTML**:

- `siteName` appears in the browser tab title and replaces the "Home" label in
  the breadcrumb bar (reader + editor).
- `headerHtml` / `footerHtml` accept **raw, admin-trusted HTML** rendered
  **inside `<main>`** (header above the body, footer below), on **all reader
  pages** and (as flex bands) in the **editor shell**.

## User decisions (locked)

| Question | Decision |
|---|---|
| Site name placement | Tab title + replaces "Home" crumb label |
| HTML trust | Raw, admin-trusted (no sanitization) |
| Header/footer placement | Inside `<main>`, content between the blocks |
| Scope | All pages: reader, index, search, admin, editor shell |

Pending user decisions (from review): D1 bands on `/admin`? D2 admin allowlist?

## Approach

Extend the existing key/value settings service (`src/server/settings.ts`) with
three fields normalized by **one shared `normalizeSettings()` used on BOTH the
read and write paths** (no DB migration — settings are key/value rows).
Branding flows into every reader page through the `chrome()` helper, into the
admin page directly, and into the editor shell via embedded config +
server-rendered flex bands. The reader ETag gains a **settings-revision
stamp** so branding changes bust client revalidation (reviewers found the
article-only ETag would otherwise serve stale chrome *indefinitely* via 304 —
not the ≤60 s window the draft assumed). The title rule lives in
`src/shared/doc-title.ts` so reader, shell, and client share one
implementation.

## Files & Steps

1. **`src/shared/doc-title.ts`** (new) —
   `composeDocTitle(title, siteName): string`:
   `!siteName || title === siteName ? title : `${title} — ${siteName}``.
   Pure, node-project unit-tested (client bundle is coverage-excluded, so this
   is where the rule gets pinned).

2. **`src/server/settings.ts`** — model + validation + revision
   - `AppSettings` += `siteName: string`, `headerHtml: string`,
     `footerHtml: string`; keys `site_name`, `header_html`, `footer_html`.
   - Defaults: `siteName: 'WorldNotes'` (deliberate behavior change: every
     reader tab becomes `Page — WorldNotes`; index title stays the site name),
     header/footer `''`.
   - **`normalizeSettings(raw: Partial<AppSettings>): AppSettings`** — single
     normalizer shared by `parseSettings` (read/boot) AND `update()` (write),
     so `PUT {siteName: '  '}` persists the default, not `''`:
     - siteName: reject control chars (`[\x00-\x08\x0B\x0C\x0E-\x1F]`),
       collapse `\r\n\t`+ runs to single spaces, trim, cap 200,
       empty → default.
     - header/footer: reject control chars, cap 20 000; stored verbatim —
       **raw HTML by design, admin-trusted** (comment states this; the cap
       also clamps corrupt over-long DB rows on the read path by truncation).
   - `update()` validates types, runs `next` through
     `normalizeSettings`-equivalent field normalizers BEFORE persisting and
     before `current = next`.
   - **Revision counter**: `let revision = 0` in the service closure;
     `revision++` after a successful `update()`; expose `getRevision(): number`
     on `SettingsService`. (Persisting it is unnecessary: the in-memory cache
     is per-process and a restart re-reads rows anyway; the stamp only needs
     to change within a live process.)

3. **`src/server/routes/settings-api.ts`** — accept the three new optional
   string fields; 400 on non-string; distinguish validation errors from
   unexpected repository failures (500 `{error:'failed to save settings'}`)
   so driver messages never leak through the current blanket 400.

4. **`src/server/render/layout.ts`** — reader chrome
   - `LayoutOptions` += `siteName: string`, `headerHtml: string`,
     `footerHtml: string` (required — all production callers supply them via
     settings; `''` siteName = no suffix / `'Home'` crumb label).
   - Title via `composeDocTitle` (shared helper from step 1).
   - Breadcrumb: any crumb with `href === '/'` (and the default Home link)
     labels as `siteName || 'Home'`.
   - `<main>` = `${headerBand}${body}${footerBand}` where each band is
     `<div class="wn-site-header">${raw}</div>` /
     `<div class="wn-site-footer">${raw}</div>`, emitted only when non-empty.
     Raw insertion, comment marking layout.ts as a deliberate admin-trusted
     sink.
   - Export **`SITE_BANDS_CSS`** (band rules with literal fallbacks
     `var(--wn-border, #e3ded4)` etc.) + the `:root` palette block from
     VIEW_CSS so the editor shell can reuse them; VIEW_CSS keeps them via
     composition.

5. **`src/server/routes/pages-html.ts`**
   - `chrome()` returns `siteName/headerHtml/footerHtml` from `AppSettings` →
     all eight `layout()` spreads inherit branding. (Note: `admin.ts` builds
     its own chrome — handled in step 6, not automatically.)
   - `renderIndex` `title: 'WorldNotes'` → `settings.siteName`.
   - **ETag fix**: success path responds with
     `etag: hashEtag(`${articleHtml}\n${settingsRevision}`)` using
     `SettingsService.getRevision()` (deps gain `getRevision` or a combined
     `getSettings` that exposes it — prefer passing `() => number`).
     Stale-but-cached `title` value: layout re-renders per request so this is
     only the `<title>` byte inside cached entries — re-check: cached value
     stores `title` separately; keep using `cached.value.title` (page title,
     chrome-free) + compose suffix at layout time. No behavior change needed.

6. **`src/server/routes/admin.ts`** — the settings form
   - Add: site name text input; Header HTML / Footer HTML `<textarea>`s
     emitting `<textarea …>\n${escapeHtml(v)}</textarea>` (leading `\n`
     defeats the HTML parser's newline-strip and is itself consumed).
   - `ADMIN_SCRIPT` sends `siteName`, `headerHtml`, `footerHtml`.
   - Pass `siteName` into `renderLayout`; header/footer bands on `/admin` =
     **per D1** (default plan: omit bands on `/admin` to avoid
     lockout-by-broken-branding; keep siteName crumb/title).

7. **`src/server/shared types`** — define the embedded shell config shape
   once in **`src/shared/dto.ts`** as `EditorShellConfig` (existing fields +
   `siteName`), imported by `editor-shell.ts` and `client/main.ts`
   (`ShellConfig` = `EditorShellConfig`), replacing the drifting literals.

8. **`src/server/render/editor-shell.ts`** — editor SPA shell
   - `EditorShellOptions` += `siteName`, `headerHtml`, `footerHtml`.
   - `<title>` via `composeDocTitle(slugDisplayName(slug), siteName)`.
   - Bands: server-rendered siblings around `#wn-app`, styled with
     `SITE_BANDS_CSS` inlined into the shell `<style>` (the shell embeds no
     VIEW_CSS/palette today — without this the bands are unstyled).
   - Exact flex contract (comment verbatim in code):
     `html,body{margin:0}` · `body{display:flex;flex-direction:column;height:100dvh}`
     · `#wn-app{flex:1 1 0;min-height:0}` · bands `flex:0 0 auto`.
     Why: `#wn-app` gains `.wn-root{height:100%;overflow:hidden}` —
     `flex-basis:0%` supersedes `height` for the main size; `flex:1 1 auto`
     or `height:auto` would break the `100dvh` chain or
     `.wn-editor-wrap` scrolling. `edit-routes.test.ts:85` asserts `100dvh`
     stays in the shell — keep it on `body`.
   - Embed `siteName` in config (bands are server-rendered; client only needs
     the label). Ordering difference vs reader (bands above the editor's own
     header bar vs inside `<main>` below the nav bar) is accepted — the
     editor has no `<main>`; note in `docs/theming.md`.

9. **`src/core/types.ts` + `src/core/editor.ts` + `src/core/editor-render.ts` + `src/client/main.ts`**
   - `EditorOptions` (`types.ts:275`) += `homeLabel?: string`;
     `EditorRenderOptions` (`editor-render.ts:19`) += `homeLabel`;
     pass through in `renderOpts` (`editor.ts:~150`) — all three hops or the
     option is silently dropped;
     `renderBreadcrumb()` (`editor-render.ts:181`) uses
     `options.homeLabel || 'Home'` for the root crumb.
   - `main.ts`: `siteName` in `readShellConfig()` fallback literal (default
     `'WorldNotes'`); pass `homeLabel: cfg.siteName` to `createEditor`;
     the two `document.title = …` sites use `composeDocTitle`. (Drop the
     draft's initial-set — SSR `<title>` already covers first paint.)
   - `src/server/routes/edit.ts` needs NO change (redirects only — earlier
     draft reference removed).

10. **Tests**
    - NEW `src/shared/__tests__/doc-title.test.ts`: suffix/equality/empty rules.
    - `src/server/__tests__/settings.test.ts`: defaults; round-trip;
      write-path normalization (`PUT {siteName:'  '}` → `'WorldNotes'`,
      `' x '` → `'x'`); caps enforced on write AND clamped on read
      (corrupt 5 MB row truncates); control chars rejected; revision bumps
      on update.
    - `src/server/__tests__/admin-routes.test.ts`: new fields in form (incl.
      textarea escaping); PUT persists raw HTML; oversized → 400; repo error
      → 500, not 400.
    - `src/server/__tests__/pages-html.test.ts`: title suffix; `/` crumb
      relabel; bands raw inside `<main>` only when non-empty; index title =
      siteName; **regression test for the ETag fix**: GET → capture ETag →
      PUT new siteName → conditional GET asserts `200`, not `304`.
    - `src/core/__tests__/editor-render.test.ts` (or editor.test.ts):
      `homeLabel` drives the root crumb.
    - EXISTING assertions to UPDATE: `pages-html.test.ts:48` (`<title>` now
      suffixed); `settings.test.ts:47,59–63`; `admin-routes.test.ts:83–91`
      (exact `toEqual` on PUT response + repo dump — three new keys).
      MUST STAY GREEN: `edit-routes.test.ts:85`, surface-parity, corpus
      property tests (chrome-only change).

11. **Docs**
    - `docs/api.md`: PUT `/api/settings` body table — add the three fields
      AND the already-missing `allPagesEnabled` (existing drift); caps;
      raw-HTML trust model; **precise blast radius**: any user the IdP admits
      can inject site-wide scripts readable by anonymous visitors (no roles,
      no CSP); operators must restrict the OIDC audience to trusted admins.
    - `docs/architecture.md`: update the "ETags track article bytes / settings
      are cache-independent" paragraph (revision stamp now mixes into the
      validator); record layout.ts/editor-shell as admin-trusted raw-HTML
      sinks (first such sinks — AGENTS.md plugin-safety invariant predates
      them); single-process settings-cache note now user-visible on every
      page.
    - `docs/theming.md`: `.wn-site-header` / `.wn-site-footer` bands,
      distinct from the editor's `.wn-header`/`.wn-footer`; reader-vs-editor
      band ordering + `100dvh` flex contract addition.

## Deliberate non-goals

- No HTML sanitizer (user decision). No CSP (separate initiative).
- No settings concurrency control: `PUT /api/settings` is last-write-wins;
  two admins editing different fields clobber each other's blobs. Documented
  in `docs/api.md`.
- Auth-flow standalone pages (`auth/routes.ts` error doc) keep the stock
  title/breadcrumb — small hand-rolled docs, not `layout()` consumers.
- Editor bands can't be full-bleed-free... reader bands remain inside
  `<main>`'s 46rem column per the user's placement decision.

## Risks

- ⚠️ **Trust model is "any authenticated user == admin"**: with a shared
  corporate IdP this is site-wide script execution against anonymous
  readers. Mitigations: precise docs (step 11) + optional `WN_ADMIN_SUBJECTS`
  allowlist gated on `/admin` + `PUT /api/settings` → **decision D2**.
- ⚠️ Editor `100dvh`/flex regression risk — exact declarations + comments
  (step 8), but the test harness has no layout engine: final verification is
  a manual real-device check, listed as such.
- ⚠️ Default `siteName: 'WorldNotes'` changes every tab title at once
  (accepted; pinned by updated tests).

## Open questions → user decisions

- **D1**: render header/footer bands on `/admin` too (locked "all pages"
  reading) or omit them there so broken/defaced branding can never bury the
  recovery form? Reviewers recommend omitting (keep siteName).
- **D2**: ship a `WN_ADMIN_SUBJECTS` env allowlist in this change (small,
  config.ts already centralizes env) or only document the IdP-restriction
  requirement?
