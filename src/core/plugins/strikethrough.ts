import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { withPunct } from './inline'

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Built-in plugin: ~~strikethrough~~ text.
 * Renders the ~~ markers as dimmed punctuation flanking crossed-out text.
 */
export const strikethroughPlugin: ContentPlugin = {
  name: 'strikethrough',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'strikethrough', pattern: /~~([^~]+)~~/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    const el = withPunct('wn-strikethrough', '~~', token.groups[0] ?? '')
    el.dataset.raw = token.raw // FORMAT-03: cursor fidelity (Pitfall 4)
    return el
  },
  renderToHTML(token: Token, _ctx: StaticRenderContext): string {
    const inner = escapeHTML(token.groups[0] ?? '')
    return `<span class="wn-strikethrough" data-raw="${escapeAttr(token.raw)}"><span class="wn-punct">~~</span>${inner}<span class="wn-punct">~~</span></span>`
  },
}
