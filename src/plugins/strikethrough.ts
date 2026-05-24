import type { ContentPlugin, Token, EditorContext } from '../types'
import { withPunct } from './inline'

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
}
