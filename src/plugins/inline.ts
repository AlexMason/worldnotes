import type { ContentPlugin, Token, EditorContext } from '../types'

/**
 * Helper: wrap inner text with dimmed punctuation markers on either side.
 *
 * @param cls    - CSS class for the outer wrapper span
 * @param marker - The punctuation character(s) to show on each side
 * @param inner  - The text content between the markers
 */
export function withPunct(cls: string, marker: string, inner: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = cls

  const p = (t: string) => {
    const s = document.createElement('span')
    s.className = 'wn-punct'
    s.textContent = t
    return s
  }

  wrap.appendChild(p(marker))
  wrap.appendChild(document.createTextNode(inner))
  wrap.appendChild(p(marker))
  return wrap
}

/**
 * Built-in plugin: **bold** text.
 * Renders the ** markers as dimmed punctuation flanking styled bold text.
 */
export const boldPlugin: ContentPlugin = {
  name: 'bold',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'bold', pattern: /\*\*([^*]+)\*\*/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    return withPunct('wn-bold', '**', token.groups[0] ?? '')
  },
}

/**
 * Built-in plugin: *italic* text.
 * Renders the * markers as dimmed punctuation flanking styled italic text.
 */
export const italicPlugin: ContentPlugin = {
  name: 'italic',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'italic', pattern: /\*([^*]+)\*/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    return withPunct('wn-italic', '*', token.groups[0] ?? '')
  },
}

/**
 * Built-in plugin: `inline code` spans.
 * Renders backticks as dimmed punctuation flanking a styled code span.
 */
export const inlineCodePlugin: ContentPlugin = {
  name: 'inline-code',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'inline-code', pattern: /`([^`]+)`/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'wn-inline-code'

    const p = (t: string) => {
      const s = document.createElement('span')
      s.className = 'wn-punct'
      s.textContent = t
      return s
    }

    wrap.appendChild(p('`'))
    const code = document.createElement('span')
    code.className = 'wn-code-text'
    code.textContent = token.groups[0] ?? ''
    wrap.appendChild(code)
    wrap.appendChild(p('`'))
    return wrap
  },
}

/**
 * Built-in plugin: > blockquote lines.
 * Line-level (anchored) — matches the whole line and renders it as a quote block.
 */
export const blockquotePlugin: ContentPlugin = {
  name: 'blockquote',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'blockquote', pattern: /^(> )(.*)$/ }],
  render(token: Token, context: EditorContext): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'wn-blockquote'

    const punct = document.createElement('span')
    punct.className = 'wn-punct'
    punct.textContent = '> '

    const content = document.createElement('span')
    content.className = 'wn-blockquote-text'

    const contentText = token.groups[1] ?? ''
    if (context.renderInline) {
      content.appendChild(context.renderInline(contentText))
    } else {
      content.textContent = contentText
    }

    wrap.appendChild(punct)
    wrap.appendChild(content)
    return wrap
  },
}

/**
 * Built-in plugin: --- horizontal rules.
 * Line-level — matches --- (or more dashes) on its own line.
 */
export const hrPlugin: ContentPlugin = {
  name: 'hr',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'hr', pattern: /^---+$/ }],
  render(_token: Token, _ctx: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.className = 'wn-hr'
    el.textContent = '---'
    return el
  },
}
