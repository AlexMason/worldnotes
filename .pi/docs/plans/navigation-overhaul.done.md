# Plan: Navigation Overhaul — Nav Page Links, Breadcrumb Ellipsis, Accessible Menu

Date: 2026-09-20 (UTC) · Branch: `feature/navigation-overhaul`
Rev 2 — incorporates dual adversarial plan reviews (codebase-verification + design critique).

## Goal

Let admins designate a "Nav" page whose top-level hyperlinked list items become
site-nav links in the header chrome (both reader and editor); make breadcrumbs
degrade gracefully with ellipses when space is tight; and declutter the header
by removing login affordances from site chrome and collapsing the action row
into a `<details>`-based hamburger menu on mobile.

## Interview decisions (locked)

| Question | Decision |
|---|---|
| Nav designation | Admin settings field (`nav_slug`, parallel to `home_slug`) |
| Nav items | Top-level list items containing a link only |
| Link types | Internal page links only (anything else skipped) |
| Link order | Custom nav links BEFORE built-in actions (Search / All pages / Admin / Sign out) |
| Breadcrumbs | Both: per-crumb CSS ellipsis truncation AND middle-collapse for deep trails |
| Login removal | Remove login affordances from **site chrome** (header bar + 404 page); `/oidc/login` remains the only sign-in route (documented); editor session-expiry re-login toast is RETAINED (recovery UX, not a login affordance) |
| Hamburger | `<details>`/`<summary>` element, zero JS |
| Surfaces | Reader + editor mirrored |

## Approach

**Nav extraction rides the ONE engine — no new parser.** `extractNavLinks`
runs `buildDocument(content, defaultPlugins)` (already in the server import
graph via `render/reader.ts`; node-smoke already imports `defaultPlugins` in
node env) and walks the resulting model: lines whose `list-item` token has an
empty indent group are top-level items; their inline tokens are scanned for
the first `wiki-link`/`link` token (tokenizer priority means an image can
never masquerade as a link). Classification reuses the plugin's exported
`classifyLinkTarget` — only `internal` targets survive; wiki targets resolve
through `wikiTargetToSlug`/`validateSlug`, markdown hrefs must be `/`-rooted
valid slugs. Alpha/roman list markers, fence and table regions, and
unclosed-fence semantics all come free from the block pass. A nav page with 300
bullets can't flood the header: **`NAV_MAX_ITEMS = 8`**, labels truncated to
40 chars with `…` (emphasis chars stripped from labels for display).

**Nav caching reuses the existing `RenderCache` — no bespoke revision
machine.** Parsed links are cached under `nav:${slug}` (links are only
re-parsed on a cache miss); the page-save hook already calls
`invalidate(slug)` in `app.ts`, which will now also drop `nav:${slug}`. A
`nav_slug` setting change is self-busting (new key) AND already bumps the
settings revision that reader ETags mix in. The per-request chrome is
`await navService.links()` (all HTML routes are already async); fetch failures
degrade to the last-good snapshot, honoring the settings doctrine "a corrupt
row never breaks the read path." Reader ETags gain a term
`hashEtag(JSON.stringify(links))`, so a nav-page edit busts browser
revalidation of every cached page.

**The hamburger exploits `<details>` hiding only its OWN children.** The
reader renders a summary-only `<details class="wn-menu">` as a SIBLING of the
always-present actions div — the UA never hides the actions; `:has()` does the
mobile gating:
`.wn-nav:has(.wn-menu:not([open])) .wn-view-actions { display: none }` under
640px; above it the summary is `display: none` and actions render inline.
Browsers without `:has()` degrade to always-visible actions. Native
keyboard/screen-reader disclosure semantics, zero JS. When there are zero
action items, the menu/summary isn't rendered at all.

