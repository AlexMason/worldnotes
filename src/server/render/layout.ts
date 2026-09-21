// ─── Viewer document layout ──────────────────────────────────────────────────
// Dependency-free HTML shell for the anonymous read path. The article body is
// the single-engine render (core static renderer), so the page embeds the
// editor's own token + content stylesheets (src/core/styles.ts) — the reader
// is the editor, read-only. VIEW_CSS below is chrome only (bar, crumbs,
// index/search/admin); it must not restyle anything the editor classes own.

import type { AuthUser } from '../auth/session'
import type { NavLink } from '../../shared/dto'
import { EDITOR_TOKENS_CSS, EDITOR_CONTENT_CSS, SITE_BANDS_CSS } from '../../core/styles'
import { composeDocTitle } from '../../shared/doc-title'
import { iconTagsHtml } from './icons'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const VIEW_CSS = `
:root { color-scheme: light dark;
  --wn-bg: #fbfaf7; --wn-fg: #23211d; --wn-muted: #6f6a61; --wn-accent: #1a5fb4;
  --wn-border: #e3ded4; --wn-code-bg: #f0ede6; }
@media (prefers-color-scheme: dark) { :root {
  --wn-bg: #191816; --wn-fg: #dcd7cd; --wn-muted: #9a948a; --wn-accent: #78a9e0;
  --wn-border: #33302b; --wn-code-bg: #232120; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--wn-bg); color: var(--wn-fg);
  font: 16px/1.65 ui-serif, Georgia, 'Times New Roman', serif; }
header.wn-view-bar { display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; padding: .6rem 1.2rem; border-bottom: 1px solid var(--wn-border);
  font: 14px/1.4 system-ui, sans-serif; position: relative; }
/* Breadcrumb: a flex row of truncating crumb boxes — per-crumb ellipsis is
   the width backstop; renderLayout's count-based middle-collapse handles depth. */
nav.wn-crumbs { display: flex; align-items: baseline; min-width: 0; }
nav.wn-crumbs a { color: var(--wn-muted); text-decoration: none; }
nav.wn-crumbs a:hover { color: var(--wn-accent); }
nav.wn-crumbs span[aria-current] { color: var(--wn-fg); }
nav.wn-crumbs > a, nav.wn-crumbs > span[aria-current] {
  display: block; max-width: 18ch; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; }
.wn-crumb-sep { flex: 0 0 auto; color: var(--wn-muted); padding: 0 .25em; user-select: none; }
.wn-crumb-more { position: relative; display: inline-block; flex: 0 0 auto; }
.wn-crumb-more > summary { list-style: none; cursor: pointer; color: var(--wn-muted);
  padding: 0 .2em; line-height: 1; }
.wn-crumb-more > summary::-webkit-details-marker { display: none; }
.wn-crumb-more[open] > summary { color: var(--wn-accent); }
.wn-crumb-drop { position: absolute; top: calc(100% + .35rem); left: 0; z-index: 40;
  display: flex; flex-direction: column; gap: .2rem; min-width: 10rem;
  background: var(--wn-bg); border: 1px solid var(--wn-border); border-radius: 6px;
  padding: .4rem .7rem; box-shadow: 0 4px 12px rgb(0 0 0 / 12%); }
.wn-crumb-drop a { display: block; color: var(--wn-muted); text-decoration: none;
  white-space: nowrap; }
.wn-crumb-drop a:hover { color: var(--wn-accent); }
main { max-width: 46rem; margin: 0 auto; padding: 2rem 1.2rem 5rem; }
/* Article typography mirrors the editor surface (.wn-editor) — the wn-*
   content rules come from EDITOR_CONTENT_CSS; the article element carries
   .wn-root so EDITOR_TOKENS_CSS custom properties resolve inside it. */
.wn-article {
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  color: var(--wn-color-fg, #23211d);
  white-space: pre-wrap;
  word-break: break-word;
}
ul.wn-page-list { list-style: none; padding: 0; } ul.wn-page-list li { padding: .15rem 0; }
.wn-status h1 { font-size: 1.6rem; }
.wn-search-form { display: flex; gap: .4rem; } .wn-search-form input { font: inherit;
  padding: .25em .6em; border: 1px solid var(--wn-border); border-radius: 6px;
  background: var(--wn-bg); color: var(--wn-fg); }
.wn-admin-form { display: flex; flex-direction: column; gap: .9rem; max-width: 32rem; }
.wn-admin-form label { display: flex; flex-direction: column; gap: .3rem; font: 14px/1.4 system-ui, sans-serif; }
.wn-admin-form label.checkbox { flex-direction: row; align-items: center; gap: .5rem; }
.wn-admin-form input[type='text'] { font: inherit; padding: .35em .6em;
  border: 1px solid var(--wn-border); border-radius: 6px; background: var(--wn-bg); color: var(--wn-fg); }
.wn-admin-form textarea { font: 13px/1.5 ui-monospace, Menlo, monospace; min-height: 5.5rem;
  padding: .35em .6em; border: 1px solid var(--wn-border); border-radius: 6px;
  background: var(--wn-bg); color: var(--wn-fg); resize: vertical; }
.wn-admin-form button { align-self: flex-start; font: inherit; padding: .4em 1.1em;
  border-radius: 6px; border: 1px solid var(--wn-accent); background: transparent;
  color: var(--wn-accent); cursor: pointer; }
.wn-admin-msg { color: var(--wn-accent); font: 14px/1.4 system-ui, sans-serif; }
.wn-users-table { border-collapse: collapse; font: 14px/1.5 system-ui, sans-serif; width: 100%; }
.wn-users-table th, .wn-users-table td { text-align: left; padding: .35rem .6rem .35rem 0;
  border-bottom: 1px solid var(--wn-border); vertical-align: top; }
.wn-users-table select { font: inherit; margin-right: .4rem; }
.wn-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; }
/* Site nav: custom nav links then the built-in actions. Desktop renders them
   inline and hides the hamburger toggle; on mobile the toggle (a <details>
   wrapping ONLY its summary) appears and :has() hides the sibling actions
   until it opens. The actions div is never a details child, so the UA never
   hides it — browsers without :has() simply keep the actions visible. */
.wn-nav { display: flex; align-items: center; gap: .8rem; margin-left: auto;
  flex-wrap: wrap; justify-content: flex-end; min-width: 0; position: relative; }
.wn-nav .wn-menu { display: none; }
.wn-view-actions { display: flex; gap: .8rem; align-items: center; min-width: 0; flex-wrap: wrap; }
.wn-view-actions a { color: var(--wn-muted); text-decoration: none; }
.wn-nav-link { display: block; max-width: 16ch; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; }

@media (max-width: 640px) {
  header.wn-view-bar { flex-wrap: wrap; row-gap: .4rem; padding: .5rem .9rem; }
  nav.wn-crumbs { flex: 1 1 auto; min-width: 0; order: 1; overflow-x: auto;
    scrollbar-width: none; /* final width fallback; crumb boxes already truncate */ }
  nav.wn-crumbs::-webkit-scrollbar { display: none; }
  /* an open breadcrumb dropdown must not be clipped by the scroller */
  nav.wn-crumbs:has(.wn-crumb-more[open]) { overflow: visible; }
  .wn-nav { order: 2; flex: 0 0 auto; flex-wrap: nowrap; }
  .wn-nav .wn-menu { display: block; }
  .wn-nav .wn-menu summary { list-style: none; cursor: pointer; display: flex;
    align-items: center; padding: .45em .5em; min-height: 44px;
    border: 1px solid var(--wn-border); border-radius: 6px; color: var(--wn-fg); }
  .wn-nav .wn-menu summary::-webkit-details-marker { display: none; }
  .wn-nav .wn-menu[open] summary { color: var(--wn-accent); border-color: var(--wn-accent); }
  .wn-nav:has(.wn-menu:not([open])) .wn-view-actions { display: none; }
  .wn-nav .wn-view-actions { position: absolute; top: calc(100% + .35rem); right: 0;
    z-index: 50; flex-direction: column; align-items: stretch; gap: .1rem;
    min-width: 13rem; max-height: 70vh; overflow-y: auto;
    background: var(--wn-bg); border: 1px solid var(--wn-border); border-radius: 8px;
    padding: .5rem .9rem; box-shadow: 0 6px 16px rgb(0 0 0 / 15%); }
  .wn-view-actions a { display: block; padding: .45em .35em; min-height: 44px; }
  main { padding: 1.2rem .9rem 4rem; }
  .wn-article { overflow-wrap: break-word; }
  ul.wn-page-list a { display: inline-block; padding: .35em 0; }
  .wn-search-form { flex-wrap: wrap; }
  .wn-search-form input { flex: 1 1 100%; }
  .wn-search-form input, .wn-search-form button {
    min-height: 44px; /* comfortable touch targets */ }
}
`.trim()

