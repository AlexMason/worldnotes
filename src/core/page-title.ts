// ─── Page title ──────────────────────────────────────────────────────────────
// One rule for every surface (stored title, reader + editor tab titles and
// breadcrumbs): a page is named by its first H1, else by its humanized slug.
// Runs over the block pass, so a `# x` line inside a code fence is not a
// title. DOM-free (the server derives stored titles with it).

import type { ContentPlugin, DocModel } from './types'
import { buildDocument } from './document'
import { defaultPlugins } from './plugins/defaults'
import { slugDisplayName } from '../shared/slug'

/** Trimmed text of the first non-empty H1 line in `doc`, or null. */
export function titleFromDoc(doc: DocModel): string | null {
  for (const tokens of doc.lines) {
    const only = tokens.length === 1 ? tokens[0] : undefined
    if (only?.type !== 'h1') continue
    const text = (only.groups[0] ?? '').trim()
    if (text) return text
  }
  return null
}

/** The title of page `slug` holding `content`: first H1, else the slug's label. */
export function pageTitle(
  content: string,
  slug: string,
  plugins: ContentPlugin[] = defaultPlugins,
): string {
  return titleFromDoc(buildDocument(content, plugins)) ?? slugDisplayName(slug)
}
