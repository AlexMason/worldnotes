// ─── Title extraction ────────────────────────────────────────────────────────
// Derives a page title from the first ATX heading via the DOM-free core
// tokenizer. (Deliberately NOT the HTML renderer — headings render with
// literal '#' markers in edit-preview mode.)

import { tokenizeLine } from '../../core/tokenizer'
import { headingsPlugin } from '../../core/plugins/headings'
import { slugDisplayName } from '../../shared/slug'

const HEADING_DEFS = headingsPlugin.tokens

/**
 * @returns trimmed text of the first `#`-heading, or `fallback` when the
 * document has no heading.
 */
export function extractTitle(markdown: string, fallback: string): string {
  for (const line of markdown.split('\n')) {
    const tokens = tokenizeLine(line.trimEnd(), HEADING_DEFS)
    if (tokens.length === 1 && tokens[0] && /^h[1-3]$/.test(tokens[0].type)) {
      const text = (tokens[0].groups[0] ?? '').trim()
      if (text) return text
    }
  }
  return fallback
}

export function titleForNewPage(slug: string): string {
  return slugDisplayName(slug)
}
