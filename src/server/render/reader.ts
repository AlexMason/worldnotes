// ─── Reader renderer — SSR seam into the single engine ───────────────────────
// The read path renders with the ONE markdown engine (src/core): the same
// tokenizer + content-plugin `renderToHTML` grammar that drives the editor's
// interactive DOM. Import `static-renderer` directly — never the core barrel,
// which pulls the editor DOM into the SSR module graph (node-smoke guards it).
// Safety (scheme-gated hrefs, quote-safe attributes) lives inside the plugins.
//
// Link resolution: relative wiki links (`[[beta]]`) resolve under the page
// being rendered, except on the configured home page (served at `/`), whose
// relative links resolve from the root — `wikiLinkBase`. Callers pass the
// PAGE SLUG; this module owns the base rule so no caller can disagree.
//
// Link state: internal links to pages that do not exist are marked
// (`wn-link-missing`). Existence is resolved BEFORE rendering — the document's
// link slugs are collected, answered by one batched repository lookup, and
// handed to the (synchronous) engine as a `pageExists` function.

import { renderDocumentHtml } from '../../core/static-renderer'
import { collectLinkSlugs } from '../../core/link-slugs'
import { defaultPlugins } from '../../core/plugins/defaults'
import type { LinkContext } from '../../core/types'
import { wikiLinkBase } from '../../shared/slug'
import type { PagesRepository } from '../db/repository'

/** The reader seam: article/status renders and the editor shell's link seed. */
export interface ReaderRenderer {
  /** Reader HTML for `src`, the content of page `pageSlug`. */
  render(src: string, pageSlug: string): Promise<string>
  /**
   * Existence of every page `src` (content of `pageSlug`) links to, keyed by
   * resolved slug: one batched lookup. Slugs beyond the collection cap are
   * absent from the map = unknown (rendered like an existing page), never
   * falsely "missing". Seeds the editor shell's first paint.
   */
  linkExistence(src: string, pageSlug: string): Promise<Map<string, boolean>>
}

/** Pure, synchronous seam over the engine: no link state unless supplied. */
export function renderReaderHtml(src: string, links: LinkContext = {}): string {
  return renderDocumentHtml(src, defaultPlugins, links)
}

export function createReaderRenderer(
  pages: Pick<PagesRepository, 'existing'>,
  getHomeSlug: () => string | null,
): ReaderRenderer {
  async function existence(src: string, linkBase: string | null): Promise<Map<string, boolean>> {
    const slugs = collectLinkSlugs(src, defaultPlugins, { linkBase })
    const state = new Map<string, boolean>()
    if (slugs.length === 0) return state
    const found = await pages.existing(slugs)
    for (const slug of slugs) state.set(slug, found.has(slug))
    return state
  }

  return {
    async render(src, pageSlug) {
      // One base for both passes: a concurrent home change cannot make the
      // collected slugs and the rendered links disagree.
      const linkBase = wikiLinkBase(pageSlug, getHomeSlug())
      const state = await existence(src, linkBase)
      return renderReaderHtml(src, { linkBase, pageExists: (slug) => state.get(slug) })
    },
    linkExistence(src, pageSlug) {
      return existence(src, wikiLinkBase(pageSlug, getHomeSlug()))
    },
  }
}
