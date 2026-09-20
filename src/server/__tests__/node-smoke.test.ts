// ─── Node import smoke test ──────────────────────────────────────────────────
// Runs in the vitest `node` project (no DOM). The SSR read path renders with
// the SAME engine as the editor (src/core static renderer) — this guard is
// load-bearing: it proves the entire server import seam (render/reader →
// core/static-renderer → plugins, plus render/layout) imports and executes
// under plain Node with no top-level DOM, and no markdown-it exists anymore.

// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { tokenizeDocument, tokenizeLine, scanInline } from '../../core/tokenizer'
import { defaultPlugins } from '../../core/plugins/defaults'
import { parseWikiLink, pageDisplayName } from '../../core/navigation'

describe('core modules import in plain node (no DOM)', () => {
  it('has no window/document globals available', () => {
    expect(typeof globalThis.document).toBe('undefined')
  })

  it('tokenizes a markdown document line-by-line', () => {
    const defs = defaultPlugins.flatMap((p) => p.tokens)
    const lines = tokenizeDocument('# Title\n\nSome **bold** text\n- item one', defs)
    expect(lines).toHaveLength(4)

    const heading = tokenizeLine('# Title', defs)
    expect(heading[0]?.type).toBe('h1')
  })

  it('scans inline tokens without touching the DOM', () => {
    const defs = defaultPlugins
      .flatMap((p) => p.tokens)
      .filter((d) => !d.pattern.source.startsWith('^'))
    const tokens = scanInline('see [[a/b|Bee]] now', defs)
    const wiki = tokens.find((t) => t.type === 'wiki-link')
    expect(wiki).toBeDefined()
    expect(wiki?.raw).toBe('[[a/b|Bee]]')
    expect(wiki?.groups[0]).toBe('a/b|Bee')
  })

  it('the SSR render seam itself imports and renders under plain node', async () => {
    const { createReaderRenderer } = await import('../render/reader')
    await import('../render/layout')
    const renderer = createReaderRenderer()
    const html = renderer.render('# T\n\nsee [[a/b]]')
    expect(html).toContain('<div data-line="0">')
    expect(html).toContain('href="/a/b"')
  })

  it('the block pass (fences, images) runs DOM-free under plain node', async () => {
    const { createReaderRenderer } = await import('../render/reader')
    const renderer = createReaderRenderer()
    const html = renderer.render('```\n<x>\n```\n![d](/i.png)')
    expect(html).toContain('data-block="code-block"')
    expect(html).toContain('&lt;x&gt;') // escaped, no DOM needed
    expect(html).toContain('<img class="wn-image-img" src="/i.png"')
  })

  it('navigation helpers are DOM-free pure functions', () => {
    expect(parseWikiLink('projects/worldnotes|Notes')).toEqual({
      page: 'projects/worldnotes',
      display: 'Notes',
    })
    expect(pageDisplayName('a/b/c')).toBe('c')
  })
})
