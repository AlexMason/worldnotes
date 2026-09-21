// ─── Status documents (404 / 403) ────────────────────────────────────────────
// Shared seam for every HTML status response: the built-in bodies live here
// (Phase A); custom wiki-page bodies (settings.notFoundSlug /
// settings.forbiddenSlug) replace the inner body via `bodyHtml` in Phase B.
// Documents compose through renderLayout, so they inherit the site chrome —
// including the raw admin header/footer bands — exactly like normal pages.

import type { LayoutOptions } from './layout'
import { escapeHtml } from './layout'

/** LayoutOptions minus the per-document fields (title/body/trail). */
export type StatusChrome = Omit<LayoutOptions, 'title' | 'body' | 'trail'>

export interface StatusDocument {
  title: string
  bodyHtml: string
  /** Breadcrumb; renderLayout's fallback crumb applies when omitted. */
  trail?: { href: string; label: string }[]
}

export function renderStatusDocument(
  layout: (opts: LayoutOptions) => string,
  chrome: StatusChrome,
  doc: StatusDocument,
): string {
  return layout({
    title: doc.title,
    body: doc.bodyHtml,
    ...(doc.trail ? { trail: doc.trail } : {}),
    ...chrome,
  })
}

/** Built-in 404 body for a missing page (anonymous readers). */
export function notFoundBodyHtml(path: string): string {
  return (
    `<div class="wn-status"><h1>Page not found</h1>` +
    `<p>No page exists at <code>${escapeHtml(path)}</code> yet.</p></div>`
  )
}

/** Login-only-mode gate body: the site's one sanctioned public sign-in link. */
export function signInRequiredBodyHtml(returnTo: string): string {
  return (
    `<div class="wn-status"><h1>Sign-in required</h1>` +
    `<p>Reading this site requires an account.</p>` +
    `<p><a href="/oidc/login?returnTo=${encodeURIComponent(returnTo)}">Sign in</a></p></div>`
  )
}

/** Authenticated-but-insufficient-role body (no sign-in link: signed in). */
export function forbiddenBodyHtml(): string {
  return (
    `<div class="wn-status"><h1>Forbidden</h1>` +
    `<p>You do not have permission to view this page.</p></div>`
  )
}