export interface LayoutOptions {
  title: string
  body: string
  trail?: { href: string; label: string }[]
  status?: number
  user?: AuthUser | null
  authDisabled?: boolean
  /** Show search affordances; defaults to true. */
  searchEnabled?: boolean
  /** Show the "All pages" affordance; defaults to true. */
  allPagesEnabled?: boolean
  /** Links extracted from the configured nav page, rendered inside the site
   *  nav BEFORE the built-in actions. Escaped chrome (never raw content). */
  navLinks?: NavLink[]
  /** Extra inline scripts appended after the built-in ones. */
  scripts?: string
  /** Site branding: tab-title suffix + breadcrumb home label ('' = none). */
  siteName?: string
  /** Media row overriding the bundled favicon set; null/absent = defaults. */
  faviconMediaId?: number | null
  /**
   * Raw admin-trusted HTML bands rendered inside `<main>` around the body.
   * Emitted verbatim (no escaping) — scripts inside execute for anonymous
   * readers; only the settings API (authenticated) can author them.
   */
  headerHtml?: string
  footerHtml?: string
}

const SEARCH_SCRIPT = `
(function () {
  var form = document.getElementById('wn-search-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = new FormData(form).get('terms');
    v = String(v || '').trim();
    if (v) window.location = '/search/' + encodeURIComponent(v);
  });
})();
`

