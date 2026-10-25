// ─── Admin settings page ─────────────────────────────────────────────────────
// Server-rendered form (any authenticated user) to toggle search, set the
// default home page, and edit site branding (name + raw header/footer HTML).
// The form PUTs /api/settings and reloads on success. Note: the header/footer
// bands are deliberately NOT rendered on /admin itself — broken or defaced
// branding must never bury the form used to recover it (site name still
// decorates the title/breadcrumb, which is escaped chrome). The same rule
// covers theme CSS: /admin never receives `themeCss`, so a broken theme can
// never bury the Themes gallery used to fix or deactivate it.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { renderLayout, escapeHtml } from '../render/layout'
import { forbiddenBodyHtml, statusDocument, type StatusDeps } from '../render/status-page'
import { ROLES } from '../../shared/roles'
import type { SettingsService } from '../settings'
import type { NavLinksService } from '../render/nav'
import type { ThemeService } from '../themes'
import { THEME_CSS_MAX, THEME_DESCRIPTION_MAX, THEME_NAME_MAX } from '../themes'
import type { ThemeRow } from '../db/themes-repository'
import type { MediaRepository } from '../db/media-repository'
import type { UserRecord, UsersRepository } from '../db/users-repository'
import type { PagesRepository } from '../db/repository'
import type { RenderCache } from '../cache'
import type { ServerConfig } from '../config'

export interface AdminDeps {
  config: ServerConfig
  settings: SettingsService
  media: MediaRepository
  users: UsersRepository
  nav: NavLinksService
  /** Status-document seam (custom forbidden page): reader deps for the 403. */
  pages: PagesRepository
  cache: RenderCache
  render: { render(src: string): string }
  /** Theme gallery store (listing only — writes go through /api/themes). */
  themes: ThemeService
}

/**
 * HTML-aware admin guard: anonymous gets the conventional 401 JSON (the
 * page is a known operator route, not a public surface); an authenticated
 * viewer/editor gets a readable 403 document (custom forbidden page when
 * designated), never a raw JSON blob. No sign-in link on this variant — the
 * caller is already authenticated.
 */
function requireAdminHtml(deps: AdminDeps) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      await reply.code(401).send({ error: 'unauthorized' })
      return
    }
    if (req.user.role === 'admin') return
    const s = deps.settings.get()
    const navLinks = await deps.nav.links()
    const statusDeps: StatusDeps = {
      layout: renderLayout,
      render: deps.render,
      pages: deps.pages,
      cache: deps.cache,
    }
    const html = await statusDocument(statusDeps, {
      kind: '403',
      title: 'Forbidden',
      fallbackHtml: forbiddenBodyHtml(),
      trail: [
        { href: '/', label: 'Home' },
        { href: '/admin', label: 'Admin settings' },
      ],
      customSlug: s.forbiddenSlug,
      chrome: chromeFor(req.user, s, navLinks, deps),
    })
    await reply
      .code(403)
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .header('vary', 'Cookie')
      .send(html)
  }
}

function chromeFor(
  user: FastifyRequest['user'],
  s: ReturnType<SettingsService['get']>,
  navLinks: Awaited<ReturnType<NavLinksService['links']>>,
  deps: AdminDeps,
) {
  return {
    user,
    authDisabled: deps.config.authDisabled,
    searchEnabled: s.searchEnabled,
    allPagesEnabled: s.allPagesEnabled,
    siteName: s.siteName,
    navLinks,
    faviconMediaId: s.requireLogin && !user ? null : s.faviconMediaId,
  }
}

const ADMIN_SCRIPT = `
(function () {
  var form = document.getElementById('wn-admin-form');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var checkbox = form.querySelector('[name=searchEnabled]');
    var allPagesCheckbox = form.querySelector('[name=allPagesEnabled]');
    var homeInput = form.querySelector('[name=homeSlug]');
    var navInput = form.querySelector('[name=navSlug]');
    var siteNameInput = form.querySelector('[name=siteName]');
    var headerInput = form.querySelector('[name=headerHtml]');
    var footerInput = form.querySelector('[name=footerHtml]');
    var requireLoginInput = form.querySelector('[name=requireLogin]');
    var notFoundInput = form.querySelector('[name=notFoundSlug]');
    var forbiddenInput = form.querySelector('[name=forbiddenSlug]');
    var res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        searchEnabled: checkbox.checked,
        allPagesEnabled: allPagesCheckbox.checked,
        homeSlug: homeInput.value.trim(),
        navSlug: navInput.value.trim(),
        siteName: siteNameInput.value,
        headerHtml: headerInput.value,
        footerHtml: footerInput.value,
        requireLogin: requireLoginInput.checked,
        notFoundSlug: notFoundInput.value.trim(),
        forbiddenSlug: forbiddenInput.value.trim(),
      }),
    });
    if (res.ok) { window.location.reload(); return; }
    var msg = document.getElementById('wn-admin-msg');
    if (msg) {
      msg.hidden = false;
      var detail = '';
      try { detail = (await res.json()).error || ''; } catch (err) { /* ignore */ }
      msg.textContent = detail ? 'Save failed — ' + detail : 'Save failed — check the values and try again.';
    }
  });
})();
`

