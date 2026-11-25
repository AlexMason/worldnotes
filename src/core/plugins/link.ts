import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { isSafeHref, classifyLinkTarget } from '../../shared/url-policy'
import { wikiTargetToSlug } from '../../shared/slug'
import { wikiLinkClass } from './link-class'
import { escapeHTML, escapeAttr } from '../escape'

function isHttpish(url: string): boolean {
  return /^https?:/i.test(url)
}

/**
 * Built-in plugin: [text](url) links.
 *
 * Static output (reader surface) is an allowlist-driven anchor table:
 *   external + isSafeHref → <a href …> (target=_blank + nofollow for http/s)
 *   external + unsafe     → escaped literal source, no anchor
 *   #frag / ?query        → plain relative anchor
 *   internal + foldable   → <a class="wn-wiki-link" href="/{slug}">
 *   internal + unfoldable → escaped literal source
 *
 * The interactive DOM path keeps spans + onNavigate for internal targets
 * (clicks are intercepted before they could navigate the editor away);
 * external hrefs are gated by the same policy as defense-in-depth.
 */
export const linkPlugin: ContentPlugin = {
  name: 'link',
  version: '1.0.0',
  kind: 'content',

  tokens: [{ type: 'link', pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],

  render(token: Token, context: EditorContext): HTMLElement | Text {
    const text = token.groups[0] ?? ''
    const url = token.groups[1] ?? ''
    const kind = classifyLinkTarget(url)

    if (kind === 'internal') {
      // Internal wiki page link — reuses wiki-link styling.
      // NOTE: data-page carries the RAW author target (e.g. '/Blog/Post');
      // it is display metadata, not a page key — navigation folds it via
      // navTargetToSlug in editor-navigation before anything is keyed.
      const el = document.createElement('span')
      el.className = wikiLinkClass(url, context.pageExists)
      el.dataset.page = url
      el.dataset.raw = token.raw
      el.textContent = text
      return el
    }

    if (kind === 'external' && !isSafeHref(url)) {
      // Defense-in-depth on the edit surface: never mint an unsafe href.
      return document.createTextNode(token.raw)
    }

    // External / same-doc link
    const el = document.createElement('a')
    el.className = 'wn-link'
    el.href = url
    if (kind === 'external' && isHttpish(url)) {
      el.target = '_blank'
      el.rel = 'noopener noreferrer nofollow'
    } else if (kind === 'external') {
      el.rel = 'noopener noreferrer'
    }
    el.dataset.raw = token.raw
    el.textContent = text
    return el
  },

  renderToHTML(token: Token, context: StaticRenderContext): string {
    const text = token.groups[0] ?? ''
    const url = token.groups[1] ?? ''
    const label = escapeHTML(text)

    switch (classifyLinkTarget(url)) {
      case 'external': {
        if (!isSafeHref(url)) return escapeHTML(token.raw) // javascript:, data:, //host, …
        if (isHttpish(url)) {
          return `<a class="wn-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow" data-raw="${escapeAttr(token.raw)}">${label}</a>`
        }
        // mailto: etc. — no new-tab, no nofollow
        return `<a class="wn-link" href="${escapeAttr(url)}" rel="noopener noreferrer" data-raw="${escapeAttr(token.raw)}">${label}</a>`
      }
      case 'same-doc': {
        return `<a class="wn-link" href="${escapeAttr(url)}" data-raw="${escapeAttr(token.raw)}">${label}</a>`
      }
      case 'internal': {
        const slug = wikiTargetToSlug(url)
        if (slug === null) return escapeHTML(token.raw)
        return `<a class="${wikiLinkClass(url, context.pageExists)}" href="/${slug}" data-page="${escapeAttr(url)}" data-raw="${escapeAttr(token.raw)}">${label}</a>`
      }
    }
  },

  onNavigate(token: Token, context: EditorContext): boolean | void {
    const url = token.groups[1] ?? ''
    if (classifyLinkTarget(url) !== 'internal') return false
    context.navigate(url)
    return true // suppress default — we handle navigation
  },
}
