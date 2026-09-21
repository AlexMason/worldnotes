import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { parseWikiLink } from '../navigation'
import { wikiTargetToSlug } from '../../shared/slug'
import { escapeHTML, escapeAttr } from '../escape'

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
export const wikiLinkPlugin: ContentPlugin = {
  name: 'wiki-link',
  version: '1.0.0',
  kind: 'content' as const,

  tokens: [
    {
      type: 'wiki-link',
      // Matches [[any content]] — non-greedy to handle multiple links per line
      pattern: /\[\[([^\]]+)\]\]/,
    },
  ],

  render(token: Token, _context: EditorContext): HTMLElement {
    const { page, display } = parseWikiLink(token.groups[0] ?? '')

    // data-page carries the RAW author target (display metadata, not a page
    // key) — editor-navigation folds it via navTargetToSlug on click.
    const el = document.createElement('span')
    el.className = 'wn-wiki-link'
    el.dataset.page = page
    el.dataset.raw = token.raw
    el.textContent = display

    return el
  },

  // Static (reader) surface: foldable targets become real anchors so the
  // zero-JS read path can navigate; href safety rides on validateSlug's
  // charset (AGENTS.md slug policy). Non-foldable targets (e.g. `[[中文]]`)
  // stay escaped literal source text — same visible outcome as clicking
  // them in the editor would not resolve.
  renderToHTML(token: Token, _context: StaticRenderContext): string {
    const { page, display } = parseWikiLink(token.groups[0] ?? '')
    const slug = wikiTargetToSlug(page)
    if (slug === null) return escapeHTML(token.raw)
    return `<a class="wn-wiki-link" href="/${slug}" data-page="${escapeAttr(page)}" data-raw="${escapeAttr(token.raw)}">${escapeHTML(display)}</a>`
  },

  onNavigate(token: Token, context: EditorContext): true {
    const { page } = parseWikiLink(token.groups[0] ?? '')
    context.navigate(page)
    return true // suppress default — we handle it
  },
}
