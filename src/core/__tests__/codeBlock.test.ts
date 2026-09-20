// ─── Code fence block def ────────────────────────────────────────────────────
// Registration-level behavior of codeBlockPlugin through buildDocument —
// the generic grouping/rendering machinery is pinned in block-render.test.ts.

import { describe, it, expect } from 'vitest'
import { buildDocument } from '../document'
import { codeBlockPlugin } from '../plugins/codeBlock'
import { defaultPlugins } from '../plugins/defaults'

const plugins = defaultPlugins

describe('codeBlockPlugin detection', () => {
  it('claims ``` … ``` including both fence lines', () => {
    const doc = buildDocument('a\n```js\ncode\n```\nb', plugins)
    expect(doc.blocks).toHaveLength(1)
    const r = doc.blocks[0]!
    expect([r.type, r.startLine, r.endLine]).toEqual(['code-block', 1, 3])
  })

  it('unclosed fence ends at EOF', () => {
    const doc = buildDocument('```\na\nb', plugins)
    expect(doc.blocks[0]!.endLine).toBe(2)
  })

  it('interior lines stay verbatim (no inline tokens)', () => {
    const doc = buildDocument('```\n**x** [[y]] [a](b)\n```', plugins)
    expect(doc.lines[1]).toHaveLength(1)
    expect(doc.lines[1][0]!.type).toBe('text')
    expect(doc.lines[1][0]!.raw).toBe('**x** [[y]] [a](b)')
  })

  it('two fences are separate regions; the second close does not leak', () => {
    const doc = buildDocument('```\na\n```\ntext\n```\nb\n```', plugins)
    expect(doc.blocks).toHaveLength(2)
    expect([doc.blocks[0]!.startLine, doc.blocks[0]!.endLine]).toEqual([0, 2])
    expect([doc.blocks[1]!.startLine, doc.blocks[1]!.endLine]).toEqual([4, 6])
    expect(doc.lines[3]).toEqual([{ type: 'text', raw: 'text', groups: ['text'] }])
  })

  it('list-item-looking fence content stays in the region', () => {
    const doc = buildDocument('```\n1. install pkg\n- item\n```', plugins)
    expect(doc.blocks[0]!.endLine).toBe(3)
    expect(doc.lines[1][0]!.raw).toBe('1. install pkg')
  })

  it('fence region never starts on a line-level construct', () => {
    // a def that always matches, to probe the central isPlainLine gate
    const greedy = {
      ...codeBlockPlugin,
      name: 'greedy',
      blocks: [
        { ...codeBlockPlugin.blocks![0], match: (_l: string[], i: number) => ({ endLine: i }) },
      ],
    }
    const doc = buildDocument('# heading\nplain', [
      ...defaultPlugins.filter((p) => p.name !== 'code-block'),
      greedy,
    ])
    // heading start skipped by central gate; the plain line IS claimable
    expect(doc.blocks[0]!.startLine).toBe(1)

    // '# ``` x' is a HEADING, not a fence opener — the fence grammar must
    // yield to line-level grammar on the start line
    const headingFirst = buildDocument('# ``` x\n```', plugins)
    expect(headingFirst.lines[0][0]!.type).toBe('h1')
    expect(headingFirst.blocks[0]!.startLine).toBe(1) // bare '```' opens alone (unclosed-to-EOF)
  })

  it('fence plugin contributes no scan tokens', () => {
    expect(codeBlockPlugin.tokens).toEqual([])
    expect(codeBlockPlugin.blocks).toHaveLength(1)
  })
})
