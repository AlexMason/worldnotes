// ─── Pipe tables ─────────────────────────────────────────────────────────────
// Detection (match), cell parsing (parseLine fidelity), and both render
// paths — including the false-positive guards the reviewers demanded (B2/M9):
// bullets, headings, hr, and prose+`---` must NEVER be eaten by the block
// pass.

import { describe, it, expect } from 'vitest'
import { buildDocument } from '../document'
import { renderDocModelToHTML } from '../static-renderer'
import { defaultPlugins } from '../plugins/defaults'
import type { EditorContext } from '../types'

const plugins = defaultPlugins

const SIMPLE = '| a | b |\n|---|---|\n| 1 | 2 |'

function doc(text: string) {
  return buildDocument(text, plugins)
}

describe('table detection', () => {
  it('claims header + separator + body rows', () => {
    const d = doc(SIMPLE)
    expect(d.blocks).toHaveLength(1)
    const r = d.blocks[0]!
    expect([r.type, r.startLine, r.endLine]).toEqual(['table', 0, 2])
  })

  it('stops at the first non-pipe / blank / construct line', () => {
    const d = doc(`${SIMPLE}\n- item | x\n| 3 | 4 |`)
    // '- item | x' is a LIST line → not plain → region ends before it
    expect(d.blocks[0]!.endLine).toBe(2)
    expect(d.lines[3][0]!.type).toBe('list-item')
    // the trailing pipe line after the interruption is NOT continuation
    expect(d.lines[4][0]!.type).toBe('text')
  })

  it('a bare --- after prose is an hr, not a table (M9)', () => {
    const d = doc('Some prose | with a pipe\n---\ndone')
    expect(d.blocks).toHaveLength(0)
    expect(d.lines[1][0]!.type).toBe('hr')
  })

  it('a bullet line + dashy line is not a table (B2)', () => {
    const d = doc('- x\n- |---|')
    expect(d.blocks).toHaveLength(0)
    expect(d.lines[0][0]!.type).toBe('list-item')
  })

  it('column counts must match between header and separator', () => {
    expect(doc('| a | b |\n|---|\n| 1 |').blocks).toHaveLength(0)
  })

  it('separator cells accept 1+ dashes and alignment colons (GFM)', () => {
    const d = doc('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |')
    expect(d.blocks).toHaveLength(1)
    const state = d.blocks[0]!.state as { alignments: (string | null)[] }
    expect(state.alignments).toEqual(['left', 'center', 'right'])
  })

  it('outer pipes are optional on rows', () => {
    const d = doc('a | b\n--- | ---\n1 | 2')
    expect(d.blocks).toHaveLength(1)
    expect(d.blocks[0]!.endLine).toBe(2)
  })

  it('table syntax inside a code fence renders verbatim (precedence)', () => {
    const d = doc('```\n| a | b |\n|---|---|\n```')
    expect(d.blocks).toHaveLength(1)
    expect(d.blocks[0]!.type).toBe('code-block')
  })

  it('table at EOF terminates the region cleanly', () => {
    const d = doc(`${SIMPLE}`)
    expect(d.blocks[0]!.endLine).toBe(2)
  })
})

describe('table line fidelity + tokenization', () => {
  it('region line token raws rebuild the source byte-exactly', () => {
    const text = `${SIMPLE}\n| longer **x** | 2 |`
    const d = doc(text)
    text.split('\n').forEach((line, i) => {
      expect(d.lines[i]!.map((t) => t.raw).join(''), `line ${i}`).toBe(line)
    })
  })

  it('separator line is verbatim; header/body are table-row tokens', () => {
    const d = doc(SIMPLE)
    expect(d.lines[1][0]!.type).toBe('text')
    expect(d.lines[0][0]!.type).toBe('table-row')
    expect(d.lines[2][0]!.type).toBe('table-row')
  })
})

describe('table static rendering', () => {
  const html = renderDocModelToHTML(doc(SIMPLE), plugins)

  it('wraps rows, marks classes per role', () => {
    expect(html).toContain('<div class="wn-table" data-block="table">')
    expect(html).toContain('class="wn-table-row wn-table-head"')
    expect(html).toContain('class="wn-table-sep"')
  })

  it('renders cells with punct pipes between them (byte-exact join)', () => {
    const row = doc(SIMPLE).lines[0]!
    const rendered = renderDocModelToHTML({ lines: [row, [], []], blocks: [] }, plugins)
    // outer edge spans + two aligned-less cells + punct between
    expect(rendered).toContain('<span class="wn-table-cells">')
    expect(rendered).toContain('<span class="wn-table-edge"></span>')
    expect(rendered).toContain('<span class="wn-punct">|</span>')
    expect(rendered).toContain('<span class="wn-table-cell"> a </span>')
  })

  it('alignment classes are a closed enum applied per column', () => {
    const aligned = renderDocModelToHTML(
      doc('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |'),
      plugins,
    )
    expect(aligned).toContain('wn-table-cell wn-align-left')
    expect(aligned).toContain('wn-table-cell wn-align-center"> 2 ')
    expect(aligned).toContain('wn-table-cell wn-align-right')
  })

  it('cell content is inline-rendered (bold works in a cell)', () => {
    const marked = renderDocModelToHTML(doc('| a | b |\n|---|---|\n| 1 | **x** |'), plugins)
    expect(marked).toContain('<span class="wn-bold"><span class="wn-punct">**</span>x')
  })

  it('HTML in a cell is escaped (B4 vector)', () => {
    const evil = renderDocModelToHTML(
      doc('| a | b |\n|---|---|\n| 1 | <img src=x onerror=1> |'),
      plugins,
    )
    expect(evil).not.toContain('<img')
    expect(evil).toContain('&lt;img')
  })

  it('ragged body rows keep their own cell count, extra cols unaligned', () => {
    const d = doc('| a | b |\n|:--|--:|\n| 1 |')
    const out = renderDocModelToHTML(d, plugins)
    const body = d.lines[2]!
    expect(body[0]!.raw).toBe('| 1 |')
    expect(out).toContain('wn-align-left') // header alignment still on col 0
  })
})

describe('table DOM/static parity (same tree, one implementation each)', () => {
  it('renderLines innerHTML equals the static string', async () => {
    const { renderLines } = await import('../line-renderer')
    const { renderInlineContent } = await import('../renderer')
    const text = '| a | b |\n|:--|--:|\n| **x** | 2 |\n| 3 | 4 |'
    const ctx: EditorContext = {
      navigate: () => undefined,
      getTrail: () => [],
      getCurrentPage: () => 'p',
      getWorld: () => ({ p: text }),
      getPageText: () => text,
      setPageText: () => undefined,
    }
    ctx.renderInline = (t: string) => renderInlineContent(t, plugins, ctx)
    const root = document.createElement('div')
    renderLines(text, plugins, ctx, root)
    expect(root.innerHTML).toBe(renderDocModelToHTML(doc(text), plugins))
  })
})
