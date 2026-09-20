// ─── Block pass (buildDocument) ──────────────────────────────────────────────
// Step-3 coverage uses SYNTHETIC in-test BlockDefs — the real code-fence and
// table defs arrive with their plugins (steps 4-5) and get their own suites.
// What is pinned here is the generic machinery: detection precedence,
// verbatim vs token line modes, the fidelity contract, isPlainLine gating,
// and regionAt (the cursor-in-block lookup).

import { describe, it, expect } from 'vitest'
import { buildDocument, regionAt } from '../document'
import { defaultPlugins } from '../plugins/defaults'
import type { BlockDef, ContentPlugin, Token } from '../types'

/** Minimal content plugin (block-only plugins need a render stub). */
function blockPlugin(blocks: BlockDef[]): ContentPlugin {
  return {
    name: blocks[0]?.type ?? 'test',
    version: '1.0.0',
    kind: 'content',
    tokens: [],
    blocks,
    render: (): HTMLElement => document.createElement('span'),
  }
}

// A "quote block": starts on a plain line beginning with '>>', ends on the
// next line beginning with '<<'. Verbatim mode.
const verbatimDef: BlockDef = {
  type: 'test-verbatim',
  match: (lines, start, helpers) => {
    if (!helpers.isPlainLine(lines[start]) || !lines[start].startsWith('>>')) return null
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].startsWith('<<')) return { endLine: i }
    }
    return { endLine: lines.length - 1 } // unclosed → EOF (GFM-fence style)
  },
  lineMode: () => 'verbatim',
  wrapperClass: 'wn-test-verbatim',
  lineClass: (i) => (i === 0 ? 'wn-test-open' : undefined),
}

// A "kv block": starts 'k:'; rows parse into key/value tokens (mode token).
const tokenDef: BlockDef = {
  type: 'test-kv',
  lineTokenType: 'kv-row',
  match: (lines, start, helpers) => {
    if (!helpers.isPlainLine(lines[start]) || !/^k:/.test(lines[start])) return null
    let end = start
    while (end + 1 < lines.length && /^k:/.test(lines[end + 1])) end++
    return { endLine: end, state: { lines } }
  },
  lineMode: () => 'token',
  parseLine: (i, state): Token[] => {
    const line = (state as { lines: string[] }).lines[i]
    const m = line.match(/^(k):(.*)$/)!
    return [{ type: 'kv-row', raw: line, groups: [m[1]!, m[2]!] }]
  },
  wrapperClass: 'wn-test-kv',
}

describe('buildDocument — block scan', () => {
  it('no block defs → every line tokenized normally, zero regions', () => {
    const doc = buildDocument('# hi\nplain [[link]]', defaultPlugins)
    expect(doc.blocks).toEqual([])
    expect(doc.lines).toHaveLength(2)
    expect(doc.lines[0][0]!.type).toBe('h1')
    expect(doc.lines[1].map((t) => t.type)).toContain('wiki-link')
  })

  it('claims a region and marks its lines', () => {
    const text = 'before\n>> a\nb\n<<\nafter'
    const doc = buildDocument(text, [blockPlugin([verbatimDef])])
    expect(doc.blocks).toHaveLength(1)
    const r = doc.blocks[0]!
    expect([r.startLine, r.endLine, r.type]).toEqual([1, 3, 'test-verbatim'])
  })

  it('verbatim region lines suppress inline parsing', () => {
    const doc = buildDocument('>> **not bold**\n<<', [blockPlugin([verbatimDef])])
    expect(doc.lines[0]).toHaveLength(1)
    expect(doc.lines[0][0]!.type).toBe('text')
    expect(doc.lines[0][0]!.raw).toBe('>> **not bold**')
  })

  it('unclosed region runs to EOF', () => {
    const doc = buildDocument('>> a\nb\nc', [blockPlugin([verbatimDef])])
    expect(doc.blocks[0]!.endLine).toBe(2)
  })

  it('isPlainLine gate: a heading line can never START a region', () => {
    // make the def accept '>> …' even after '# ' prefix to try to steal it
    const greedy: BlockDef = {
      ...verbatimDef,
      match: (lines, start) => (lines[start].includes('>>') ? { endLine: start } : null),
    }
    const doc = buildDocument('# heading >>\n>', [...defaultPlugins, blockPlugin([greedy])])
    expect(doc.blocks).toHaveLength(0)
    expect(doc.lines[0][0]!.type).toBe('h1')
  })

  it('earliest start wins; ties by registration order', () => {
    const defA: BlockDef = {
      ...verbatimDef,
      type: 'a',
      match: (l, s, h) => (h.isPlainLine(l[s]) && l[s] === 'X' ? { endLine: s } : null),
    }
    const defB: BlockDef = { ...defA, type: 'b' }
    const doc = buildDocument('Y\nX\nY', [blockPlugin([defA]), blockPlugin([defB])])
    expect(doc.blocks[0]!.type).toBe('a') // registration order on the same start
  })

  it('token-mode lines come from parseLine with byte-exact fidelity', () => {
    const text = 'k:a\nk:b\nplain'
    const def: BlockDef = { ...tokenDef, match: tokenDef.match }
    const doc = buildDocument(text, [blockPlugin([def])])
    expect(doc.blocks).toHaveLength(1)
    expect(doc.lines[0]).toEqual([{ type: 'kv-row', raw: 'k:a', groups: ['k', 'a'] }])
    expect(doc.lines[2][0]!.type).toBe('text')
  })

  it('a fidelity-breaking parseLine degrades to verbatim instead of corrupting', () => {
    const broken: BlockDef = {
      ...tokenDef,
      parseLine: (): Token[] => [{ type: 'kv-row', raw: 'WRONG', groups: [] }],
    }
    const doc = buildDocument('k:a\nk:b', [blockPlugin([broken])])
    expect(doc.lines[0][0]!.raw).toBe('k:a') // byte-exact verbatim fallback
  })

  it('line raws always concatenate back to the source line (every mode)', () => {
    const text = 'top\n>> **x** [l](u)\n[[w]]\n<<\nk:y\nend'
    const doc = buildDocument(text, [
      blockPlugin([verbatimDef]),
      blockPlugin([
        {
          ...tokenDef,
          // state carries the lines for parseLine in this synthetic def
          match: (lines, start, h) =>
            h.isPlainLine(lines[start]) && /^k:/.test(lines[start])
              ? { endLine: start, state: { lines } }
              : null,
        },
      ]),
    ])
    text.split('\n').forEach((line, i) => {
      expect(doc.lines[i]!.map((t) => t.raw).join(''), `line ${i}`).toBe(line)
    })
  })

  it('blank lines are preserved as single empty tokens in regions', () => {
    const doc = buildDocument('>> a\n\n<<', [blockPlugin([verbatimDef])])
    expect(doc.lines[1]).toEqual([{ type: 'text', raw: '', groups: [''] }])
  })
})

describe('regionAt', () => {
  const doc = buildDocument('a\n>> x\ny\n<<\nb', [blockPlugin([verbatimDef])])

  it('finds the covering region for every member line', () => {
    for (const l of [1, 2, 3]) {
      expect(regionAt(doc.blocks, l)?.type).toBe('test-verbatim')
    }
  })

  it('returns null outside', () => {
    expect(regionAt(doc.blocks, 0)).toBeNull()
    expect(regionAt(doc.blocks, 4)).toBeNull()
    expect(regionAt(doc.blocks, 99)).toBeNull()
  })
})
