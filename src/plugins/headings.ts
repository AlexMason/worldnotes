import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Render a heading span with dimmed punctuation and styled content.
 */
function renderHeading(
  token: Token,
  punctText: string,
  levelCls: string,
  context: EditorContext,
): HTMLElement {
  const wrapper = document.createElement('span')
  wrapper.className = levelCls

  const punct = document.createElement('span')
  punct.className = 'wn-punct'
  punct.textContent = punctText

  const content = document.createElement('span')
  content.className = `${levelCls}-text`

  const contentText = token.groups[0] ?? ''
  if (context.renderInline) {
    content.appendChild(context.renderInline(contentText))
  } else {
    content.textContent = contentText
  }

  wrapper.appendChild(punct)
  wrapper.appendChild(content)
  return wrapper
}

function renderHeadingHTML(
  token: Token,
  punctText: string,
  levelCls: string,
  context: StaticRenderContext,
): string {
  const contentText = token.groups[0] ?? ''
  const inner = context.renderInline(contentText)
  return `<span class="${levelCls}"><span class="wn-punct">${escapeHTML(punctText)}</span><span class="${levelCls}-text">${inner}</span></span>`
}

/**
 * Built-in plugin: markdown headings (h1, h2, h3).
 *
 * Line-level patterns (anchored with ^) match the whole line.
 * Renders the marker as dimmed punctuation and the text at heading scale.
 */
export const headingsPlugin: ContentPlugin = {
  name: 'headings',
  version: '1.0.0',
  kind: 'content' as const,

  tokens: [
    { type: 'h1', pattern: /^# (.*)$/ },
    { type: 'h2', pattern: /^## (.*)$/ },
    { type: 'h3', pattern: /^### (.*)$/ },
  ],

  render(token: Token, context: EditorContext): HTMLElement {
    switch (token.type) {
      case 'h1':
        return renderHeading(token, '# ', 'wn-h1', context)
      case 'h2':
        return renderHeading(token, '## ', 'wn-h2', context)
      case 'h3':
        return renderHeading(token, '### ', 'wn-h3', context)
      default:
        return renderHeading(token, '', 'wn-h1', context)
    }
  },

  renderToHTML(token: Token, context: StaticRenderContext): string {
    switch (token.type) {
      case 'h1':
        return renderHeadingHTML(token, '# ', 'wn-h1', context)
      case 'h2':
        return renderHeadingHTML(token, '## ', 'wn-h2', context)
      case 'h3':
        return renderHeadingHTML(token, '### ', 'wn-h3', context)
      default:
        return renderHeadingHTML(token, '', 'wn-h1', context)
    }
  },
}
