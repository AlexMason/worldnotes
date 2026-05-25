import type { Token, ContentPlugin, EditorContext } from './types'
import { scanInline } from './tokenizer'

/**
 * Build a decorated DOM fragment for a single line of tokens.
 * Each token is handed to the plugin that owns its type; unrecognised
 * tokens (including the built-in 'text' type) fall back to a plain TextNode.
 *
 * @param tokens          - Ordered token array for one line
 * @param contentPlugins  - All registered ContentPlugin instances
 * @param context         - Live EditorContext passed through to plugin renderers
 * @returns               - DocumentFragment containing the rendered line nodes
 */
export function renderLine(
  tokens: Token[],
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  activeOffset = -1,
): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const pluginMap = buildPluginMap(contentPlugins)
  let offset = 0

  for (const token of tokens) {
    if (token.type === 'text') {
      fragment.appendChild(document.createTextNode(token.raw))
      offset += token.raw.length
      continue
    }

    const tokenStart = offset
    const tokenEnd = tokenStart + token.raw.length
    offset = tokenEnd

    if (activeOffset >= tokenStart && activeOffset <= tokenEnd) {
      fragment.appendChild(document.createTextNode(token.raw))
      continue
    }

    const plugin = pluginMap.get(token.type)
    if (!plugin) {
      // Unknown token type — render raw text as fallback
      fragment.appendChild(document.createTextNode(token.raw))
      continue
    }

    const node = plugin.render(token, context)

    // If the plugin returned an element and has a navigation handler,
    // attach a mousedown listener (mousedown fires before blur, preserving cursor)
    if (node instanceof HTMLElement && plugin.onNavigate) {
      const handler = plugin.onNavigate.bind(plugin)
      node.addEventListener('mousedown', (e: MouseEvent) => {
        const suppressed = handler(token, context)
        // Only prevent default if the plugin explicitly returns true
        // (suppresses the editor losing focus on click)
        if (suppressed) e.preventDefault()
      })
    }

    fragment.appendChild(node)
  }

  return fragment
}

/**
 * Render a full tokenized document (array of per-line token arrays) into
 * an array of DocumentFragments, one per line. The caller is responsible
 * for joining them with <br> elements or block wrappers.
 *
 * @param lines          - Per-line token arrays from the tokenizer
 * @param contentPlugins - All registered ContentPlugin instances
 * @param context        - Live EditorContext
 * @returns              - Array of DocumentFragments, one per source line
 */
export function renderDocument(
  lines: Token[][],
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  activeOffset = -1,
): DocumentFragment[] {
  let lineStart = 0
  return lines.map((tokens) => {
    const lineLength = tokens.reduce((sum, token) => sum + token.raw.length, 0)
    const lineOffset = activeOffset - lineStart
    const fragment = renderLine(tokens, contentPlugins, context, lineOffset)
    lineStart += lineLength + 1
    return fragment
  })
}

/**
 * Build a Map from token type name → ContentPlugin for O(1) lookup during rendering.
 * Each TokenDef type is mapped to its owning plugin.
 *
 * @param plugins - Registered ContentPlugin instances
 * @returns       - Map<tokenType, ContentPlugin>
 */
function buildPluginMap(plugins: ContentPlugin[]): Map<string, ContentPlugin> {
  const map = new Map<string, ContentPlugin>()
  for (const plugin of plugins) {
    for (const def of plugin.tokens) {
      map.set(def.type, plugin)
    }
  }
  return map
}

/**
 * Tokenize raw text using only inline-level token definitions and render
 * through the corresponding content plugins. This allows line-level plugins
 * (headings, blockquotes) to render inline markdown within their content.
 *
 * @param text            - Raw text to render as inline markdown
 * @param contentPlugins  - All registered ContentPlugin instances
 * @param context         - EditorContext passed through to plugin renderers
 * @returns               - DocumentFragment containing rendered inline nodes
 */
export function renderInlineContent(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
): DocumentFragment {
  const inlineDefs = contentPlugins
    .flatMap((p) => p.tokens)
    .filter((d) => !d.pattern.source.startsWith('^'))

  const tokens = scanInline(text, inlineDefs)
  const pluginMap = buildPluginMap(contentPlugins)
  const fragment = document.createDocumentFragment()

  for (const token of tokens) {
    if (token.type === 'text') {
      fragment.appendChild(document.createTextNode(token.raw))
      continue
    }

    const plugin = pluginMap.get(token.type)
    if (!plugin) {
      fragment.appendChild(document.createTextNode(token.raw))
      continue
    }

    const node = plugin.render(token, context)

    if (node instanceof HTMLElement && plugin.onNavigate) {
      const handler = plugin.onNavigate.bind(plugin)
      node.addEventListener('mousedown', (e: MouseEvent) => {
        const suppressed = handler(token, context)
        if (suppressed) e.preventDefault()
      })
    }

    fragment.appendChild(node)
  }

  return fragment
}
