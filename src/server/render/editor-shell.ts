// ─── Editor SPA shell ────────────────────────────────────────────────────────
// HTML bootstrap for the client editor, now served directly at /{slug} for
// authenticated users (the reader serves anonymous visitors). Embeds the page
// slug, autosave debounce, chrome hints (search/all-pages toggles, identity)
// and the page's markdown + version so the client can build header actions and
// paint the editor synchronously without extra round-trips.

import { escapeHtml } from './layout'
import { iconTagsHtml } from './icons'
import { pwaTagsHtml, SW_REGISTER_SCRIPT } from './pwa'
import { composeDocTitle } from '../../shared/doc-title'
import type { Role } from '../../shared/roles'
import type { EditorShellConfig, NavLink } from '../../shared/dto'

export interface EditorShellOptions {
  /** URL of the client entry script, content-versioned (`clientEntrySrc`). */
  clientScriptSrc: string
  autosaveMs: number
  searchEnabled: boolean
  /** Configured home page slug (breadcrumb trail root); null = 'home'. */
  homeSlug: string | null
  /** Show the "All pages" nav affordance in the editor chrome. */
  allPagesEnabled: boolean
  /** Site branding: tab-title suffix + breadcrumb root label ('' = none). */
  siteName: string
  /** Links extracted from the configured nav page; rendered by the client
   *  into the header actions (mirrors the reader chrome). */
  navLinks?: NavLink[]
  /** Media row overriding the bundled favicon set; null = defaults. */
  faviconMediaId: number | null
  /**
   * Raw admin-trusted HTML bands, embedded in the client config and injected
   * around the editor's content column by the client (mirroring the reader's
   * placement inside `<main>`). The shell itself renders no band DOM.
   */
  headerHtml: string
  footerHtml: string
  /**
   * Admin-authored theme CSS (active or previewed theme), embedded in the
   * client config; the client appends it as `<style id="worldnotes-theme">`
   * right after the default `#worldnotes-styles`. '' = default look.
   */
  themeCss: string
  userName: string | null
  authDisabled: boolean
  /** Session role carried into the client config (chrome gating). */
  userRole: Role
  /**
   * The page's persisted content + version, embedded so the editor can seed
   * its buffer and `If-Match` without a fetch on first paint. Null for pages
   * that do not exist yet (the create-on-save flow then handles them).
   */
  page: { content: string; version: number } | null
  /**
   * Existence of the pages `page.content` links to (slug → exists), embedded
   * so link-state styling is correct on first paint without a round trip.
   */
  linkExists: Record<string, boolean>
  /** The page's title (tab title on first paint). */
  title: string
  /**
   * Stored titles of the page's existing ancestors (and itself), slug →
   * title, so breadcrumb labels are right on first paint.
   */
  titles: Record<string, string>
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
    navLinks: opts.navLinks ?? [],
    headerHtml: opts.headerHtml,
    footerHtml: opts.footerHtml,
    themeCss: opts.themeCss,
    userName: opts.userName,
    authDisabled: opts.authDisabled,
    userRole: opts.userRole,
  }
  const page = {
    slug,
    content: opts.page?.content ?? null,
    version: opts.page?.version ?? null,
    exists: opts.page !== null,
    linkExists: opts.linkExists,
    titles: opts.titles,
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(composeDocTitle(opts.title, opts.siteName))}</title>
${iconTagsHtml(opts.faviconMediaId)}
${pwaTagsHtml()}
<style>
  html, body { height: 100%; margin: 0; }
  #wn-app { height: 100%; height: 100dvh; }
</style>
</head>
<body>
<div id="wn-app"></div>
<script id="wn-config" type="application/json">${embedJson(config, true)}</script>
<script id="wn-page" type="application/json">${embedJson(page)}</script>
<script>${SW_REGISTER_SCRIPT}</script>
<script src="${escapeHtml(opts.clientScriptSrc)}" type="module"></script>
</body>
</html>`
}