// Favicon controls live OUTSIDE the main settings form (own buttons, own
// message line) so the main "Save settings" never carries icon fields, and
// an icon upload is a two-call flow: POST /api/media then a partial
// PUT /api/settings — the settings API only applies fields it receives.
const ICON_SCRIPT = `
(function () {
  var uploadBtn = document.getElementById('wn-icon-upload');
  var removeBtn = document.getElementById('wn-icon-remove');
  var fileInput = document.getElementById('wn-icon-file');
  var msg = document.getElementById('wn-icon-msg');
  function show(text) { if (msg) { msg.hidden = false; msg.textContent = text; } }
  async function saveFavicon(patch) {
    var res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) { window.location.reload(); return; }
    var detail = '';
    try { detail = (await res.json()).error || ''; } catch (err) { /* ignore */ }
    show('Save failed — ' + (detail || 'check the image and try again.'));
  }
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', async function () {
      if (!fileInput.files || !fileInput.files[0]) { show('Choose an image first.'); return; }
      var form = new FormData();
      form.append('file', fileInput.files[0]);
      var res;
      try { res = await fetch('/api/media', { method: 'POST', body: form }); }
      catch (err) { show('Upload failed — network error.'); return; }
      if (!res.ok) {
        var detail = '';
        try { detail = (await res.json()).error || ''; } catch (err) { /* ignore */ }
        show('Upload failed — ' + (detail || res.status));
        return;
      }
      var uploaded = await res.json();
      await saveFavicon({ faviconMediaId: uploaded.id });
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener('click', function () { saveFavicon({ faviconMediaId: null }); });
  }
})();
`

// Per-row role save: own button, own message line (favicon pattern) so a
// failed demotion (409 last admin, 403 revoked rights) never buries the rest
// of the table. Every user-controlled string was escaped server-side.
const USERS_SCRIPT = `
(function () {
  document.querySelectorAll('tr[data-sub]').forEach(function (row) {
    var btn = row.querySelector('.wn-user-save');
    var sel = row.querySelector('select');
    var msg = row.querySelector('.wn-user-msg');
    if (!btn || !sel || !msg) return;
    btn.addEventListener('click', async function () {
      msg.hidden = false;
      msg.textContent = 'Saving…';
      var res;
      try {
        res = await fetch('/api/users/role', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sub: row.dataset.sub, role: sel.value }),
        });
      } catch (err) {
        msg.textContent = 'Save failed — network error.';
        return;
      }
      if (res.ok) {
        msg.textContent = 'Saved.';
        return;
      }
      var detail = '';
      try { detail = (await res.json()).error || ''; } catch (err) { /* ignore */ }
      msg.textContent = 'Save failed — ' + (detail || res.status);
    });
  });
})();
`

