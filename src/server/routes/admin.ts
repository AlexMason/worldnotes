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
import type { ServerConfig } from '../config'

export interface AdminDeps {
  config: ServerConfig
  settings: SettingsService
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

export async function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): Promise<void> {
  const { config, settings } = deps

  app.get('/admin', { preHandler: [requireAuth] }, async (req, reply) => {
    const s = settings.get()
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
      `</form>`

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
      scripts: ADMIN_SCRIPT,
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(html)
  })
}
