import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { parseWikiLink } from '../navigation'
import { wikiLinkAddress, wikiTargetToSlug } from '../../shared/slug'
import { wikiLinkClass } from './link-class'
import { escapeHTML, escapeAttr } from '../escape'

/**
 * Built-in plugin: wiki-style page links.
 *
 * Matches [[page name]] or [[page name|display text]] and renders a styled,
 * clickable span.
 * Clicking navigates to the named page, auto-creating it if it doesn't exist.
 *
 * Targets resolve against the page they are written on (`context.linkBase`):
 * `[[beta]]` on `alpha` → `/alpha/beta`; `[[/beta]]` → `/beta` (site root).
 * The resolved ROOT-ABSOLUTE address (`wikiLinkAddress`) is what `data-page`
 * carries and what navigation receives, so every consumer folds it with
 * plain root semantics (navTargetToSlug) without knowing the current page.
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

  render(token: Token, context: EditorContext): HTMLElement {
    const { page, display } = parseWikiLink(token.groups[0] ?? '')
    const address = wikiLinkAddress(page, context.linkBase)

    // data-page carries the root-absolute address — editor-navigation folds
    // it via navTargetToSlug on click, link-existence-sync on re-class.
    const el = document.createElement('span')
    el.className = wikiLinkClass(address, context.pageExists)
    el.dataset.page = address
    el.dataset.raw = token.raw
    el.textContent = display

    return el
  },

  // Static (reader) surface: foldable targets become real anchors so the
  // zero-JS read path can navigate; href safety rides on validateSlug's
  // charset (AGENTS.md slug policy). Non-foldable targets (e.g. `[[中文]]`)
  // stay escaped literal source text — same visible outcome as clicking
  // them in the editor would not resolve.
  renderToHTML(token: Token, context: StaticRenderContext): string {
    const { page, display } = parseWikiLink(token.groups[0] ?? '')
    const address = wikiLinkAddress(page, context.linkBase)
    const slug = wikiTargetToSlug(address)
    if (slug === null) return escapeHTML(token.raw)
    return `<a class="${wikiLinkClass(address, context.pageExists)}" href="/${slug}" data-page="${escapeAttr(address)}" data-raw="${escapeAttr(token.raw)}">${escapeHTML(display)}</a>`
  },

  onNavigate(token: Token, context: EditorContext): true {
    const { page } = parseWikiLink(token.groups[0] ?? '')
    context.navigate(wikiLinkAddress(page, context.linkBase))
    return true // suppress default — we handle it
  },
}
