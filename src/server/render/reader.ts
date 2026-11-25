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
import type { LinkContext } from '../../core/types'
import type { PagesRepository } from '../db/repository'

/** Matches the `PageHtmlDeps.render` seam consumed by the SSR routes. */
export interface ReaderRenderer {
  render(src: string): Promise<string>
}

/** Pure, synchronous seam over the engine: no link state unless supplied. */
export function renderReaderHtml(src: string, links: LinkContext = {}): string {
  return renderDocumentHtml(src, defaultPlugins, links)
}

/**
 * Existence of every page `src` links to: one batched lookup, keyed by slug.
 * Slugs beyond the collection cap are absent from the map = unknown (rendered
 * like an existing page), never falsely "missing". Shared by the reader render
 * and the editor shell's first-paint seed.
 */
export async function resolveLinkExistence(
  pages: Pick<PagesRepository, 'existing'>,
  src: string,
): Promise<Map<string, boolean>> {
  const slugs = collectLinkSlugs(src, defaultPlugins)
  const state = new Map<string, boolean>()
  if (slugs.length === 0) return state
  const found = await pages.existing(slugs)
  for (const slug of slugs) state.set(slug, found.has(slug))
  return state
}

export function createReaderRenderer(pages: Pick<PagesRepository, 'existing'>): ReaderRenderer {
  return {
    async render(src: string): Promise<string> {
      const state = await resolveLinkExistence(pages, src)
      return renderReaderHtml(src, { pageExists: (slug) => state.get(slug) })
    },
  }
}
