// ─── Editor SPA shell ────────────────────────────────────────────────────────
// HTML bootstrap for the client editor, now served directly at /{slug} for
// authenticated users (the reader serves anonymous visitors). Embeds the page
// slug, autosave debounce, chrome hints (search/all-pages toggles, identity)
// and the page's markdown + version so the client can build header actions and
// paint the editor synchronously without extra round-trips.

import { escapeHtml } from './layout'
import { composeDocTitle } from '../../shared/doc-title'
import type { EditorShellConfig } from '../../shared/dto'
import { slugDisplayName } from '../../shared/slug'

export interface EditorShellOptions {
  /** Absolute prefix the client bundle is served under, e.g. '/assets'. */
  assetPrefix: string
  autosaveMs: number
  searchEnabled: boolean
  /** Configured home page slug (breadcrumb trail root); null = 'home'. */
  homeSlug: string | null
  /** Show the "All pages" nav affordance in the editor chrome. */
  allPagesEnabled: boolean
  /** Site branding: tab-title suffix + breadcrumb root label ('' = none). */
  siteName: string
  /**
   * Raw admin-trusted HTML bands, embedded in the client config and injected
   * around the editor's content column by the client (mirroring the reader's
   * placement inside `<main>`). The shell itself renders no band DOM.
   */
  headerHtml: string
  footerHtml: string
  userName: string | null
  authDisabled: boolean
  /**
   * The page's persisted content + version, embedded so the editor can seed
   * its buffer and `If-Match` without a fetch on first paint. Null for pages
   * that do not exist yet (the create-on-save flow then handles them).
   */
  page: { content: string; version: number } | null
}

/**
 * Serialize `value` for safe inlining inside a `<script type="application/json">`.
 * Angle brackets are rewritten to their unicode-escape form so page/user
 * content containing `</script>` can never break out of the element or inject
 * markup (JSON.parse reverses the escape when the client reads it back).
 */
function embedJson(value: unknown, doubleEncode = false): string {
  const json = doubleEncode ? JSON.stringify(JSON.stringify(value)) : JSON.stringify(value)
  return json.replace(/</g, '\\u003c')
}

export function editorShellHtml(slug: string, opts: EditorShellOptions): string {
  const config: EditorShellConfig = {
    slug,
    autosaveMs: opts.autosaveMs,
    searchEnabled: opts.searchEnabled,
    allPagesEnabled: opts.allPagesEnabled,
    homeSlug: opts.homeSlug,
    siteName: opts.siteName,
    headerHtml: opts.headerHtml,
    footerHtml: opts.footerHtml,
    userName: opts.userName,
    authDisabled: opts.authDisabled,
  }
  const page = opts.page
    ? { slug, content: opts.page.content, version: opts.page.version, exists: true }
    : { slug, content: null, version: null, exists: false }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(composeDocTitle(slugDisplayName(slug), opts.siteName))}</title>
<link rel="icon" href="data:,">
<style>
  html, body { height: 100%; margin: 0; }
  #wn-app { height: 100%; height: 100dvh; }
</style>
</head>
<body>
<div id="wn-app"></div>
<script id="wn-config" type="application/json">${embedJson(config, true)}</script>
<script id="wn-page" type="application/json">${embedJson(page)}</script>
<script src="${escapeHtml(opts.assetPrefix)}/client.js" type="module"></script>
</body>
</html>`
}
