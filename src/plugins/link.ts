import type { ContentPlugin, Token, EditorContext } from '../types'

/**
 * Built-in plugin: [text](url) links.
 * Renders external URLs as anchor tags opening in new tabs.
 * Renders internal wiki page references as styled spans with page navigation.
 */
export const linkPlugin: ContentPlugin = {
  name: 'link',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'link', pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const text = token.groups[0] ?? ''
    const url = token.groups[1] ?? ''
    const isInternal = !url.includes('://') && !url.startsWith('//')

    if (isInternal) {
      // Internal wiki page link — reuses wiki-link styling
      const el = document.createElement('span')
      el.className = 'wn-wiki-link'
      el.dataset.page = url
      el.dataset.raw = token.raw
      el.textContent = text
      return el
    }

    // External link
    const el = document.createElement('a')
    el.className = 'wn-link'
    el.href = url
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
    el.dataset.raw = token.raw
    el.textContent = text
    return el
  },
  onNavigate(token: Token, context: EditorContext): boolean | void {
    const url = token.groups[1] ?? ''
    const isInternal = !url.includes('://') && !url.startsWith('//')
    if (isInternal) {
      context.navigate(url)
      return true // suppress default — we handle navigation
    }
    // External links: let <a> handle click natively (opens in new tab)
    return false
  },
}
