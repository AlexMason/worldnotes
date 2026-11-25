// ─── Link source rewriting for page moves ────────────────────────────────────
// When pages move, every internal link that pointed at a moved page is
// rewritten IN THE MARKDOWN SOURCE. Like link-slugs.ts, this rides the ONE
// engine instead of re-parsing link syntax:
//
//   • buildDocument resolves block regions first, so fence lines stay one
//     verbatim text token and are never touched;
//   • link grammar lives only in the plugins' `rewriteLink` hooks;
//   • container plugins (headings, emphasis, list items, table cells) are not
//     special-cased: their `renderToHTML` is run with a recording
//     `renderInline`, which reveals exactly which inner text the engine
//     treats as inline markdown (code spans never call it). Rewritten inner
//     text is spliced back into the token raw.
//
// Fail-safe, never fail lost: when an inner text cannot be located in its
// token raw, that token is kept byte-exact. Token raws rebuild their source
// line byte-exact (document.ts fidelity contract), so a document without
// moved links comes back unchanged.
//
// DOM-free BY CONSTRUCTION (server imports it; guarded by node-smoke).

import type { ContentPlugin, LinkRewriteContext, Token, TokenDef } from './types'
import { buildDocument } from './document'
import { scanInline } from './tokenizer'
import { buildPluginMap } from './plugin-map'

/**
 * `markdown` with every internal link to a moved page rewritten (see the
 * plugins' `rewriteLink`); byte-identical when no link pointed at a moved page.
 */
export function rewriteLinks(
  markdown: string,
  plugins: ContentPlugin[],
  context: LinkRewriteContext,
): string {
  if (!markdown.includes('[')) return markdown
  const pluginMap = buildPluginMap(plugins)
  const inlineDefs: TokenDef[] = plugins
    .flatMap((p) => p.tokens)
    .filter((d) => !d.pattern.source.startsWith('^'))

  function rewriteInline(text: string): string {
    return scanInline(text, inlineDefs).map(rewriteToken).join('')
  }

  function rewriteToken(token: Token): string {
    if (token.type === 'text') return token.raw
    const plugin = pluginMap.get(token.type)
    if (!plugin) return token.raw
    if (plugin.rewriteLink) return plugin.rewriteLink(token, context) ?? token.raw
    if (!plugin.renderToHTML) return token.raw

    const inner: [string, string][] = []
    plugin.renderToHTML(token, {
      renderInline: (text: string) => {
        inner.push([text, rewriteInline(text)])
        return ''
      },
    })
    if (inner.every(([before, after]) => before === after)) return token.raw

    let out = ''
    let cursor = 0
    for (const [before, after] of inner) {
      const at = token.raw.indexOf(before, cursor)
      if (at === -1) return token.raw
      out += token.raw.slice(cursor, at) + after
      cursor = at + before.length
    }
    return out + token.raw.slice(cursor)
  }

  const { lines } = buildDocument(markdown, plugins)
  return lines.map((tokens) => tokens.map(rewriteToken).join('')).join('\n')
}
