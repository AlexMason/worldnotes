import type { ContentPlugin, Token, EditorContext } from '../types'

/**
 * Render a heading span with dimmed punctuation and styled content.
 *
 * @param token     - The matched heading token
 * @param punctText - The heading marker (e.g. '# ', '## ')
 * @param levelCls  - CSS class for the heading level (e.g. 'wn-h1')
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

/**
 * Built-in plugin: markdown headings (h1, h2, h3).
 *
 * Line-level patterns (anchored with ^) match the whole line.
 * Renders the marker as dimmed punctuation and the text at heading scale.
 *
 * Renders:
 *   # Title  → <span class="wn-h1"><span class="wn-punct"># </span><span>Title</span></span>
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
}
