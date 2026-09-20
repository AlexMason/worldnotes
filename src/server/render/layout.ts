// ─── Viewer document layout ──────────────────────────────────────────────────
// Dependency-free HTML shell for the anonymous read path. The article body is
// the single-engine render (core static renderer), so the page embeds the
// editor's own token + content stylesheets (src/core/styles.ts) — the reader
// is the editor, read-only. VIEW_CSS below is chrome only (bar, crumbs,
// index/search/admin); it must not restyle anything the editor classes own.

import type { SessionUser } from '../auth/session'
import { EDITOR_TOKENS_CSS, EDITOR_CONTENT_CSS, SITE_BANDS_CSS } from '../../core/styles'
import { composeDocTitle } from '../../shared/doc-title'

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
  font: 14px/1.4 system-ui, sans-serif; }
nav.wn-crumbs a { color: var(--wn-muted); text-decoration: none; }
nav.wn-crumbs a:hover { color: var(--wn-accent); }
nav.wn-crumbs span[aria-current] { color: var(--wn-fg); }
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
.wn-create-btn { display: inline-block; text-decoration: none; font: inherit;
  padding: .4em 1.1em; border-radius: 6px;
  border: 1px solid var(--wn-accent); background: transparent; color: var(--wn-accent);
  cursor: pointer; }
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
.wn-view-actions { display: flex; gap: .8rem; align-items: center; }
.wn-view-actions a { color: var(--wn-muted); text-decoration: none; }

@media (max-width: 640px) {
  header.wn-view-bar { flex-wrap: wrap; row-gap: .4rem; padding: .5rem .9rem; }
  nav.wn-crumbs { flex: 1 1 100%; order: 2; overflow-x: auto; }
  .wn-view-actions { margin-left: auto; }
  .wn-view-actions a { padding: .45em .35em; }
  main { padding: 1.2rem .9rem 4rem; }
  .wn-article { overflow-wrap: break-word; }
  ul.wn-page-list a { display: inline-block; padding: .35em 0; }
  .wn-search-form { flex-wrap: wrap; }
  .wn-search-form input { flex: 1 1 100%; }
  .wn-search-form input, .wn-search-form button, .wn-create-btn {
    min-height: 44px; /* comfortable touch targets */ }
}
`.trim()

export interface LayoutOptions {
  title: string
  body: string
  trail?: { href: string; label: string }[]
  status?: number
  user?: SessionUser | null
  authDisabled?: boolean
  /** Show search affordances; defaults to true. */
  searchEnabled?: boolean
  /** Show the "All pages" affordance; defaults to true. */
  allPagesEnabled?: boolean
  /** Extra inline scripts appended after the built-in ones. */
  scripts?: string
  /** Site branding: tab-title suffix + breadcrumb home label ('' = none). */
  siteName?: string
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

export function renderLayout(opts: LayoutOptions): string {
  const siteName = opts.siteName ?? ''
  const title = escapeHtml(composeDocTitle(opts.title, siteName))
  const homeLabel = siteName || 'Home'
  const crumbs = (opts.trail ?? [])
    .map((c, i, arr) =>
      i === arr.length - 1
        ? `<span aria-current="page">${escapeHtml(c.href === '/' ? homeLabel : c.label)}</span>`
        : `<a href="${escapeHtml(c.href)}">${escapeHtml(c.href === '/' ? homeLabel : c.label)}</a>`,
    )
    .join('<span aria-hidden="true"> / </span>')

  const actions: string[] = []
  if (opts.searchEnabled !== false) {
    actions.push('<a href="/search">Search</a>')
  }
  if (opts.allPagesEnabled !== false) {
    actions.push('<a href="/all">All pages</a>')
  }
  if (opts.user) {
    actions.push('<a href="/admin">Admin settings</a>')
    actions.push(
      opts.authDisabled
        ? `<span title="dev mode">${escapeHtml(opts.user.name ?? opts.user.sub)}</span>`
        : `<a href="/oidc/logout">Sign out (${escapeHtml(opts.user.name ?? opts.user.sub)})</a>`,
    )
  } else {
    actions.push('<a href="/oidc/login">Log in</a>')
  }

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
<link rel="icon" href="data:,">
<style>${EDITOR_TOKENS_CSS}${EDITOR_CONTENT_CSS}${VIEW_CSS}${SITE_BANDS_CSS}</style>
</head>
<body class="wn-view">
<header class="wn-view-bar">
<nav class="wn-crumbs" aria-label="Breadcrumb">${crumbs || `<a href="/">${escapeHtml(homeLabel)}</a>`}</nav>
<div class="wn-view-actions">${actions.join(' ')}</div>
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