/** Max breadcrumb boxes rendered before middle segments collapse under an
 *  ellipsis dropdown. With 5+ crumbs we show first + `…` + last two — the
 *  shape "Home / … / parent / current" keeps the page's immediate ancestry
 *  and its root visible while deep trails stay one click away. */
const CRUMB_MAX_BOXES = 4

function crumbBox(c: { href: string; label: string }, isCurrent: boolean, homeLabel: string) {
  const text = escapeHtml(c.href === '/' ? homeLabel : c.label)
  return isCurrent
    ? `<span aria-current="page">${text}</span>`
    : `<a href="${escapeHtml(c.href)}">${text}</a>`
}

/** Crumbs joined by separators; deep trails collapse their middle under an
 *  accessible zero-JS <details> dropdown. */
export function renderCrumbs(trail: { href: string; label: string }[], homeLabel: string): string {
  const sep = '<span class="wn-crumb-sep" aria-hidden="true">/</span>'
  if (trail.length <= CRUMB_MAX_BOXES) {
    return trail.map((c, i) => crumbBox(c, i === trail.length - 1, homeLabel)).join(sep)
  }
  const hidden = trail.slice(1, trail.length - 2)
  const drop =
    `<details class="wn-crumb-more"><summary aria-label="Hidden breadcrumb levels">…</summary>` +
    `<div class="wn-crumb-drop">` +
    hidden
      .map(
        (c) =>
          `<a href="${escapeHtml(c.href)}">${escapeHtml(c.href === '/' ? homeLabel : c.label)}</a>`,
      )
      .join('') +
    `</div></details>`
  const boxes = [
    crumbBox(trail[0]!, false, homeLabel),
    drop,
    crumbBox(trail[trail.length - 2]!, false, homeLabel),
    crumbBox(trail[trail.length - 1]!, true, homeLabel),
  ]
  return boxes.join(sep)
}