**Breadcrumbs degrade in two layers.** Per-crumb CSS ellipsis is the width
backstop: the crumb container becomes a flex row (`min-width: 0`) and each
crumb becomes a `display: block` box with `max-width: 18ch; overflow: hidden;
text-overflow: ellipsis`. Middle-collapse fires on CRUMB COUNT (> 4), not
width: `Home / … / parent / current` — first crumb, a
`<details class="wn-crumb-more">` (summary `aria-label="Hidden breadcrumb
levels"`) whose dropdown holds the hidden ancestors, then the last TWO
crumbs. Overflow-clipping is neutralized with `position: relative` on the
crumb container plus `:has(.wn-crumb-more[open]) { overflow: visible }`;
`overflow-x: auto` remains the final fallback on mobile. Note the frequency
asymmetry (accepted): reader trails are path depth; the editor's trail is
navigation HISTORY, where >4 happens on ordinary browsing.

**404 consequence:** with all chrome login affordances removed, the anonymous
404's "Create this page" CTA (a link to the same URL, previously rescued only
by the login hint we're deleting) becomes a dead end — the entire
`.wn-create` block is removed for anonymous visitors; the "No page exists at
…" statement stays. The bootstrap path for a first admin
(`/oidc/login?returnTo=…`, or `WN_AUTH_DISABLED` dev mode) gets documented in
README/docs.

## Files

