// ─── Admin settings page ─────────────────────────────────────────────────────
// Server-rendered form (any authenticated user) to toggle search, set the
// default home page, and edit site branding (name + raw header/footer HTML).
// The form PUTs /api/settings and reloads on success. Note: the header/footer
// bands are deliberately NOT rendered on /admin itself — broken or defaced
// branding must never bury the form used to recover it (site name still
// decorates the title/breadcrumb, which is escaped chrome).

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { renderLayout, escapeHtml } from '../render/layout'
import { forbiddenBodyHtml, renderStatusDocument } from '../render/status-page'
import { ROLES } from '../../shared/roles'
import type { SettingsService } from '../settings'
import type { NavLinksService } from '../render/nav'
import type { MediaRepository } from '../db/media-repository'
import type { UserRecord, UsersRepository } from '../db/users-repository'
import type { ServerConfig } from '../config'

export interface AdminDeps {
  config: ServerConfig
  settings: SettingsService
  media: MediaRepository
  users: UsersRepository
  nav: NavLinksService
}

/**
 * HTML-aware admin guard: anonymous gets the conventional 401 JSON (the
 * page is a known operator route, not a public surface); an authenticated
 * viewer/editor gets a readable 403 document, never a raw JSON blob.
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
    const html = renderStatusDocument(renderLayout, chromeFor(req.user, s, navLinks, deps), {
      title: 'Forbidden',
      bodyHtml: forbiddenBodyHtml(),
      trail: [
        { href: '/', label: 'Home' },
        { href: '/admin', label: 'Admin settings' },
      ],
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
      scripts: ADMIN_SCRIPT + ICON_SCRIPT + USERS_SCRIPT,
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(html)
  })
}
