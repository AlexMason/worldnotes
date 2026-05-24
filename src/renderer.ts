import type { Token, Plugin, EditorContext } from './types'

/**
 * Build a decorated DOM fragment for a single line of tokens.
 * Each token is handed to the plugin that owns its type; unrecognised
 * tokens (including the built-in 'text' type) fall back to a plain TextNode.
 *
 * @param tokens   - Ordered token array for one line
 * @param plugins  - All registered Plugin instances
 * @param context  - Live EditorContext passed through to plugin renderers
 * @returns        - DocumentFragment containing the rendered line nodes
 */
export function renderLine(
  tokens: Token[],
  plugins: Plugin[],
  context: EditorContext,
  activeOffset = -1,
): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const pluginMap = buildPluginMap(plugins)
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
 * @param lines   - Per-line token arrays from the tokenizer
 * @param plugins - All registered Plugin instances
 * @param context - Live EditorContext
 * @returns       - Array of DocumentFragments, one per source line
 */
export function renderDocument(
  lines: Token[][],
  plugins: Plugin[],
  context: EditorContext,
  activeOffset = -1,
): DocumentFragment[] {
  let lineStart = 0
  return lines.map((tokens) => {
    const lineLength = tokens.reduce((sum, token) => sum + token.raw.length, 0)
    const lineOffset = activeOffset - lineStart
    const fragment = renderLine(tokens, plugins, context, lineOffset)
    lineStart += lineLength + 1
    return fragment
  })
}

/**
 * Build a Map from token type name → Plugin for O(1) lookup during rendering.
 * Each TokenDef type is mapped to its owning plugin.
 *
 * @param plugins - Registered Plugin instances
 * @returns       - Map<tokenType, Plugin>
 */
function buildPluginMap(plugins: Plugin[]): Map<string, Plugin> {
  const map = new Map<string, Plugin>()
  for (const plugin of plugins) {
    for (const def of plugin.tokens) {
      map.set(def.type, plugin)
    }
  }
  return map
}