// Theme gallery: one block per theme, each with its own buttons and message
// line (favicon/users pattern) so a failed save (400 invalid CSS, 409 name
// taken / delete-active) never buries the rest of the gallery. Writes hit
// /api/themes; activation is a partial PUT /api/settings.
const THEMES_SCRIPT = `
(function () {
  async function call(method, url, body) {
    var res = await fetch(url, {
      method: method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    var detail = '';
    if (!res.ok) { try { detail = (await res.json()).error || ''; } catch (err) { /* ignore */ } }
    return { ok: res.ok, status: res.status, detail: detail };
  }
  function bind(msg) {
    function show(text) { msg.hidden = false; msg.textContent = text; }
    async function run(method, url, body) {
      show('Working…');
      var r;
      try { r = await call(method, url, body); }
      catch (err) { show('Request failed — network error.'); return; }
      if (r.ok) { window.location.reload(); return; }
      show('Failed — ' + (r.detail || r.status));
    }
    return run;
  }
  function fields(root) {
    return {
      name: root.querySelector('[name=themeName]').value,
      description: root.querySelector('[name=themeDescription]').value,
      css: root.querySelector('[name=themeCss]').value,
    };
  }
  document.querySelectorAll('[data-theme-id]').forEach(function (root) {
    var id = root.dataset.themeId;
    var msg = root.querySelector('.wn-theme-msg');
    var run = bind(msg);
    root.querySelector('.wn-theme-save').addEventListener('click', function () {
      run('PUT', '/api/themes/' + id, fields(root));
    });
    var activate = root.querySelector('.wn-theme-activate');
    if (activate) activate.addEventListener('click', function () {
      run('PUT', '/api/settings', { activeThemeId: Number(id) });
    });
    var deactivate = root.querySelector('.wn-theme-deactivate');
    if (deactivate) deactivate.addEventListener('click', function () {
      run('PUT', '/api/settings', { activeThemeId: null });
    });
    root.querySelector('.wn-theme-delete').addEventListener('click', function () {
      if (window.confirm('Delete this theme?')) run('DELETE', '/api/themes/' + id);
    });
  });
  var fresh = document.getElementById('wn-theme-new');
  if (fresh) {
    var freshMsg = fresh.querySelector('.wn-theme-msg');
    var freshRun = bind(freshMsg);
    fresh.querySelector('.wn-theme-create').addEventListener('click', function () {
      freshRun('POST', '/api/themes', fields(fresh));
    });
  }
})();
`
/** Fields shared by the edit blocks and the create form. The leading newline
 *  in the textarea survives the HTML parser's first-newline strip. */
function themeFields(theme: ThemeRow | null): string {
  return (
    `<label>Name<input type="text" name="themeName" maxlength="${THEME_NAME_MAX}" value="${escapeHtml(
      theme?.name ?? '',
    )}" placeholder="e.g. Midnight"></label>` +
    `<label>Description (optional)<input type="text" name="themeDescription" maxlength="${THEME_DESCRIPTION_MAX}" value="${escapeHtml(
      theme?.description ?? '',
    )}"></label>` +
    `<label>CSS (up to ${THEME_CSS_MAX} characters)<textarea class="wn-theme-css" name="themeCss" rows="12" spellcheck="false">\n${escapeHtml(
      theme?.css ?? '',
    )}</textarea></label>`
  )
}

/**
 * The Themes gallery. Names/descriptions/CSS are admin-authored but still go
 * through escapeHtml — the CSS is shown as text in a textarea, never emitted
 * as markup. NOTE: /admin itself never applies the active theme (anti-lockout
 * — see the file header), so a broken theme cannot bury this form.
 */
function themesSection(themes: ThemeRow[], activeId: number | null): string {
  const active = activeId === null ? null : (themes.find((t) => t.id === activeId) ?? null)
  const status =
    activeId === null
      ? 'No theme is active — readers and editors see the default look.'
      : active
        ? `Active theme: \u201c${escapeHtml(active.name)}\u201d.`
        : `The active theme (#${activeId}) no longer exists — the default look is in use.`
  const blocks = themes
    .map(
      (t) =>
        `<details class="wn-theme" data-theme-id="${t.id}"${t.id === activeId ? ' open' : ''}>` +
        `<summary>${escapeHtml(t.name)}${
          t.id === activeId ? ' <span class="wn-theme-badge">active</span>' : ''
        }${t.description ? ` \u2014 <span class="wn-theme-desc">${escapeHtml(t.description)}</span>` : ''}</summary>` +
        themeFields(t) +
        `<div class="wn-theme-actions">` +
        `<button type="button" class="wn-theme-save">Save theme</button>` +
        (t.id === activeId
          ? `<button type="button" class="wn-theme-deactivate">Deactivate</button>`
          : `<button type="button" class="wn-theme-activate">Activate</button>`) +
        `<a class="wn-theme-preview" href="/?previewTheme=${t.id}" target="_blank" rel="noopener">Preview</a>` +
        `<button type="button" class="wn-theme-delete">Delete</button>` +
        `</div>` +
        `<p class="wn-theme-msg wn-admin-msg" hidden></p>` +
        `</details>`,
    )
    .join('')
  return (
    `<section class="wn-admin-form wn-themes" style="margin-top:2rem">` +
    `<h2>Themes</h2>` +
    `<p class="wn-admin-msg">${status}</p>` +
    `<p class="wn-admin-msg">A theme is a CSS stylesheet appended after the default styles on the reader and the editor
       (never on this page). It is raw, admin-trusted CSS shown to every visitor. Preview opens the site
       with that theme for you only.</p>` +
    (blocks || `<p class="wn-admin-msg">No themes yet \u2014 create one below.</p>`) +
    `<div id="wn-theme-new" class="wn-theme wn-theme-new"><h3>New theme</h3>` +
    themeFields(null) +
    `<div class="wn-theme-actions"><button type="button" class="wn-theme-create">Create theme</button></div>` +
    `<p class="wn-theme-msg wn-admin-msg" hidden></p></div>` +
    `</section>`
  )
}
function formatLogin(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + 'Z'
}

