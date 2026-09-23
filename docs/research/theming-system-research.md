# Theming Research: Admin-Authored Theme Gallery + Complete Token Surface

**Date:** 2026-09-23 · **Status:** research report — no code changed
**Scope:** What it would take to let admins create, preview, and activate their
own themes (custom CSS stylesheets) from the admin panel, with a token set
complete enough that every surface — reader chrome, reader article, editor
chrome, editor content — can be restyled without forking the bundle.
**Method:** Full read of the theming-relevant code (`src/core/styles.ts`,
`src/core/editor-dom.ts`, `src/server/render/layout.ts`,
`src/server/render/editor-shell.ts`, `src/server/settings.ts`,
`src/server/routes/admin.ts`, `src/server/routes/settings-api.ts`,
`src/server/routes/pages-html.ts`, `src/client/main.ts`), `docs/theming.md`,
`docs/api.md` trust model, and the pre-pivot token research in
`.planning/phases/04-theming/04-RESEARCH.md`. External prior art: BookStack
customization docs, MediaWiki theming, OWASP CSS-injection testing guide,
PortSwigger "Blind CSS Exfiltration" (2023), Gualtieri "Stealing Data With
CSS" (2018).

---

## 1. Executive summary

WorldNotes is unusually well-positioned for a theming system: a ~45-token
`--wn-*` design-token layer already exists, the admin settings pipeline
(raw trusted strings → DB → both render surfaces → ETag busting) is
fully built and has a proven template in the header/footer HTML bands, and
restyling is provably safe against the repo's two scariest invariants
(byte-exact content fidelity and reader/editor tree parity — both are
CSS-independent). The lift is **medium**, estimated at **6–8 focused dev
days** for the full scope, decomposable into four independently shippable
milestones (pipeline → tokens → gallery → preview).

Three real design problems need decisions before implementation:

1. **Two divergent token namespaces.** Reader chrome reads `--wn-bg/-fg/...`
   on `:root`; editor + article read `--wn-color-bg/-fg/...` on `.wn-root`.
   A theme author setting `--wn-color-bg` restyles the editor and the
   article but **not** the reader's page background or header bar. Fixing
   this (unification) is the precondition for "every surface customizable".
2. **Token coverage is incomplete on chrome.** Content tokens are thorough;
   chrome has ~60 hard-coded literals (dropdown shadows, toolbar gaps,
   sidepanel widths, admin-form inputs, users table, 44px touch targets,
   46rem column, 640px breakpoint). The audit+promote pass is the single
   biggest chunk of careful work (~2–3 days).
3. **The `theme` option today is a *replace* escape hatch, not an override
   layer.** `createEditor(el, { theme })` swaps the ENTIRE default
   stylesheet — a custom theme would have to re-ship all structural CSS or
   the editor breaks. The theming system needs the opposite: defaults stay,
   theme CSS is **appended** as a cascade-override layer (`docs/theming.md`:
   "There is no cascade override layer yet" — correct, it must be built).

