// ─── Admin settings page ─────────────────────────────────────────────────────
// Server-rendered form (any authenticated user) to toggle search and set the
// default home page. The form PUTs /api/settings and reloads on success.

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
    var res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        searchEnabled: checkbox.checked,
        allPagesEnabled: allPagesCheckbox.checked,
        homeSlug: homeInput.value.trim(),
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
      scripts: ADMIN_SCRIPT,
    })
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(html)
  })
}
