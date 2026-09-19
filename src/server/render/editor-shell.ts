// ─── Editor SPA shell ────────────────────────────────────────────────────────
// HTML bootstrap for the client editor, now served directly at /{slug} for
// authenticated users (the reader serves anonymous visitors). Embeds the page
// slug, autosave debounce, and chrome hints (search toggle, identity) so the
// client can build header actions without extra round-trips.

import { escapeHtml } from './layout'
import { slugDisplayName } from '../../shared/slug'

export interface EditorShellOptions {
  /** Absolute prefix the client bundle is served under, e.g. '/assets'. */
  assetPrefix: string
  autosaveMs: number
  searchEnabled: boolean
  userName: string | null
  authDisabled: boolean
}

export function editorShellHtml(slug: string, opts: EditorShellOptions): string {
  const config = {
    slug,
    autosaveMs: opts.autosaveMs,
    searchEnabled: opts.searchEnabled,
    userName: opts.userName,
    authDisabled: opts.authDisabled,
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(slugDisplayName(slug))}</title>
<link rel="icon" href="data:,">
<style>
  html, body { height: 100%; margin: 0; }
  #wn-app { height: 100%; height: 100dvh; }
</style>
</head>
<body>
<div id="wn-app"></div>
<script id="wn-config" type="application/json">${JSON.stringify(JSON.stringify(config))}</script>
<script src="${escapeHtml(opts.assetPrefix)}/client.js" type="module"></script>
</body>
</html>`
}
