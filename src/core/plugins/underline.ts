import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { withPunct } from './inline'

import { escapeHTML, escapeAttr } from '../escape'

/**
 * Built-in plugin: <u>underlined</u> text.
 *
 * Only the exact `<u>…</u>` pair is grammar — this is NOT general inline HTML.
 * The body (`[^<]+`) can never contain a tag, and it is escaped on output, so
 * the reader never emits author-controlled markup. Output is a classed span
 * like bold/strikethrough (`.wn-underline`), never a raw `<u>` element.
 */
export const underlinePlugin: ContentPlugin = {
  name: 'underline',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'underline', pattern: /<u>([^<]+)<\/u>/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    const el = withPunct('wn-underline', '<u>', token.groups[0] ?? '', '</u>')
    el.dataset.raw = token.raw // cursor fidelity, as strikethrough
    return el
  },
  renderToHTML(token: Token, _ctx: StaticRenderContext): string {
    const inner = escapeHTML(token.groups[0] ?? '')
    return `<span class="wn-underline" data-raw="${escapeAttr(token.raw)}"><span class="wn-punct">&lt;u&gt;</span>${inner}<span class="wn-punct">&lt;/u&gt;</span></span>`
  },
}
