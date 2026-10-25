// @vitest-environment happy-dom

// Grammar-level parity (GH-4 option 2): the CM6 live-preview layer and the
// reader static renderer are both driven by buildDocument. For a collapsed
// document, what the CM6 surface SHOWS (source minus hidden punctuation, with
// replaced markers swapped) must equal what the reader shows (textContent
// minus the nodes reader CSS hides). Tree shape is not compared — the CM6
// surface has no tree to compare.

import { describe, it, expect } from 'vitest'
import { grammarSpans } from '../cm6/grammar-spans'
import { buildDocument } from '../document'
import { renderDocModelToHTML } from '../static-renderer'
import { defaultPlugins } from '../plugins/defaults'

/** Source with collapsed-state hide/replace applied, per source line. */
function collapsedText(text: string): string {
  const { spans } = grammarSpans(text, defaultPlugins)
  const edits = spans
    .filter((s) => s.kind === 'hide' || s.kind === 'replace')
    .sort((a, b) => b.from - a.from)
  let out = text
  for (const s of edits) out = out.slice(0, s.from) + (s.text ?? '') + out.slice(s.to)
  return out
}

/** Reader textContent per line, minus nodes reader CSS hides while collapsed. */
function readerText(text: string): string {
  const host = document.createElement('div')
  host.innerHTML = renderDocModelToHTML(buildDocument(text, defaultPlugins), defaultPlugins)
  host.querySelectorAll('.wn-punct, .wn-image-alt, .wn-image-src').forEach((n) => n.remove())
  return Array.from(host.querySelectorAll('[data-line]'))
    .map((l) => l.textContent ?? '')
    .join('\n')
}

const CORPUS = [
  '# Heading one',
  '## Heading **two** with `code`',
  'Some **bold**, *italic*, ~~struck~~, and `code`.',
  '> a quoted **line**',
  '- plain item',
  '  - indented item with [[Some/Page]]',
  '1. ordered item',
  'link [Example](https://example.com) and [us](mailto:a@b.c) and [home](about/me)',
  'image ![Diagram](https://x.test/a.png) inline',
  'wiki [[projects/acme|Client Portal]] and [[plain-page]]',
  // Unsafe targets stay literal source on the reader — CM6 must not hide them.
  'unsafe [nope](javascript:alert(1)) and ![a](data:text/html,x) and [[ ]]',
  '```js',
  'const **not-bold** = [[nope]]',
  '```',
  // Pipe tables are deliberately absent: the reader hides pipes and lays rows
  // out as flex cells; the spike keeps pipes visible (dimmed) — a recorded
  // divergence (findings doc, "Tables"), not parity.
].join('\n')

describe('grammarSpans ↔ reader parity', () => {
  it('collapsed CM6 text equals reader text for every corpus line', () => {
    const cm = collapsedText(CORPUS).split('\n')
    const reader = readerText(CORPUS).split('\n')
    expect(cm).toEqual(reader)
  })
})

describe('grammarSpans', () => {
  it('hides heading marker and styles the line; inline tokens inside are recursed', () => {
    const text = '# A **b**'
    const { spans } = grammarSpans(text, defaultPlugins)
    expect(spans).toContainEqual(expect.objectContaining({ kind: 'line', cls: 'wn-h1' }))
    expect(spans).toContainEqual(expect.objectContaining({ kind: 'hide', from: 0, to: 2 }))
    // bold markers at absolute offsets 4..6 and 7..9 (offset-correct after the prefix)
    expect(spans).toContainEqual(expect.objectContaining({ kind: 'hide', from: 4, to: 6 }))
    expect(spans).toContainEqual(expect.objectContaining({ kind: 'hide', from: 7, to: 9 }))
  })

  it('offsets are absolute across lines', () => {
    const text = 'x\n**b**'
    const { spans, lineStarts } = grammarSpans(text, defaultPlugins)
    expect(lineStarts).toEqual([0, 2])
    expect(spans).toContainEqual(expect.objectContaining({ kind: 'hide', from: 2, to: 4, line: 1 }))
  })

  it('verbatim fence lines get region classes but no inline spans', () => {
    const { spans } = grammarSpans('```\n**x**\n```', defaultPlugins)
    expect(spans.every((s) => s.kind === 'line')).toBe(true)
    const mid = spans.find((s) => s.line === 1)
    expect(mid?.cls).toContain('wn-code-line')
    expect(spans.find((s) => s.line === 0)?.cls).toContain('wn-region-first')
    expect(spans.find((s) => s.line === 2)?.cls).toContain('wn-region-last')
  })

  it('wiki link with pipe hides target and brackets, marks display with data-page', () => {
    const text = '[[projects/acme|Client Portal]]'
    const { spans } = grammarSpans(text, defaultPlugins)
    const mark = spans.find((s) => s.kind === 'mark')!
    expect(text.slice(mark.from, mark.to)).toBe('Client Portal')
    expect(mark.attrs).toEqual({ 'data-page': 'projects/acme' })
  })

  it('only safe image sources become widgets', () => {
    expect(
      grammarSpans('![a](https://x.test/a.png)', defaultPlugins).spans.some(
        (s) => s.kind === 'image',
      ),
    ).toBe(true)
    expect(
      grammarSpans('![a](javascript:x)', defaultPlugins).spans.some((s) => s.kind === 'image'),
    ).toBe(false)
  })

  it('hr styling is collapsed-only so editing shows plain source', () => {
    const { spans } = grammarSpans('---', defaultPlugins)
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ kind: 'line', inactiveCls: 'wn-hr' })
    expect(spans[0]!.cls).toBeUndefined()
  })
})