/**
 * The Users table (admin-only surface). Every displayed string is
 * IdP-controlled (editable by the account holder) — all of it goes through
 * escapeHtml; this table would otherwise be a stored-XSS-to-admin sink.
 */
function usersSection(user: { sub: string } | null, rows: UserRecord[]): string {
  const trs = rows
    .map(
      (u) =>
        `<tr data-sub="${escapeHtml(u.sub)}">` +
        `<td>${escapeHtml(u.name ?? '\u2014')}</td>` +
        `<td>${escapeHtml(u.email ?? '\u2014')}</td>` +
        `<td><code>${escapeHtml(u.sub)}</code>${
          user && u.sub === user.sub ? ' <em>(you)</em>' : ''
        }</td>` +
        `<td>${formatLogin(u.lastLoginAt)}</td>` +
        `<td><label class="wn-user-role"><span class="wn-visually-hidden">Role for</span>` +
        `<select aria-label="Role for ${escapeHtml(u.sub)}">` +
        ROLES.map(
          (r) => `<option value="${r}"${r === u.role ? ' selected' : ''}>${r}</option>`,
        ).join('') +
        `</select></label>` +
        `<button type="button" class="wn-user-save">Save</button>` +
        `<p class="wn-user-msg wn-admin-msg" hidden></p></td>` +
        `</tr>`,
    )
    .join('')
  return (
    `<section class="wn-admin-form" style="margin-top:2rem">` +
    `<h2>Users</h2>` +
    (trs
      ? `<table class="wn-users-table"><thead><tr><th>Name</th><th>Email</th><th>Subject</th>` +
        `<th>Last login</th><th>Role</th></tr></thead><tbody>${trs}</tbody></table>`
      : `<p class="wn-admin-msg">No one has signed in yet — accounts appear here after their first login.</p>`) +
    `<p class="wn-admin-msg">Revoking access means demoting to “viewer”: deleting the database row does not — the
       account re-provisions at the default role on its next request. The last remaining admin cannot be demoted.</p>` +
    `</section>`
  )
}

