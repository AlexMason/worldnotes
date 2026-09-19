// ─── Reader renderer — SSR seam into the single engine ───────────────────────
// The read path renders with the ONE markdown engine (src/core): the same
// tokenizer + content-plugin `renderToHTML` grammar that drives the editor's
// interactive DOM. Import `static-renderer` directly — never the core barrel,
// which pulls the editor DOM into the SSR module graph (node-smoke guards it).
// Safety (scheme-gated hrefs, quote-safe attributes) lives inside the plugins.

import { renderDocumentHtml } from '../../core/static-renderer'
import { defaultPlugins } from '../../core/plugins/defaults'

/** Matches the `PageHtmlDeps.render` seam consumed by the SSR routes. */
export function createReaderRenderer(): { render(src: string): string } {
  return { render: (src: string) => renderDocumentHtml(src, defaultPlugins) }
}
