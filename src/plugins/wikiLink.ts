import type { Plugin, Token, EditorContext } from '../types'
import { parseWikiLink } from '../navigation'

/**
 * Built-in plugin: wiki-style page links.
 *
 * Matches [[page name]] or [[page name|display text]] and renders a styled,
 * clickable span.
 * Clicking navigates to the named page, auto-creating it if it doesn't exist.
 *
 * Renders:
 *   [[projects/acme]] → <span class="wn-wiki-link">acme</span>
 *   [[projects/acme|Client Portal]] → <span class="wn-wiki-link">Client Portal</span>
 */
export const wikiLinkPlugin: Plugin = {
  name: 'wiki-link',

  tokens: [
    {
      type: 'wiki-link',
      // Matches [[any content]] — non-greedy to handle multiple links per line
      pattern: /\[\[([^\]]+)\]\]/,
    },
  ],

  render(token: Token, _context: EditorContext): HTMLElement {
    const { page, display } = parseWikiLink(token.groups[0] ?? '')

    const el = document.createElement('span')
    el.className = 'wn-wiki-link'
    el.dataset.page = page
    el.dataset.raw = token.raw
    el.textContent = display

    return el
  },

  onNavigate(token: Token, context: EditorContext): true {
    const { page } = parseWikiLink(token.groups[0] ?? '')
    context.navigate(page)
    return true // suppress default — we handle it
  },
}
