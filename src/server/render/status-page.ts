// ─── Status documents (404 / 403) ────────────────────────────────────────────
// Shared seam for every HTML status response. Bodies come from the
// designated status pages (settings.notFoundSlug / settings.forbiddenSlug),
// rendered as markdown through the SAME static engine as the reader (raw
// HTML inside a status page is escaped; wiki links / images pass the plugin
// safety rules) and wrapped in the normal site chrome — which means a
// designated status page is a PUBLIC surface by definition, even while
// login-only mode gates everything else (docs + /admin warn about this).
//
// The custom render is cached (key `s:{kind}:{slug}`, invalidated by the same
// page-write hook as articles, bounded by the cache TTL): in login-only mode
// the 403 document is the anonymous default answer for EVERY URL, and
// uncached per-request DB reads + markdown renders on error traffic are an
// unauthenticated amplification vector. Fallbacks are never recursive: a
// dangling slug degrades to the built-in body.

import type { LayoutOptions } from './layout'
import { escapeHtml } from './layout'
import { hashEtag, type RenderCache } from '../cache'
import type { PagesRepository } from '../db/repository'

/** LayoutOptions minus the per-document fields (title/body/trail). */
export type StatusChrome = Omit<LayoutOptions, 'title' | 'body' | 'trail'>

export interface StatusDeps {
  layout: (opts: LayoutOptions) => string
  render: { render(src: string): string }
  pages: PagesRepository
  cache: RenderCache
}

export interface StatusDoc {
  kind: '404' | '403'
  title: string
  /** Built-in body, used when customSlug is unset/dangling. */
  fallbackHtml: string
  chrome: StatusChrome
  /** Breadcrumb; renderLayout's fallback crumbs apply when omitted. */
  trail?: { href: string; label: string }[]
  /** Designated status page slug (null = built-in body only). */
  customSlug: string | null
  /** Extra markup appended AFTER a custom page body (e.g. the sanctioned
   *  sign-in line on the login-gate 403). Never appended to fallbacks —
   *  those already carry what they need. */
  customAppendHtml?: string
}

function wrap(body: string): string {
  return `<div class="wn-status">${body}</div>`
}

export function notFoundBodyHtml(path: string): string {
  return wrap(
    `<h1>Page not found</h1>` + `<p>No page exists at <code>${escapeHtml(path)}</code> yet.</p>`,
  )
}

/** Login-only-mode gate body: the site's one sanctioned public sign-in link. */
export function signInRequiredBodyHtml(returnTo: string): string {
  return wrap(
    `<h1>Sign-in required</h1><p>Reading this site requires an account.</p>${signInLineHtml(returnTo)}`,
  )
}

/** The sign-in affordance itself — appended to CUSTOM gate bodies too, so
 *  the recovery path never depends on the admin remembering to add one. */
export function signInLineHtml(returnTo: string): string {
  return `<p><a href="/oidc/login?returnTo=${encodeURIComponent(returnTo)}">Sign in</a></p>`
}

/** Authenticated-but-insufficient-role body (no sign-in link: signed in). */
export function forbiddenBodyHtml(): string {
  return wrap(`<h1>Forbidden</h1>` + `<p>You do not have permission to view this page.</p>`)
}

/**
 * Resolve the status document HTML: custom page body (cached) when the slug
 * designates an existing page, built-in fallback otherwise. The returned
 * etag mixes the body hash with the revision key so chrome-only changes
 * bust browser revalidation like every other reader response.
 */
export async function statusDocument(deps: StatusDeps, doc: StatusDoc): Promise<string> {
  let bodyHtml = doc.fallbackHtml

  if (doc.customSlug) {
    const key = `s:${doc.kind}:${doc.customSlug}`
    const cached = deps.cache.get<string>(key)
    if (cached) {
      bodyHtml =
        cached.value +
        (doc.customAppendHtml ? `<div class="wn-status">${doc.customAppendHtml}</div>` : '')
    } else {
      const page = await deps.pages.get(doc.customSlug)
      if (page) {
        const rendered = wrap(deps.render.render(page.content))
        deps.cache.set(key, {
          value: rendered,
          etag: hashEtag(rendered),
          storedAt: Date.now(),
        })
        bodyHtml =
          rendered +
          (doc.customAppendHtml ? `<div class="wn-status">${doc.customAppendHtml}</div>` : '')
      }
    }
  }

  return deps.layout({
    title: doc.title,
    body: bodyHtml,
    ...(doc.trail ? { trail: doc.trail } : {}),
    ...doc.chrome,
  })
}
