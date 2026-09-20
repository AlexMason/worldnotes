// ─── Admin settings page ─────────────────────────────────────────────────────
// Server-rendered form (any authenticated user) to toggle search, set the
// default home page, and edit site branding (name + raw header/footer HTML).
// The form PUTs /api/settings and reloads on success. Note: the header/footer
// bands are deliberately NOT rendered on /admin itself — broken or defaced
// branding must never bury the form used to recover it (site name still
// decorates the title/breadcrumb, which is escaped chrome).

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/session'
import { renderLayout, escapeHtml } from '../render/layout'
import type { SettingsService } from '../settings'
import type { NavLinksService } from '../render/nav'
import type { MediaRepository } from '../db/media-repository'
import type { ServerConfig } from '../config'

export interface AdminDeps {
  config: ServerConfig
  settings: SettingsService
  media: MediaRepository
  nav: NavLinksService
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

export async function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): Promise<void> {
  const { config, settings, media, nav } = deps

  app.get('/admin', { preHandler: [requireAuth] }, async (req, reply) => {
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
      `</section>`

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
      faviconMediaId: s.faviconMediaId,
      scripts: ADMIN_SCRIPT + ICON_SCRIPT,
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(html)
  })
}