export async function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): Promise<void> {
  const { config, settings, media, users, nav } = deps

  app.get('/admin', { preHandler: [requireAdminHtml(deps)] }, async (req, reply) => {
    const s = settings.get()
    const navLinks = await nav.links()
    // Icon state: override row healthy → thumbnail; row missing (dangling
    // two-step/restore) → name the state so the operator knows to re-upload.
    let iconState = '<p class="wn-admin-msg">Using the bundled default icons.</p>'
    if (s.faviconMediaId !== null) {
      const row = await media.get(s.faviconMediaId)
      iconState = row
        ? `<p class="wn-admin-msg">Custom icon in use (<img src="/media/${s.faviconMediaId}" alt="current icon" width="32" height="32">, ${row.width ?? '?'}\u00d7${row.height ?? '?'} ${row.mediaType}).</p>`
        : `<p class="wn-admin-msg">Icon override points at media #${s.faviconMediaId}, which is missing \u2014 upload a new image to recover.</p>`
    }
    // Status-page designation state (nav/fallback pattern: name the state
    // so a typo or deleted page is visible without hunting for it).
    const statusNote = async (label: string, slug: string | null): Promise<string> => {
      if (!slug) return ''
      const exists = await deps.pages.get(slug)
      return exists
        ? ''
        : `<p class="wn-admin-msg">The ${label} page \u201c${escapeHtml(slug)}\u201d does not exist yet —
           the built-in document stays in use until it does.</p>`
    }
    // Leading newline in each textarea guards against the HTML parser
    // swallowing a stored value's own first newline (it strips exactly one
    // after the opening tag; this synthetic one is what gets stripped).
    const body =
      `<h1>Admin settings</h1>` +
      `<form id="wn-admin-form" class="wn-admin-form" method="post" action="/api/settings">` +
      `<label class="checkbox"><input type="checkbox" name="searchEnabled"${
        s.searchEnabled ? ' checked' : ''
      }> Enable search</label>` +
      `<label class="checkbox"><input type="checkbox" name="allPagesEnabled"${
        s.allPagesEnabled ? ' checked' : ''
      }> Enable all pages listing</label>` +
      `<label>Home page (slug; blank shows the page index)<input type="text" name="homeSlug" value="${escapeHtml(
        s.homeSlug ?? '',
      )}" placeholder="e.g. home"></label>` +
      `<label>Nav page (slug; its top-level list links appear in the site header)` +
      `<input type="text" name="navSlug" value="${escapeHtml(
        s.navSlug ?? '',
      )}" placeholder="e.g. nav"></label>` +
      // Silent-empty nav is a support magnet: name the state when the page
      // yields nothing (missing page, or no top-level links found).
      (s.navSlug && navLinks.length === 0
        ? `<p class="wn-admin-msg">No nav links found on \u201c${escapeHtml(s.navSlug)}\u201d \u2014
           the page must exist and its top-level list items must contain page
           links.</p>`
        : '') +
      `<label>Site name (tab title + breadcrumb home label)<input type="text" name="siteName" value="${escapeHtml(
        s.siteName,
      )}" placeholder="WorldNotes"></label>` +
      `<label>Header HTML (raw, shown to all readers at the top of every page)<textarea name="headerHtml" rows="4">\n${escapeHtml(
        s.headerHtml,
      )}</textarea></label>` +
      `<label>Footer HTML (raw, shown to all readers at the bottom of every page)<textarea name="footerHtml" rows="4">\n${escapeHtml(
        s.footerHtml,
      )}</textarea></label>` +
      `<fieldset class="wn-admin-fieldset"><legend>Access</legend>` +
      `<label class="checkbox"><input type="checkbox" name="requireLogin"${
        s.requireLogin ? ' checked' : ''
      }> Login required (no anonymous reading)</label>` +
      `<label>404 page (slug; its content renders on "Page not found")<input type="text" name="notFoundSlug" value="${escapeHtml(
        s.notFoundSlug ?? '',
      )}" placeholder="e.g. not-found"></label>` +
      `<label>403 page (slug; its content renders when sign-in is required)<input type="text" name="forbiddenSlug" value="${escapeHtml(
        s.forbiddenSlug ?? '',
      )}" placeholder="e.g. no-access"></label>` +
      `<p class="wn-admin-msg">Designated status pages are served to every visitor —
         including anonymous readers in login-only mode. Keep their content public-safe.</p>` +
      (await statusNote('404', s.notFoundSlug)) +
      (await statusNote('403', s.forbiddenSlug)) +
      `</fieldset>` +
      `<button type="submit">Save settings</button>` +
      `<p id="wn-admin-msg" class="wn-admin-msg" hidden></p>` +
      `</form>` +
      `<section class="wn-admin-form" style="margin-top:2rem">` +
      `<h2>Favicon</h2>` +
      iconState +
      `<label>Override icon (PNG / JPEG / GIF / WebP / ICO, one image)<input type="file" id="wn-icon-file" accept="image/png,image/jpeg,image/gif,image/webp,image/vnd.microsoft.icon"></label>` +
      `<div class="wn-admin-icon-actions"><button type="button" id="wn-icon-upload">Upload icon</button>` +
      `<button type="button" id="wn-icon-remove">Use default icons</button></div>` +
      `<p id="wn-icon-msg" class="wn-admin-msg" hidden></p>` +
      `</section>` +
      themesSection(await deps.themes.list(), s.activeThemeId) +
      usersSection(req.user, await users.list({ limit: 500 }))

    const html = renderLayout({
      title: 'Admin settings',
      body,
      trail: [
        { href: '/', label: 'Home' },
        { href: '/admin', label: 'Admin settings' },
      ],
      user: req.user,
      authDisabled: config.authDisabled,
      searchEnabled: s.searchEnabled,
      allPagesEnabled: s.allPagesEnabled,
      siteName: s.siteName,
      // Nav links are escaped chrome (unlike the raw bands omitted here):
      // they can never deface or bury the recovery form.
      navLinks,
      faviconMediaId: s.requireLogin && !req.user ? null : s.faviconMediaId,
      scripts: ADMIN_SCRIPT + ICON_SCRIPT + THEMES_SCRIPT + USERS_SCRIPT,
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(html)
  })
}
