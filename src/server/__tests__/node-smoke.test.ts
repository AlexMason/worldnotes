// ─── Node import smoke test ──────────────────────────────────────────────────
// Runs in the vitest `node` project (no DOM). Proves the DOM-free static
// rendering pipeline (tokenizer + plugin renderToHTML) imports and executes
// under plain Node — the exact surface the SSR read path relies on later
// (markdown-it renders the viewer; this guards tokenizer availability and
// guards against top-level DOM creeping into importable modules).
//
// NOTE: plugins whose *edit-preview* renderToHTML we do NOT reuse for SSR;
// this test asserts import-safety and tokenizer behavior, not viewer output.

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
    const lines = tokenizeDocument(
      '# Title\n\nSome **bold** text\n- item one',
      defs,
    )
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

  it('navigation helpers are DOM-free pure functions', () => {
    expect(parseWikiLink('projects/worldnotes|Notes')).toEqual({
      page: 'projects/worldnotes',
      display: 'Notes',
    })
    expect(pageDisplayName('a/b/c')).toBe('c')
  })
})
