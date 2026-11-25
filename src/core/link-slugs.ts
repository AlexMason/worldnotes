// ─── Internal-link slug collection ───────────────────────────────────────────
// The reader needs to know which pages a document links to BEFORE rendering
// (existence is resolved with one batched lookup). Collection rides the real
// render: a recording `pageExists` observes exactly the slugs the plugins ask
// about, so nesting (list items, headings, table cells), fence exclusion and
// target folding can never drift from what is actually emitted. DOM-free.

import { renderDocumentHtml } from './static-renderer'
import type { ContentPlugin } from './types'

/** Ceiling per document: bounds the batched lookup (extra slugs render as unknown). */
export const MAX_LINK_SLUGS = 500

/** Distinct internal page slugs linked from `markdown`, in first-seen order. */
export function collectLinkSlugs(
  markdown: string,
  plugins: ContentPlugin[],
  max: number = MAX_LINK_SLUGS,
): string[] {
  const seen = new Set<string>()
  renderDocumentHtml(markdown, plugins, (slug) => {
    if (seen.size < max) seen.add(slug)
    return undefined
  })
  return [...seen]
}