1. **`src/server/settings.ts`**
   - Add `navSlug: string | null` (key `nav_slug`) to `AppSettings` /
     `SettingsPatch` / `DEFAULT_SETTINGS` / `parseSettings` / `serialize`.
   - **Fix the write-path empty-string bug found during review:**
     `update()` currently rejects `homeSlug: ''` (`validateSlug('')` → 400
     `invalid home slug`) — so the admin form cannot clear the home page.
     Generalize `normalizeHomeSlug` → `normalizePageSlug(raw): string | null`
     (trim; `''` → `null`; else validate) and apply it on the WRITE path in
     `update()` for BOTH `homeSlug` and `navSlug` (store the normalized
     value in `next`, don't re-validate raw).
   - Fix stale header comment referencing nonexistent `normalizeSettings`.
2. **`src/server/render/nav.ts`** (new) — `NAV_MAX_ITEMS = 8`,
   `NAV_LABEL_MAX = 40`; `extractNavLinks(content, model-ish helpers)`:
   build via `buildDocument` + plugin tokens (list-item, empty indent) →
   first `wiki-link`/`link` inline token → internal-only resolution →
   `NavLink { slug, href, label }` (label = link display with emphasis chars
   stripped, truncated; fallback `slugDisplayName(slug)`; href via
   `pageUrlPath(slug)`); `createNavLinksService({ pages, settings, cache })`:
   async `links()` with RenderCache key `nav:${slug}`, last-good fallback on
   store errors, `hashEtag`-style content hash exposed as `linksEtag()` for
   ETag mixing. (Move `hashEtag` from `pages-html.ts` to a shared internal
   module or export it — implementation's choice, keep it one copy.)
3. **`src/shared/dto.ts`** — `export interface NavLink { slug: string; href:
   string; label: string }` (slug included so the editor can SPA-navigate
   without parsing hrefs); `EditorShellConfig.navLinks?: NavLink[]` —
   OPTIONAL (tolerates older shells / parse-failure fallback object).
4. **`src/server/routes/settings-api.ts`** — validate `navSlug` like
   `homeSlug` (string-or-null type check at the edge; slug policy enforced in
   the service).
5. **`src/server/routes/admin.ts`** — "Nav page (slug — its top-level links
   appear in the site header)" input after the Home field; ADMIN_SCRIPT sends
   `navSlug`; admin chrome receives nav links (escaped chrome — consistent
   with the raw-band omission rationale, comment it); show a one-line hint
   when `nav_slug` is set but extraction yields zero links ("Nav page is set
   but has no top-level links" — prevents silent confusion).
6. **`src/server/render/layout.ts`**
   - `LayoutOptions.navLinks?: NavLink[]`.
   - Remove anonymous `Log in` action entirely.
   - Header: wrap actions in `<nav class="wn-nav" aria-label="Site">`
     (unified class name across surfaces) containing
     `<details class="wn-menu"><summary aria-label="Menu">☰</summary></details>`
     + `.wn-view-actions`; nav links render BEFORE built-ins; skip
     menu/details when actions list is empty.
   - Middle-collapse: crumbs.length > 4 → first + `wn-crumb-more` dropdown
     (summary `aria-label="Hidden breadcrumb levels"`, contains hidden middle
     crumbs as links) + last TWO crumbs; generalize the current `join(' / ')`
     separator builder; last crumb keeps `aria-current="page"`.
   - CSS: crumbs container `display:flex; min-width:0` + per-crumb
     `display:block; max-width:18ch` ellipsis; `.wn-nav { position: relative }`
     (or on `.wn-crumbs` for the crumb dropdown);
     `:has([open]) { overflow: visible }` on both containers; `@media
     (max-width: 640px)` `:has()` rule hiding `.wn-view-actions` until menu
     open, dropdown absolutely positioned with `min-height: 44px` touch
     targets (keep the exact declarations — `pages-html.test.ts` asserts the
     literals `min-height: 44px` and `@media (max-width: 640px)`); desktop
     `summary { display: none }`; `.wn-nav-link { max-width }` + flex shrink
     so 8 links can't burst the bar.
7. **`src/server/routes/pages-html.ts`** — `chrome()` becomes async (or the
   route awaits `navService.links()` per request) and passes `navLinks`;
   article ETag input becomes
   `hashEtag(\`${articleHtml}\n${settingsRevision}\n${linksEtag}\`)`; 404 body
   drops the whole `.wn-create` div (anonymous-only surface; auth users get
   the editor shell for missing pages anyway); `navLinks` passed to
   `editorShellHtml`. 404/invalid-slug ETags are computed over freshly
   rendered HTML — no extra mixing needed (note in Risks).
8. **`src/server/render/editor-shell.ts`** — accept `navLinks` opt, embed in
   config (escaped via existing `embedJson` — labels can't break out).
9. **`src/server/app.ts`** — build nav links service (pages + settings +
   cache); `invalidate(slug)` additionally evicts `nav:${slug}`; thread
   service into pages-html + admin deps.
10. **`src/core/editor-dom.ts`** — header builder: wrap `.wn-actions` in
    `<nav class="wn-nav" aria-label="Site">` with summary-only
    `<details class="wn-menu">` (☰, `aria-label="Menu"`); mirror ALL reader
    CSS with `--wn-*` tokens (same class names `.wn-nav`/`.wn-menu`/
    `.wn-crumb-more`); per-crumb ellipsis boxes; `:has()` mobile collapse.
    NOTE: this breaks `editor-dom.test.ts:378-385` (header children
    `toHaveLength(2)`) — update that test.
11. **`src/core/editor-render.ts`** — `renderBreadcrumb()`: count-based
    middle-collapse (>4 → first + `wn-crumb-more` details + last 2); hidden
    crumbs keep ORIGINAL trail indices `i` for the existing
    `truncateTrail(i)`/`onBreadcrumbNavigate` handlers; close open
    `wn-crumb-more`/`wn-menu` on navigation.
12. **`src/client/main.ts`** — prepend `cfg.navLinks ?? []` anchors
    (`.wn-nav-link`) to `.wn-actions` before Search; click handler:
    `preventDefault()` + `instance.navigate(link.slug)` (preserves the
    debounced autosave buffer — matches the sanctioned internal-link
    divergence); also close the menu on SPA navigation/popstate.
13. **`migrations/003_settings.sql`** — header comment lists settings keys;
    add `nav_slug` (comment only — open key/value table, no schema/migration
    change needed).
14. **Tests** (updated file list from review):
    - `src/server/__tests__/nav.test.ts` (NEW): extraction matrix on engine
      output — wiki link, pip label, markdown internal link, alpha/roman
      markers included, nested items skipped, non-list links skipped, plain
      text skipped, external/`javascript:`/`mailto:`/anchor links skipped,
      `![img](/media/1)` in a list item does NOT yield a nav link, links
      inside fenced code skipped, emphasis stripped from labels, cap of 8,
      40-char label truncation, slug+href+display-name fallbacks.
      Service: cache hit avoids refetch; nav-page write busts
      `nav:${slug}`; navSlug change switches keys; store failure → last-good.
    - `src/server/__tests__/settings.test.ts`: `nav_slug` round-trip; corrupt
      DB value → null; write-path `''` → null for BOTH home and nav (locks
      the bug fix); invalid slug still rejected; exact-key `toEqual` objects
      gain the new key (existing :58-67, :75-93 fixtures).
    - `src/server/__tests__/admin-routes.test.ts`: navSlug form field + PUT
      round-trip; the two `toEqual` exact-key fixtures (:89-107) gain
      `navSlug`/`nav_slug`; **replace the vacuous
      `toMatchObject({error: /regex/})` assertions** — vitest 4's
      `toMatchObject` was empirically shown to pass on a NON-matching regex
      (that's why today's `homeSlug: ''` → "invalid home slug" bug shipped
      uncaught); switch those to `expect((res.json() as any).error).toContain(...)`
      style.
    - `src/server/__tests__/pages-html.test.ts`: nav links render before
      built-ins; `wn-menu`/`wn-nav` present; trail >4 → `wn-crumb-more` with
      middle crumbs + `aria-label`, last crumb still `aria-current="page"`;
      anonymous page never contains `/oidc/login` (INVERTS existing :55 and
      :239 assertions); 404 has no `.wn-create` block; nav-page edit changes
      another page's ETag; keep literal `min-height: 44px` +
      `@media (max-width: 640px)` CSS declarations so :57-58 stay green.
    - `src/core/__tests__/editor-dom.test.ts:378-385`: header children
      updated for the `.wn-nav` wrapper.
    - `src/core/__tests__/editor-navigation.test.ts` (or editor-render):
      breadcrumb middle-collapse with click handlers preserving original
      trail indices; menu closes on navigate.
    - `node-smoke.test.ts` unchanged (nav.ts imports already DOM-free
      modules covered by the smoke test).
15. **Docs**:
    - `docs/api.md`: `navSlug` row in PUT /api/settings; 404 overlay text
      updated (no create block); note `/oidc/login?returnTo=…` is now the
      only sign-in entry point; reader ETag sentence gains the nav term.
    - `docs/architecture.md`: nav extraction + service in the request flow.
    - `docs/theming.md`: structural class list — add `.wn-nav`, `.wn-menu`,
      `.wn-crumb-more`, `.wn-nav-link`; drop sign-in from the
      `.wn-view-actions` description (not conditional — classes ARE touched).
    - `README.md`: admin bootstrap login path.

## Steps

1. **Settings core**: `navSlug` field + `normalizePageSlug` write-path fix
   (+ stale comment) in `settings.ts`; `settings-api.ts` edge validation;
   settings + admin-routes exact-key test fixtures updated; vacuous regex
   assertions strengthened.
   ✅ Verify: targeted vitest on settings/admin tests.
2. **Extractor**: `src/server/render/nav.ts` `extractNavLinks` on
   `buildDocument` + plugin tokens as above; nav.test.ts extraction matrix
   green.
3. **Service + wiring**: `createNavLinksService` over RenderCache +
   last-good fallback; `app.ts` instantiation + `invalidate` hook;
   `getNavLinks()`/`linksEtag()` threaded into `PageHtmlDeps`; ETag mixing in
   `pages-html.ts`. ✅ `app.test.ts`/`node-smoke` green.
4. **Reader chrome**: layout.ts restructure (nav links before built-ins,
   `wn-nav`/`wn-menu` summary-only details, login removal, crumb
   middle-collapse, all CSS incl. the two literal declarations tests assert);
   404 `.wn-create` removal; admin page nav field + zero-links hint.
   ✅ pages-html/admin-routes tests.
5. **Editor chrome**: `dto.ts` optional `navLinks`; `editor-shell.ts` embed;
   `main.ts` prepend links + `navigate(slug)` handler + close-menu;
   `editor-dom.ts` header wrap + mirrored CSS; `editor-render.ts` breadcrumb
   collapse. ✅ core/client tests + editor-dom test fix.
6. **Full suite sweep**: fix any exact-match fixture fallout; confirm
   surface-parity untouched.
7. **Docs + README bootstrap note.**
8. **Full validation**: `npm run typecheck && npm run lint &&
   WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes
   npm run test:coverage && npm run build` (coverage ≥80% gates new code).

## Risks & Mitigations

- ⚠️ **Stale nav links in browser-cached pages** — in-process cache holds
  article-only HTML (chrome re-renders per request), and the reader ETag now
  mixes `settingsRevision` + nav links hash; a nav-page write busts both. The
  ≤60s `max-age` window still delays freshness WITHOUT revalidation (same as
  today's page edits) — accepted, documented.
- ⚠️ **`<details>` UA hiding pitfalls** — avoided: the details contains only
  the summary; actions are a sibling div. No `:has()` support ⇒ actions always
  visible (graceful). Hollow-disclosure caveat accepted: the summary's
  expanded state has no `aria-controls` link to the sibling (spec-limited);
  mitigated with visible `[open] > summary` styling so sighted keyboard users
  see the toggle respond.
- ⚠️ **Dropdown clipping** — absolutely positioned panels inside
  `overflow-x: auto`/`hidden` containers are clipped; fixed via positioned
  ancestor + `:has([open]) { overflow: visible }`, `overflow-x: auto` kept as
  final fallback.
- ⚠️ **XSS surface** — labels `escapeHtml`-ed; hrefs are
  `validateSlug`-gated (`SEGMENT_RE` charset — the same guard that makes
  `[[...]]` hrefs injection-safe, and it rejects reserved first segments, so
  a nav page can't mint links into `/api`, `/oidc`, `/search`…); shell config
  embedded via `embedJson` (`<`-escaped).
- ⚠️ **Header overflow with 8 long links** — capped items (8) + capped
  labels (40) + per-link `max-width` + flex-wrap on `.wn-nav`.
- ⚠️ **Editor trail is history, not ancestry** — the >4 collapse fires more
  often there; acceptable, and hidden crumbs preserve original `truncateTrail`
  indices. Noted in docs.
- ⚠️ **Login discoverability removed by design** — first-admin bootstrap
  documented (`/oidc/login?returnTo=…`, dev mode); session-expiry toast in the
  editor intentionally kept.
- 🐛 **Incidental fix shipped with this work**: `homeSlug: ''` from the admin
  form currently 400s ("invalid home slug") — clearing the home page is
  broken today; step 1 fixes it for home and applies the same normalizer to
  nav. The covering test only "passes" because vitest 4 `toMatchObject`
  doesn't actually test regex values against strings — those assertions get
  hardened in step 1.
- ❓ **Skip-to-content link** — surfaced by review as a cheap a11y win
  adjacent to this work; deliberately OUT of scope here, proposed as the next
  small task.
- ❓ **Bullet-only nav items?** — no: engine-backed extraction includes alpha
  and roman ordered markers for free; restricting would cost effort.

## Review provenance

Two adversarial plan reviewers (subagent `review` workflows
`d4ea57c5…`, `64725e72…`). Both independently flagged: regex-extractor drift
(→ engine-backed), nav-cache staleness (→ async + RenderCache),
login-removal dead-end + bootstrap docs, nav caps, and the vacuous
`toMatchObject` regex test quirk. One reviewer proposed dropping the
middle-collapse layer (scope reduction); kept because the user explicitly
chose "both", with the reviewer's clipping/semantics fixes folded in.
Validated-sound by both: summary-only `<details>` + `:has()` sibling design,
slug/charset safety, ETag mixing pattern, settings-key plumbing, surface-parity
non-impact, `/edit` routes need no change.