export function renderLayout(opts: LayoutOptions): string {
  const siteName = opts.siteName ?? ''
  const title = escapeHtml(composeDocTitle(opts.title, siteName))
  const homeLabel = siteName || 'Home'
  const crumbs = renderCrumbs(opts.trail ?? [], homeLabel)

  // Built-in actions, preceded by the nav page's links. Ordering is deliberate:
  // site content first, chrome last.
  const actions: string[] = (opts.navLinks ?? []).map(
    (l) => `<a class="wn-nav-link" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`,
  )
  if (opts.searchEnabled !== false) {
    actions.push('<a href="/search">Search</a>')
  }
  if (opts.allPagesEnabled !== false) {
    actions.push('<a href="/all">All pages</a>')
  }
  if (opts.user) {
    // Admin chrome is role-gated; the identity/sign-out shows for everyone
    // with a session (viewers included — they read, they don't manage).
    if (opts.user.role === 'admin') {
      actions.push('<a href="/admin">Admin settings</a>')
    }
    actions.push(
      opts.authDisabled
        ? `<span title="dev mode">${escapeHtml(opts.user.name ?? opts.user.sub)}</span>`
        : `<a href="/oidc/logout">Sign out (${escapeHtml(opts.user.name ?? opts.user.sub)})</a>`,
    )
  }
  // No "Log in" affordance on reader chrome by design: sign-in is a known
  // route (/oidc/login?returnTo=…), and login-only mode narrows the rule to
  // reader pages — the login-required 403 document (render/status-page.ts)
  // is the one sanctioned public sign-in link. See docs/api.md.

  // The <details> holds ONLY its summary: the UA hides nothing else, so
  // mobile show/hide of the sibling actions is pure `:has()` CSS.
  const menu =
    actions.length > 0
      ? `<details class="wn-menu"><summary aria-label="Site menu">\u2630</summary></details>`
      : ''
  const nav =
    actions.length > 0
      ? `<nav class="wn-nav" aria-label="Site">${menu}<div class="wn-view-actions">${actions.join(
          ' ',
        )}</div></nav>`
      : ''

  const scripts =
    (opts.searchEnabled !== false ? `<script>${SEARCH_SCRIPT}</script>` : '') +
    (opts.scripts ? `<script>${opts.scripts}</script>` : '')

  // Admin-trusted raw HTML bands, inside <main> around the content.
  const headerBand = opts.headerHtml ? `<div class="wn-site-header">${opts.headerHtml}</div>` : ''
  const footerBand = opts.footerHtml ? `<div class="wn-site-footer">${opts.footerHtml}</div>` : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${iconTagsHtml(opts.faviconMediaId ?? null)}
<style>${EDITOR_TOKENS_CSS}${EDITOR_CONTENT_CSS}${VIEW_CSS}${SITE_BANDS_CSS}</style>
</head>
<body class="wn-view">
<header class="wn-view-bar">
<nav class="wn-crumbs" aria-label="Breadcrumb">${crumbs || `<a href="/">${escapeHtml(homeLabel)}</a>`}</nav>
${nav}
</header>
<main>${headerBand}${opts.body}${footerBand}</main>
${scripts}
</body>
</html>`
}

/** Shared search-form body used by /search landing + index. */
export function searchFormHtml(enabled = true): string {
  if (!enabled) return ''
  return (
    `<form id="wn-search-form" class="wn-search-form" action="/search" method="get">` +
    `<input type="search" name="terms" placeholder="Search pages…" aria-label="Search pages">` +
    `<button type="submit">Search</button>` +
    `</form>`
  )
}