Security posture: admin-authored CSS adds **no new privilege class** —
`headerHtml`/`footerHtml` are already arbitrary admin-trusted HTML that
execute as scripts for every reader (documented in `docs/api.md`: "Admin is
effectively script-execution-as-admin for every reader"). CSS exfiltration
techniques (attribute-selector beacons, `@import` chaining) are real but
only matter if non-admins can author themes; that is explicitly out of
scope and would need a parser/sanitizer plus CSP work.

---

## 2. Current state (inventory)

### 2.1 What exists

| Piece | Location | State |
|-------|----------|-------|
| Design tokens | `src/core/styles.ts` → `EDITOR_TOKENS_CSS` | ~45 tokens (colors, typography, spacing, radii, transitions, caret, toast), declared on `.wn-root`, light values + a `prefers-color-scheme: dark` block |
| Content rules | `EDITOR_CONTENT_CSS` | token-driven with per-`var()` literal fallbacks; shared verbatim by both surfaces |
| Editor chrome rules | `src/core/editor-dom.ts` → `EDITOR_CHROME_CSS` | mostly token-driven; ~47 hard-coded literals remain (shadows, gaps, panel widths, shortcuts overlay) |
| Reader chrome rules | `src/server/render/layout.ts` → `VIEW_CSS` | **second, parallel palette** (`--wn-bg`, `--wn-fg`, `--wn-muted`, `--wn-accent`, `--wn-border`, `--wn-code-bg` on `:root`); ~13 literals + ~20 non-tokenized font/radius/shadow/touch-target rules |
| Shared site bands | `SITE_BANDS_CSS` (`styles.ts`) | the one chrome group on both surfaces; reads `--wn-color-*` with `--wn-*` fallbacks — the precedent for palette unification |
| Replace-theme hook | `createEditor(el, { theme })` → `injectStyles()` (`editor-dom.ts`) | replaces `#worldnotes-styles` textContent entirely; documented as "future per-user theming"; not wired to any server data |
| Admin-trusted raw strings | `settings.ts` (`headerHtml`/`footerHtml`), `PUT /api/settings` (admin + same-origin), `/admin` form, `editor-shell.ts` (embedded JSON), both render paths | **complete pipeline to copy for theme CSS**: size cap (`SITE_HTML_MAX` 20 000), control-char rejection, revision counter, ETag mix-in (`pages-html.ts` line ~242), anti-lockout (`/admin` never renders the bands) |
| Theme-relevant constants | counts below | 81 hex literals in `styles.ts` (mostly token declarations/fallbacks), 47 in `editor-dom.ts`, 13 in `layout.ts`; ~60 unique `--wn-*` names referenced across surfaces |

### 2.2 Where CSS reaches the browser today

```
reader  GET /{slug} (anon)      → renderLayout: <style> TOKENS + CONTENT + VIEW_CSS + BANDS </style>  (inline, one blob)
editor  GET /{slug} (authed)    → editorShellHtml: tiny <style> + config JSON; client main.ts →
                                  createEditor → injectStyles(DEFAULT_CSS) into <head> at runtime
admin   GET /admin              → renderLayout (same reader shell; bands deliberately omitted)
```

Cache invalidation: `pages-html.ts` computes the page ETag as
`hash(articleHtml + settingsRevision + navLinks)`. `settings.getRevision()`
bumps on every `settings.update()` — so **anything stored through the
settings service busts every cached page for free**. Theme content stored in
a separate table would need the same bump wired in (one `settings.update()`
call or an etag mix-in of `themeId:updatedAt`).

### 2.3 Invariants that make theming safe here

- **Byte-exact content model is CSS-independent.** `content-text.ts`
  extraction and caret math read DOM text nodes; `::after`/generated
  content and `display`/`letter-spacing` are presentation-only
  (precedent: hidden table pipes, transparent list indents, the `↗`
  off-site marker). A theme cannot corrupt source fidelity.
- **`surface-parity.test.ts` compares trees, not styles.** Restyling can't
  break it; restyling is exactly the sanctioned divergence kind.
- **The corpus property test** stays green under any pure-CSS change.

### 2.4 Gaps a real theming system must close

1. No persistence for user-authored CSS (no themes table, no settings key).
2. No override injection point on either surface (only full replacement).
3. Reader chrome ignores the editor token set (namespace split).
4. No admin CRUD surface for themes; no active-theme concept.
5. No preview affordance.
6. `docs/theming.md` documents internals, not a theme-author contract.

---

## 3. Prior art

| System | Model | Takeaway |
|--------|-------|----------|
| **BookStack** | "Settings → Customization": brand colors + a **Custom HTML Head Content** field (raw CSS/JS, admin-trusted, inline); file-based visual theme system (`APP_THEME` env + folder overrides) — explicitly *not* DB-stored, *not* stable across releases | Single-field custom CSS ships fast and is the 90% tool; file-based themes avoid the gallery problem entirely. Our gallery choice needs the DB CRUD they avoided |
| **MediaWiki** | `Common.css`/`vector.css` per wiki + skins as code; gadgets go through sysop review | Raw admin CSS with an unreviewed trust level is normal for self-hosted wikis |
| **Obsidian** | Community themes = full CSS files hitting a documented variable set; snippets for overrides; `!important`-heavy | Token contract quality determines how much a theme can do without `!important` — argues for the full-tokenize milestone |
| **Ghost** | Theme packages + code injection; admin-editable | Gallery-of-themes with active selection is a familiar admin pattern |
| **Pre-pivot planning** (`.planning/phases/04-theming/`) | ~50-token `--wn-{category}-{property}` semantic naming; two-tier "80% tokens / 20% full replacement" | The naming + fallback conventions are already written down and partially implemented — reuse them |

No open GitHub issue covers theming today (existing issues: #1–#5, all
editor-ux).

---

## 4. Security analysis (admin-authored CSS)

**Known CSS-attack classes** (OWASP CSS Injection, Gualtieri 2018,
PortSwigger blind CSS exfil 2023): character-by-character exfiltration of
**attribute values** via selectors (`input[value^="a"] { background:
url(/leak?a) }`), amplified by `@import` chaining and `:has()`; font
`unicode-range` probes for character presence; `attr()` tricks; UI
redressing via `position: fixed`; privacy beacons via external `url()`/`@import`.

**Why this is acceptable at the admin trust level here:**

- The actor class already holds strictly more power: `headerHtml`/`footerHtml`
  are arbitrary HTML/JS executed for every reader (no CSP; documented).
- Session cookie is `httpOnly`, `sameSite=lax` (`session.ts`) — never in the
  DOM, invisible to selectors. No CSRF token is embedded in HTML (origin
  checks are server-side). Typed input values never round-trip to DOM
  attributes (pure-CSS keylogging doesn't apply). CSS cannot read text
  content or `<script>` JSON payloads — only markup attributes, mostly page
  slugs (public).
- Residual risk: a *malicious admin* could beacon visitor IPs (via `url()`
  loads to an external host) or deface the site — both already trivially
  possible via the HTML bands. **No new capability.**

**Guardrails to implement anyway (cheap):**

- Size cap (recommend 65 536 chars, generous vs. the 20 000-char band cap)
  + control-char rejection + whitespace-only rejection — copy the band
  normalizers.
- Reject `</style` (case-insensitive) at save time — impossible in valid
  CSS, and it is the only markup break-out of an inline `<style>` sink.
- Document that theme CSS ships **unparsed and unsanitized** under the same
  trust model as the bands (update `docs/api.md` trust section).

**Deferred (would be its own epic):** *non-admin* theme authoring — requires
a CSS parser with property/selector allowlist (e.g. strip url()-bearing
rules, `@import`, `[attr...]` selectors, `position: fixed`), and/or a real
CSP (`style-src`, `img-src`, `font-src` same-origin) that the whole app
currently lacks. Do not accidentally build this by letting editors submit
themes.

---

## 5. Proposed design

### 5.1 Data model

```sql
-- migrations/006_themes.sql
CREATE TABLE themes (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,          -- display name, capped ~100 chars
  description TEXT NOT NULL DEFAULT '',      -- optional, shown in gallery
  css         TEXT NOT NULL,                 -- raw admin-trusted stylesheet
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
```

Plus two settings keys via the existing service: `active_theme_id`
(`''` = bundled default) and — so cache busting stays free — writes bump
`settings.getRevision()` the same way any settings update does. Repository
trio mirrors media/users: `themes-repository.ts` interface + `themes-pg.ts`
+ `themes-memory.ts`.

**Why a table, not a settings blob per theme:** the gallery needs list /
get-by-id / uniqueness on name; settings key/value would need key-mangling
and gains nothing (settings rows already cover the active pointer).

### 5.2 Application path — an *append* layer, on both surfaces

- **Reader:** `LayoutOptions.themeCss?: string`; `renderLayout` emits
  `<style id="worldnotes-theme">{css}</style>` **after** the default blob
  (higher cascade position wins without `!important`).
- **Editor:** `EditorShellConfig.themeCss`; client injects the same second
  `<style id="worldnotes-theme">` after `#worldnotes-styles`. New
  `EditorOptions.themeAppend?: string` (or `themeLayers`); the existing
  `theme` *replace* option is kept untouched for full-control embedders.
- Inline (not a `/theme.css` endpoint) deliberately: zero new public routes,
  zero cascade-ordering races with the runtime-injected default sheet, and
  it inherits each surface's existing auth/cache/`requireLogin` gating for
  free. Revisit as an external file only if themes grow large enough to
  warrant their own HTTP cache.
- `requireLogin`: nothing to decide — theme CSS rides inside already-gated
  documents.
- **Anti-lockout:** `/admin` renders **without** custom theme CSS (exact band
  precedent: broken branding must never bury its own recovery form). Status
  pages and reader/editor surfaces use the active theme.

### 5.3 API surface

`/api/themes` (all admin role + same-origin, following `/api/settings`):

- `GET /api/themes` — list `{id, name, description, updatedAt}[]` + active id
- `POST /api/themes` — create `{name, css, description?}` → 201
- `PUT /api/themes/:id` — update; bump settings revision
- `DELETE /api/themes/:id` — 409 if it's the active theme (or auto-fall back
  to default — decide; 409 is safer)
- `PUT /api/settings {activeThemeId}` — extend the existing settings API
  (validate reference exists; `null` = default)

### 5.4 Admin UI (gallery + editor)

`/admin` gains a **Themes** section (server-rendered, vanilla JS, same
patterns as favicon/users rows — each row owns its buttons + message line):

- table: name · description · updated · `● active`
- per-row: **Edit** (expands a large monospace `<textarea>` + name/desc +
  Save/Cancel), **Preview**, **Activate**, **Delete**
- top: **New theme** — name + starter-template textarea prefilled with the
  commented token list (copy-paste-able skeleton)
- `Tab` inside the CSS textarea inserts spaces (tiny JS, editor-style)

### 5.5 Preview

- `GET /?previewTheme=<id>` (admin session only, `no-store`, article cache
  key must include the param — or bypass cache for preview requests):
  renders the normal reader with *that* theme's CSS instead of the active
  one. Same query param honored on the editor shell so WYSIWYG holds.
- Optional stretch: embed the preview URL in an iframe inside `/admin`
  below the CSS textarea (auto-refresh on save-draft; keep simple first).

### 5.6 Token unification + completeness (the "every surface" part)

1. **One palette, one scope.** Declare all tokens on `:root` in
   `EDITOR_TOKENS_CSS` (the editor is a full-page app; `:root` scope is
   correct for both surfaces). Rewrite `VIEW_CSS` chrome to consume
   `--wn-color-*` directly; keep the old `--wn-bg` etc. as one-line aliases
   inside the token block for one release (deprecation note in theming.md).
2. **Two-tier token architecture** so themes stay small:
   - *Palette* primitives (~15): `--wn-palette-bg/-surface/-fg/-muted/-
     accent/-border/-code-bg/-punct/-success/-warning/-error/-shadow...`
   - *Semantic* tokens (~70): everything today — every existing token gets a
     default of `var(--wn-palette-*)`, so re-skinning the whole site is
     ~15 declarations, while deep control remains per-surface.
3. **Audit + promote remaining literals**, surface by surface:
   editor chrome (dropdown/panel geometry, toolbar, shortcuts overlay,
   toast — mostly tokenized), reader chrome (crumbs, search form, admin
   forms, users table, status page, nav dropdown), layout constants
   (`--wn-measure` = 46rem, `--wn-panel-width`, `--wn-touch-target`,
   `--wn-breakpoint-*` can't be var()-ized in `@media` — document the
   limitation), typography defaults not yet tokens (chrome font stack,
   heading stack, table/code line-heights), borders/radii/shadows beyond
   the two that exist, `::selection`, scrollbar colors, focus-ring tokens.
4. **Dark mode contract:** the theme layer is appended *after* the built-in
   `prefers-color-scheme` block, so a theme fully owns both modes; theme
   authors may include their own `@media (prefers-color-scheme: dark)` —
   document this in the starter template.
5. Keep **literal fallbacks inside every `var()`** (existing convention):
   an empty/broken theme must degrade to the default look, never to
   unstyled markup.

### 5.7 Testing

- unit: settings parse/serialize for `activeThemeId`; theme validation
  (size cap, control chars, `</style`); theme repo CRUD (pg + memory)
- routes: authz matrix (anon 401/403, viewer/editor 403, admin ok,
  same-origin), 409 delete-active, preview param ignored for non-admins
- render: layout injects `#worldnotes-theme` after defaults & only when set;
  editor shell embeds themeCss; admin page never carries theme CSS
- regression: `surface-parity.test.ts`, content corpus property test,
  coverage thresholds (new server modules are covered — they must not be
  added to the bootstrap excludes list)
- manual QA list: switch theme → hard-refresh reader (ETag changed),
  preview, break-it test (theme with garbage CSS degrades, /admin stays
  usable)

---

## 6. Lift estimate

Assumes one engineer fluent in the codebase, working test-first;
durations are focused days, not calendar weeks.

| Milestone | Scope | Estimate |
|-----------|-------|----------|
| **M1 — Override pipeline MVP** | theme CSS as a settings field (`customCss`) end-to-end: normalize/cap/validate, `#worldnotes-theme` injection in reader + editor client, revision/ETag, `/admin` textarea + anti-lockout, tests | **1.5–2 d** |
| **M2 — Token unification + completeness** | single `:root` palette, palette→semantic two-tier, chrome audits (~60 literals + layout constants + selection/focus), aliasing, theming.md token reference + starter template, parity/fidelity re-verify | **2–3 d** |
| **M3 — Gallery** | themes table + 006 migration, repo trio, `/api/themes` CRUD, `activeThemeId`, admin gallery UI (list/edit/activate/delete), revision wiring, tests | **2 d** |
| **M4 — Preview** | `?previewTheme=` on reader + editor (admin-gated, no-store, cache-key handling), preview link in gallery, (stretch) iframe in admin | **0.5–1 d** |
| **Docs + polish** | api.md endpoints + trust note, theming.md author guide, cleanup of M1's `customCss` settings field (migrate to a seeded default theme or keep as "Quick CSS" — decide) | **0.5 d** |
| **Total** | | **~6.5–8.5 d** |

M1 ships a usable feature on its own ("Custom CSS" box — the BookStack
shape). M2 is what makes "every surface customizable" literally true and is
the highest-risk-of-regression chunk (touching shared CSS). M3+M4 make it a
theme *gallery*. Recommended order: M1 → M3 → M2 → M4 (data model early so
M2's doc work lands in the final shape; M2 independent of M3's UI).

### Decisions to make before starting (proposed defaults in parentheses)

1. Inline `<style>` vs external `/theme.css` endpoint (**inline**, §5.2)
2. Active-theme delete behavior (**409**, re-activate first)
3. Whether M1's `customCss` field survives as "Quick CSS" alongside the
   gallery (**seed it into a "Legacy custom CSS" theme at first gallery
   boot, then drop the field**)
4. Token-count target for the reference doc (**~90: 15 palette + ~75
   semantic**)
5. Preview scope (**URL param first; iframe stretch**)

### Explicitly out of scope (follow-ups)

- Non-admin theme authoring (needs sanitizer + CSP — its own epic)
- A real CSP for the app in general
- Per-user theme choice / dark-mode scheduler
- Preset/bundled themes (user's call: admin-authored first, defaults later)
- Theme import/export as files
- Syntax-highlighted CSS editing (CodeMirror-in-admin; see issue #5)

---

## 7. Filed issues

- **#6** — Theming system: admin-authored theme gallery with custom CSS +
  complete token surface (this research distilled into milestones M1–M4):
  https://github.com/AlexMason/worldnotes/issues/6
