// ─── Static HTML renderer — the ONE render engine ────────────────────────────
// The reader (SSR) and any future static export render through this module.
// It is the string-output sibling of `renderer.ts` (interactive DOM): both
// share `tokenizer.ts`, `buildPluginMap`, and the same ContentPlugin set, so
// one grammar drives both surfaces ("single renderer" constraint — see
// AGENTS.md and docs/architecture.md).
//
// DOM-free BY CONSTRUCTION: no `document`/`window` reference may ever appear
// here (server code imports this module directly — never via the core barrel;
// guarded by src/server/__tests__/node-smoke.test.ts).
//
// Security: everything interpolated into HTML output is author-supplied
// markdown. Text positions use `escapeHTML`; attribute values use
// `escapeAttr`. Plugins enforce the href scheme policy (`isSafeHref`, slug
// folding) in their own `renderToHTML`.

import type { Token, ContentPlugin, StaticRenderContext } from './types'
import { scanInline, tokenizeDocument } from './tokenizer'
import { buildPluginMap } from './plugin-map'
import { escapeHTML } from './escape'

/**
 * Render a single line of tokens as an HTML string.
 * Falls back to escaped raw text for unknown token types or plugins that
 * do not implement `renderToHTML`.
 */
export function renderLineToHTML(
  tokens: Token[],
  contentPlugins: ContentPlugin[],
  context: StaticRenderContext,
  pluginMap?: Map<string, ContentPlugin>,
): string {
  const map = pluginMap ?? buildPluginMap(contentPlugins)
  const parts: string[] = []

  for (const token of tokens) {
    if (token.type === 'text') {
      parts.push(escapeHTML(token.raw))
      continue
    }

    const plugin = map.get(token.type)
    if (!plugin || !plugin.renderToHTML) {
      parts.push(escapeHTML(token.raw))
      continue
    }

    parts.push(plugin.renderToHTML(token, context))
  }

  return parts.join('')
}

/**
 * Render inline markdown text as an HTML string using only inline-level
 * token definitions. Used as the `renderInline` implementation within
 * StaticRenderContext for plugins that need nested rendering.
 */
export function renderInlineHTML(
  text: string,
  contentPlugins: ContentPlugin[],
): string {
  const inlineDefs = contentPlugins
    .flatMap((p) => p.tokens)
    .filter((d) => !d.pattern.source.startsWith('^'))

  const tokens = scanInline(text, inlineDefs)
  const pluginMap = buildPluginMap(contentPlugins)
  const parts: string[] = []

  for (const token of tokens) {
    if (token.type === 'text') {
      parts.push(escapeHTML(token.raw))
      continue
    }

    const plugin = pluginMap.get(token.type)
    if (!plugin || !plugin.renderToHTML) {
      parts.push(escapeHTML(token.raw))
      continue
    }

    const ctx: StaticRenderContext = {
      renderInline: (t: string) => renderInlineHTML(t, contentPlugins),
    }
    parts.push(plugin.renderToHTML(token, ctx))
  }

  return parts.join('')
}

/**
 * Render a full tokenized document as an HTML string.
 * Each line becomes a div[data-line] container matching the editor DOM.
 * Line content is NOT trimmed — the editor's DOM preserves intra-line
 * whitespace (`white-space: pre-wrap`), and reader parity depends on it.
 */
export function renderDocumentToHTML(
  lines: Token[][],
  contentPlugins: ContentPlugin[],
): string {
  const pluginMap = buildPluginMap(contentPlugins)
  const ctx: StaticRenderContext = {
    renderInline: (text: string) => renderInlineHTML(text, contentPlugins),
  }
  const parts: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineHTML = renderLineToHTML(lines[i], contentPlugins, ctx, pluginMap)
    if (lineHTML === '') {
      parts.push(`<div data-line="${i}"><br></div>`)
    } else {
      parts.push(`<div data-line="${i}">${lineHTML}</div>`)
    }
  }

  return parts.join('\n')
}

/**
 * One-call pipeline: raw markdown → reader HTML string.
 * `plugins` is explicit (not defaulted to `defaultPlugins`) to keep this
 * module free of an import cycle through `plugins/defaults`.
 */
export function renderDocumentHtml(
  markdown: string,
  plugins: ContentPlugin[],
): string {
  const defs = plugins.flatMap((p) => p.tokens)
  return renderDocumentToHTML(tokenizeDocument(markdown, defs), plugins)
}
