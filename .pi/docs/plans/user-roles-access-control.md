# Plan: User Roles, Login-Only Mode & Custom Status Pages (rev 2)

- **Date:** 2026-09-21 (UTC)
- **Branch:** `feature/user-roles-access-control` (create from up-to-date `main`)
- **Status:** Revised after dual reviewer critique (see "What changed from rev 1" at bottom)
- **Structure:** Two changes on one branch — **Phase A** (roles + login-only +
  Users management: the security core) and **Phase B** (custom status pages:
  the authoring surface). Each phase lands green on its own; B builds on A's
  seams (`statusDocument`, `requireRoleHtml`).

## Goal

Three-tier roles (viewer / editor / admin) in a `users` table, an admin-only
Users section on `/admin`, an admin-toggleable login-only mode, and
admin-authored 404/403 status pages rendered as wiki-page markdown.

## Decisions (operator interview + review outcomes)

| Question | Decision |
|---|---|
| First-admin bootstrap | First user to **log in** becomes admin; **plus** optional `BOOTSTRAP_ADMIN_SUBS` env allowlist that forces admin regardless of table state (deterministic answer for upgrades — see P0-2 fix). Grant serialized by an advisory lock and logged at `warn`. |
| Default role | `DEFAULT_ROLE=viewer\|editor` env, default **editor** (preserves today's posture). `admin` invalid as default. |
| Login-only toggle | `requireLogin` in the settings table (admin checkbox, instant per-process). **Default `false`, pinned by test.** |
| Anonymous in login-only mode | **403 status page with a sign-in link** (no auto-redirect). Phase A ships the built-in body; Phase B makes it a custom wiki page. |
| Status pages | Dedicated wiki pages via `notFoundSlug` / `forbiddenSlug` settings (Phase B). |
| Users section | List + role change only. **No delete/ban** — docs must state revocation = demote to viewer (row deletion resurrects the user at default role, by design). |

## Approach

### Roles: store, resolution, guards

**Schema** (`005_users.sql`): `users(sub TEXT PK, email, name, role TEXT NOT
NULL CHECK (role IN ('viewer','editor','admin')), created_at, last_login_at,
updated_at, updated_by)` — `updated_at`/`updated_by` give a role-change audit
trail (same convention as `settings`).

**One source of truth for the role enum:** new `src/shared/roles.ts`
(env-agnostic `Role` type + `ROLES` array), imported by `config.ts` (zod),
`db/users-*`, `shared/dto.ts`, and mirrored only in the SQL `CHECK`.

**Resolution (fail-closed, read-only on the hot path):**
- The session parser hook stops writing `req.user` directly; it writes an
  internal `req.sessionClaims`. A new **role resolver** hook, registered in
  `app.ts` immediately after `registerSessions`, is the **only writer of
  `req.user`** (`AuthUser = { sub, email?, name?, role }` with `role`
  required): `users.get(sub)` → publish; **row absent →
  `provision(sub)`** (insert-if-absent, role only — covers cookies issued
  before this feature); row present → publish, no write. No UPDATE ever runs
  on a GET: reads stay side-effect-free and `last_login_at` keeps meaning
  "last login".
- **Login refresh happens at the actual login event**: `/oidc/callback`
  (file: `auth/routes.ts`) calls `users.touchLogin(sub, email, name)` before
  `reply.setSession(user)` — upserts email/name/`last_login_at`, never
  touches `role` of an existing row.
- Provisioning rule (single statement, inside a transaction holding
  `pg_advisory_xact_lock(<const>)`, precedent: `db/migrate.ts`):
  `role = 'admin'` if `sub ∈ BOOTSTRAP_ADMIN_SUBS` **or** the table is empty;
  else `DEFAULT_ROLE`. Every admin provisioning logs
  `warn: provisioned admin sub=… (reason: bootstrap-list|empty-table)`.
- **Dev mode** (`authDisabled`): session hook publishes
  `{ ...DEV_USER, role: 'admin' }` — a fresh object per request (never
  mutate the module-level `DEV_USER` const) — and the resolver is not
  registered (no provisioning against a DB that may not exist).
- **Availability stance:** resolver errors propagate (a users-DB outage
  already breaks page reads). But `buildApp` **requires** `deps.users` when
  `!authDisabled` (fail fast at boot, no silent in-memory auth store on a
  `restart: unless-stopped` deployment), and the bootstrap logs applied
  migrations as today (`005_users.sql` visible in startup output).
- `requireRole(...allowed)` lives beside `requireAuth` in `auth/session.ts`:
  denies (401/403) unless `req.user?.role` is in `allowed` — a missing role
  can never pass. The users-DB row is the source for authorization; cookie
  claims (`name` in chrome) may be ≤`SESSION_MAX_AGE` stale; the `/admin`
  Users table renders row values — documented.

**Immediate effect:** server-side enforcement is instant on the next request.
Reader **chrome** (Admin link) can lag ≤60 s behind a role change because of
`max-age=60` + `Vary: Cookie` — documented, accepted.

### Login-only gate

One module, `src/server/auth/login-gate.ts`, exports closures over
`getSettings`:
- `requireLoginHtml(deps)` — for `/`, `/all`, `/search*`, and the `/*` SSR
  route; anonymous + `requireLogin` → `403` **HTML** status document (built-in
  body in Phase A; `forbiddenSlug` page in Phase B), `no-store`, carrying a
  sign-in link `/oidc/login?returnTo=<validated path>`. The gate **mirrors
  the existing prefix exemption** (reject-to-JSON for `api/`, `oidc/`,
  `assets/` wildcards) so `/api/anything` never answers HTML.
- `requireLoginJson(getSettings)` — for `GET /api/pages*` and
  `GET /media/{id}` → `403 {error:'login required'}`, `no-store`.
- Existing 401 on unauthenticated **writes** stays (client expiry toast
  depends on it).

**Cache posture while `requireLogin` is on** (fixes rev 1's leak):
- authenticated `GET /api/pages*` responses flip `public` →
  `cache-control: private, …` + `Vary: Cookie` (today they are public with no
  Vary — shared caches would hand gated bytes to anonymous clients);
- `GET /media/{id}` authenticated responses: `private, … immutable` (new
  fetches stop being shared-cache-eligible; already-cached public bytes are
  un-retractable — docs say so per-surface, and the gate is honestly framed
  as an **enumeration guard** for sequential ids, not encryption);
- **override media never reaches anonymous HTML or bytes:** `chrome()` passes
  `faviconMediaId: null` when `requireLogin && !req.user`, and the blind
  `/favicon.ico` / `/apple-touch-icon.png` routes serve **bundled bytes
  only** to anonymous in that mode (one principle: custom uploads require
  login; bundled assets stay public).
- Toggle busting: article ETags already mix the settings revision and 4xx is
  `no-store`; docs state the per-surface grace window (HTML ≤60 s, list
  ≤30 s, page JSON ≤60 s — browsers holding fresh bytes are not forced to
  revalidate; instant thereafter).
- **Docs must state plainly:** login-only ≠ per-page privacy. Any account the
  IdP admits can log in and read everything (default `viewer`). There are no
  page ACLs.

**`/admin` for authenticated non-admins:** HTML 403, not JSON — new
`requireRoleHtml(...)` variant (renders the forbidden status document; sign-in
link only when anonymous). Same for future HTML 403s. `PUT /api/users/role`
additionally **requires a present, matching `Origin`** (rejects Origin-less
requests — deviation from the general API posture is deliberate: this is the
endpoint that grants script-execution-as-admin; the admin form's `fetch`
always sends `Origin`).

### Users management

`src/server/routes/users-api.ts`:
- `PUT /api/users/role` (admin, same-origin-strict): body `{sub, role}`
  (`sub` in body — OIDC subs may contain `/` and `:`). Route validates
  `role ∈ ROLES` and non-empty `sub` → 400 before SQL. Handler calls
  `users.setRoleGuarded(sub, role, by=req.user.sub)` **in the repository**,
  inside one transaction + advisory xact lock: count-admins and update are
  atomic (kills the two-concurrent-self-demotions → zero-admins TOCTOU).
  Returns `{ok, reason}` → route maps: changed → 200 + new list row; same
  role → 200 no-op; unknown `sub` → 404; last-admin demotion → 409. The
  guarded form is the **only** exported setter — a future CLI/import path
  cannot bypass the lockout check. Every change: `req.log.warn({by, sub,
  from, to})` and `updated_by`/`updated_at` row write.
- **No `GET /api/users`** (rev 1 had one): the `/admin` table renders
  server-side from `users.list({limit: 500})` — same posture as settings
  having no GET endpoint.

`/admin` (now `requireRoleHtml('admin')`):
- **Access** fieldset in the existing form: `Require login` checkbox,
  (Phase B) 404-page / 403-page slug inputs; submitted through the extended
  `PUT /api/settings`.
- **Users** table: display name / email / `sub` / last login / role `<select>`
  + per-row Save (own script, own inline message — existing favicon-control
  pattern). **All IdP-controlled strings pass through `escapeHtml`**
  (stored-XSS-to-admin sink; test with
  `name = '<img src=x onerror=alert(1)>'` in the row).

### Editor visibility (viewer = read-only)

`renderArticle` branches on the **allowlist**:
`canEdit = user?.role === 'editor' || user?.role === 'admin'` (rev 1's
`!== 'viewer'` was fail-open). Viewers get the anonymous reader render —
cache-shared article, `Vary: Cookie` already present. Chrome: `layout()`
shows the "Admin settings" link only when `user.role === 'admin'`;
`EditorShellConfig` gains `userRole?: Role` and `client/main.ts` renders the
Admin link on exactly `cfg.userRole === 'admin'` — **absent = least
privilege, no `authDisabled⇒admin` inference** (server already sends the
real role in dev). `src/client/api-page-store.ts` gains a `403` branch
("you no longer have edit access" toast) — the one new error state a demoted
open tab will hit.

## Files

New (n) / modified (m), dependency-ordered. **A** = Phase A, **B** = Phase B.

A1. **`migrations/005_users.sql`** (n) — as above.
A2. **`src/shared/roles.ts`** (n) — `Role`, `ROLES`.
A3. **`src/server/db/users-repository.ts`** (n) — contract: `get(sub)`,
    `provision(sub): UserRecord` (insert-if-absent w/ bootstrap rule),
    `touchLogin(sub, email, name)`, `list({limit})`,
    `setRoleGuarded(sub, role, by) → {ok:true, record} | {ok:false, reason:
    'missing'|'last-admin'|'noop'}` , `destroy()`.
A4. **`src/server/db/users-pg.ts`** (n) — advisory-xact-lock around
    provision + setRoleGuarded (`pg_advisory_xact_lock`, key beside
    migrate.ts's).
A5. **`src/server/db/users-memory.ts`** (n) — mirrors semantics;
    `dump()` convention per `settings-memory.ts`.
A6. **`src/server/config.ts`** (m) — `DEFAULT_ROLE` + `BOOTSTRAP_ADMIN_SUBS`
    (comma list, optional); on `ServerConfig`.
A7. **`src/server/auth/session.ts`** (m) — `req.sessionClaims` parse;
    `AuthUser` typing; `requireRole`; `requireRoleHtml` stub wired to
    status document in A14/B; dev branch emits fresh `{...DEV_USER, role:
    'admin'}`.
A8. **`src/server/auth/roles.ts`** (n) — resolver hook factory
    (`get → provision-if-absent → publish req.user`).
A9. **`src/server/auth/routes.ts`** (m) — `touchLogin` in callback;
    `/api/me` includes `role`.
A10. **`src/server/auth/login-gate.ts`** (n) — `requireLoginHtml` /
    `requireLoginJson` closures.
A11. **`src/server/settings.ts`** (m) — `requireLogin` (default **false**),
    `notFoundSlug`/`forbiddenSlug` (default `null`; parse via
    `normalizePageSlug`, write via `coercePageSlug`) — keys
    `require_login`, `not_found_slug`, `forbidden_slug`.
A12. **`src/server/routes/settings-api.ts`** (m) — new fields; guard →
    `requireRole('admin')`.
A13. **`src/server/routes/users-api.ts`** (n) — `PUT /api/users/role`
    (strict-Origin variant of the same-origin guard).
A14. **`src/server/routes/admin.ts`** (m) — `requireRoleHtml('admin')`;
    Access fieldset; Users table (escaped, per-row save script).
A15. **`src/server/routes/pages-api.ts`** (m) — write guards →
    `requireRole('editor','admin')`; GET gate via A10; `private`+`Vary`
    flip; `getSettings` added to deps.
A16. **`src/server/routes/media.ts`** (m) — upload guard `requireRole
    ('editor','admin')` stays at `onRequest`; GET gate; `private` flip;
    blind-icon bundled-only rule.
A17. **`src/server/routes/pages-html.ts`** (m) — `canEdit` allowlist branch;
    A10 gate on HTML routes with prefix exemption; `chrome()` favicon rule;
    (B) 404 bodies → `statusDocument`.
A18. **`src/server/render/layout.ts`** (m) — role-aware Admin link; sign-in
    comment corrected (A19 copy lands in B).
A19. **`src/shared/dto.ts`** (m) + **`src/server/render/editor-shell.ts`**
    (m) + **`src/client/main.ts`** (m) — `userRole`; exact-match Admin link;
    fallback config = no admin link.
A20. **`src/client/api-page-store.ts`** (m) — 403 branch + toast copy.
A21. **`src/server/app.ts`** (m) — `AppDeps.users` (required unless
    `authDisabled`); resolver after sessions; login-gate deps; users routes.
A22. **`src/server/index.ts`** (m) — pg users repo wiring.
A23. **Tests A** — co-located per existing layout, plus new
    **`src/server/__tests__/helpers/fixtures.ts`**: `seedUser(repo, sub,
    role)` used by every authz-asserting suite (no dependence on
    first-login ordering). Files: `users-repository.test.ts` (fresh memory
    repo per case; bootstrap rule incl. warn-log), `roles.test.ts`
    (resolver: provision-if-absent, no write on hit, immediate demotion,
    missing-role fails closed), `users-api.test.ts` (400/404/409/200 matrix,
    strict-Origin, concurrent last-two-admin demotions → exactly one 409 via
    Promise.all), `pages-api.test.ts`/`settings-api`/`admin-routes.test.ts`
    (role matrix; editor→403 settings; viewer→403 writes; **`viewer GET
    /admin` → 403 HTML not JSON** — in A this means the built-in forbidden
    body), `pages-html.test.ts` (gate: anonymous 403+sign-in link, viewer
    sees reader render, editor/admin shells unchanged, `/api` gate JSON,
    private/Vary assertions, **gate document contains no `/media/` URL**,
    returnTo sanitized+escaped test), `settings.test.ts` (+**pre-feature
    row parses `requireLogin:false`**, slug fields round-trip),
    `config.test.ts`, `media.test.ts`, `users-pg.integration.test.ts`
    (`migrateWithRetry` helper; `DELETE FROM users` in setup — **load-bearing
    for the 80% gate**, like the other pg suites under `WN_TEST_PG_URL`).
    Update existing fixtures: suites forging **multiple** subs stop relying
    on first-login-is-admin.
A24. **Docs A** — `docs/api.md`: per-route authz matrix; Users API; login
    gate + per-surface cache/grace table; env vars; trust-model paragraph
    **rewritten** (and the mirrored claim in `settings.ts` header comment);
    explicit statements: login-only ≠ private wiki · revocation = demote,
    deleting rows resurrects · upgrade order (set `BOOTSTRAP_ADMIN_SUBS`
    before deploy, or log in with the trusted account **first**) ·
    per-process settings snapshot (multi-instance divergence) · chrome lag
    ≤60 s · IdP-issuer-rotation orphan recovery (SQL). `docs/architecture.md`
    (users repo trio, resolver, gate). `.env.example` + `docker-compose.yml`
    (`DEFAULT_ROLE`, `BOOTSTRAP_ADMIN_SUBS` passthroughs). Code comments
    corrected per B (sign-in-link invariant narrowed in A only where the
    gate exists).

B1. **`src/server/render/status-page.ts`** (n) — `statusDocument({kind,
    title, fallbackHtml, trail?, customSlug, pages, render, layout, chrome,
    signInHref?}) → {html, etag}`. Callers pre-build `fallbackHtml`/trail
    exactly as today (the **four** HTML-404 bodies differ in title/trail —
    rev 1's "five, byte-for-byte" claim corrected; `pages-html.ts:312` JSON
    404 stays JSON; the OIDC auth-failure page at `auth/routes.ts` stays
    as-is, documented as out of scope). Custom page markdown renders through
    the **static renderer** (raw HTML inside is escaped by the engine;
    inherits header/footer band trust verbatim — documented).
B2. **Cache the custom body:** `cache.set('s:404:{slug}' / 's:403:{slug}')`
    invalidated by the existing `invalidate(slug)` hook; settings revision
    mixed into the document ETag. Removes the unauthenticated
    DB-read+render amplification on error traffic (scanner storm case).
B3. **`src/server/settings.ts` / admin form** (from A11/A14): wire the two
    slug inputs; inline `/admin` warning when a designated status page exists
    as a normal content page: *"this page's body is served to every visitor,
    including anonymous ones, even in login-only mode"* (also in docs).
B4. **`src/server/routes/pages-html.ts` + `admin.ts` + `login-gate.ts` (m)**
    — swap built-in bodies for `statusDocument`; `requireRoleHtml` now
    renders the custom forbidden page; login-gate 403 uses `forbiddenSlug`.
B5. **Tests B** — custom 404/403 render (markdown, escaped raw HTML, safe
    hrefs), dangling slug → built-in fallback, unset → today's bodies
    unchanged, cache hit asserts single `pages.get`, sign-in link appended
    on the gate variant only, viewer 404 gains the *"ask an editor to create
    this page"* hint.
B6. **Docs B** — status pages in `api.md`; comment sweep: `layout.ts:232`
    and `pages-html.ts:152` "no sign-in affordance (locked decision)"
    reworded — the reversal is **scoped**: reader pages still ship no login
    link; the login-gate 403 (and only that) carries one, because with the
    site gated the "public button" objection no longer applies. `api.md`
    §"No page ships a sign-in link" rewritten to match; `theming.md` only if
    new classes (target: reuse `.wn-admin-form` / `.wn-status`).

## Steps

Phase A:
1. A1–A5 schema + repo trio + `users-repository.test.ts` (fresh repo per
   case). ✅ `npm test`
2. A6 config + tests (bad `DEFAULT_ROLE` rejected; `admin` rejected; subs
   list parsed).
3. A7–A9 role plumbing + resolver + callback touch + `/api/me` + tests
   (`roles.test.ts`).
4. A10–A13, A15, A16 guards & gate & settings fields (gate bodies built-in
   only; `requireRoleHtml` = built-in forbidden body until B) + tests
   (role matrix, users-api, gate posture incl. private/Vary/no-/media/URLs).
5. A14, A17–A22 chrome + viewer render + client bits + wiring + tests.
   `npm run build` for the client change.
6. A24 docs + comments. **Phase A validated:**
   `npm run typecheck && npm run lint && WN_TEST_PG_URL=… npm run
   test:coverage && npm run build`.

Phase B:
7. B1–B2 helper + cache + unit tests.
8. B3–B4 wiring into gate/404s/admin + tests B.
9. B6 docs/comment sweep + full validation again.

## Risks

- ⚠️ **First-login admin on shared IdPs** — the operator must claim admin on
  a trusted account before anyone else authenticates (`BOOTSTRAP_ADMIN_SUBS`
  removes the race; the grant is logged). Documented as upgrade order, not a
  hope.
- ⚠️ **Status-page disclosure (B)** — designated pages are public by
  definition, even in login-only mode. Inline admin warning + doc sentence;
  full privacy would require a separate "public" flag — deliberately out of
  scope.
- ⚠️ **Grace windows** — per-surface cache table in docs; only forced
  instant behavior is server-side gating + `no-store` 4xx.
- ⚠️ **Test blast radius** — mitigated: single-sub suites keep working via
  first-login-admin; `seedUser` helper for multi-sub suites; gate tests must
  run `authDisabled:false` with sealed cookies (DEV mode can never produce
  anonymous requests).
- ⚠️ **pg coverage threshold** — `users-pg.ts` is not coverage-excluded, so
  the integration suite is mandatory for CI, mirroring `media-pg`/`pages-pg`.
- ❓ Viewer 404 hint copy (B5) — proposed wording, trivially adjustable.

## What changed from rev 1 (reviewer-driven corrections)

1. **Provisioning moved off the read path** (rev 1 UPDATEd per request:
   WAL churn, meaningless `last_login_at`, write-dependent reads) → resolver
   SELECTs and inserts only on absence; email/name/last-login refresh at
   `/oidc/callback` (rev 1 wrongly said "no change" there).
2. **Both privilege races serialized** with one advisory-xact-lock
   mechanism (provisioning; last-admin demotion TOCTOU → total lockout) and
   the guard **moved into the repository** as the only setter.
3. **`BOOTSTRAP_ADMIN_SUBS` added** — rev 1's "first request wins admin" was
   an arbitrary privilege grant on every upgrade with live cookies; plus
   `warn` log on every admin grant.
4. **Fail-open viewer branch fixed** (`!== 'viewer'` → role allowlist);
   `req.user` gets a single writer; missing role can never pass a guard;
   `userRole` absent = least privilege (rev 1's dto clause contradicted
   itself); DEV_USER no longer shared-mutated.
5. **Cache posture fixed**: gated JSON/media responses become `private` +
   `Vary: Cookie` (rev 1's "no cached bytes leak" claim was false for
   `/api/pages*` — public, no Vary, ETag without settings revision — and for
   `immutable` media bytes); anonymous never sees override-media URLs.
6. **HTML vs JSON 403s**: `requireRoleHtml` for `/admin` and the gate;
   `/api|/oidc|/assets` prefix exemption inside the gate so JSON clients
   still get JSON.
7. **Gate implemented once** (`login-gate.ts`, two closures) instead of
   three drifting copies; strict `Origin` on the role-granting endpoint.
8. **Status-page render cached** (rev 1 created an unauthenticated
   DB-read+render amplification on error traffic); "five 404 bodies
   byte-for-byte" corrected to four differing HTML bodies + pinned by
   existing assertions.
9. **Settings defaults pinned** (`requireLogin:false` test against
   pre-feature rows — the highest-blast-radius unstated value in rev 1).
10. **`GET /api/users` dropped** (no consumer; server-rendered table), role
    enum centralized in `shared/roles.ts`, users table gains audit columns,
    `/admin` table escaping made explicit, `setRole` 404/400/no-op contract,
    `seedUser` test helper, `AppDeps.users` required outside dev mode.
11. **Locked-decision reversal surfaced** (sign-in link) and scoped; doc
    claims rewritten (trust model, login-only ≠ private, deletion ≠
    revocation, issuer-rotation recovery).
12. **Plan split A/B** per both reviewers: security value lands without
    waiting on the status-page surface.
