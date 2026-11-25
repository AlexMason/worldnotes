// ─── Reader renderer — SSR seam into the single engine ───────────────────────
// The read path renders with the ONE markdown engine (src/core): the same
// tokenizer + content-plugin `renderToHTML` grammar that drives the editor's
// interactive DOM. Import `static-renderer` directly — never the core barrel,
// which pulls the editor DOM into the SSR module graph (node-smoke guards it).
// Safety (scheme-gated hrefs, quote-safe attributes) lives inside the plugins.
//
// Link state: internal links to pages that do not exist are marked
// (`wn-link-missing`). Existence is resolved BEFORE rendering — the document's
// link slugs are collected, answered by one batched repository lookup, and
// handed to the (synchronous) engine as a `pageExists` function.

import { renderDocumentHtml } from '../../core/static-renderer'
import { collectLinkSlugs } from '../../core/link-slugs'
import { defaultPlugins } from '../../core/plugins/defaults'
import type { PageExists } from '../../core/plugins/link-class'
import type { PagesRepository } from '../db/repository'

/** Matches the `PageHtmlDeps.render` seam consumed by the SSR routes. */
export interface ReaderRenderer {
  render(src: string): Promise<string>
}

/** Pure, synchronous seam over the engine: no existence data unless supplied. */
export function renderReaderHtml(src: string, pageExists?: PageExists): string {
  return renderDocumentHtml(src, defaultPlugins, pageExists)
}

export function createReaderRenderer(pages: Pick<PagesRepository, 'existing'>): ReaderRenderer {
  return {
    async render(src: string): Promise<string> {
      const slugs = collectLinkSlugs(src, defaultPlugins)
      if (slugs.length === 0) return renderReaderHtml(src)
      const found = await pages.existing(slugs)
      const asked = new Set(slugs)
      // Slugs beyond the collection cap were never asked about → unknown
      // (rendered like an existing page), never falsely "missing".
      return renderReaderHtml(src, (slug) => (asked.has(slug) ? found.has(slug) : undefined))
    },
  }
}
