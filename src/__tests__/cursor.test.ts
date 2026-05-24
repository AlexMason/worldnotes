// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { getTextOffset, extractText, setCaretOffset, getCaretOffset } from '../cursor'

// DOM tree builder helpers using happy-dom's real DOM implementation
// These replace the hand-stubbed FakeElement/FakeText from the original test.

function text(value: string): Text {
  return document.createTextNode(value)
}

function element(
  nodeName: string,
  children: Node[] = [],
  dataset: Record<string, string> = {},
): HTMLElement {
  const el = document.createElement(nodeName)
  children.forEach((child) => {
    el.appendChild(child)
  })
  Object.entries(dataset).forEach(([key, value]) => {
    el.dataset[key] = value
  })
  return el
}

// ─── getTextOffset ───────────────────────────────────────────────────────────

describe('getTextOffset', () => {
  // ─── Text extraction ───────────────────────────────────────────────────────

  it('converts br elements to newline characters', () => {
    const div = element('DIV', [text('first'), element('BR'), text('second')])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('first\nsecond')
  })

  it('preserves line breaks represented by contenteditable block elements', () => {
    const div = element('DIV', [element('DIV', [text('first')]), element('DIV', [text('second')])])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('first\nsecond')
  })

  it('uses data-raw when rendered text differs from source text', () => {
    const div = element('DIV', [element('SPAN', [text('acme')], { raw: '[[projects/acme]]' })])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('[[projects/acme]]')
  })

  // ─── Caret offset (selection mapping) ──────────────────────────────────────

  it('counts data-raw length when selection is after a preview link', () => {
    const before = text('open ')
    const label = text('acme')
    const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
    const after = text(' done')
    const line = element('DIV', [before, link, after])

    const result = getTextOffset(line, line, 2)
    expect(result.offset).toBe('open [[projects/acme]]'.length)
  })

  it('maps selection inside preview text into the raw token span', () => {
    const before = text('open ')
    const label = text('acme')
    const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
    const after = text(' done')
    const line = element('DIV', [before, link, after])

    const result = getTextOffset(line, label, 2)
    expect(result.offset).toBe('open [['.length)
  })

  it('handles targetNode as parent element with targetOffset at end of children', () => {
    const first = text('a')
    const second = text('b')
    const div = element('DIV', [first, second])

    // targetNode = div, targetOffset = 2 (after all children)
    const result = getTextOffset(div, div, 2)
    expect(result.text).toBe('ab')
    expect(result.offset).toBe(2)
  })

  it('returns text from deeply nested DOM elements', () => {
    const div = element('DIV', [
      element('P', [text('hello')]),
      element('P', [element('SPAN', [text('world')])]),
    ])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('hello\nworld')
  })
})

// ─── extractText ─────────────────────────────────────────────────────────────

describe('extractText', () => {
  it('extracts plain text from simple element', () => {
    const div = element('DIV', [text('hello world')])
    expect(extractText(div)).toBe('hello world')
  })

  it('handles nested inline elements with data-raw', () => {
    const div = element('DIV', [
      text('before '),
      element('SPAN', [text('label')], { raw: '[[page]]' }),
      text(' after'),
    ])
    expect(extractText(div)).toBe('before [[page]] after')
  })

  it('returns empty string for empty element', () => {
    const div = element('DIV', [])
    expect(extractText(div)).toBe('')
  })
})

// ─── setCaretOffset ──────────────────────────────────────────────────────────

describe('setCaretOffset', () => {
  it('places caret at the specified character offset within text', () => {
    const div = element('DIV', [text('hello world')])
    document.body.appendChild(div)

    setCaretOffset(div, 6)

    const sel = window.getSelection()
    expect(sel).toBeTruthy()
    expect(sel!.rangeCount).toBe(1)
    expect(sel!.getRangeAt(0).startOffset).toBe(6)

    document.body.removeChild(div)
  })

  it('falls back to end of element when offset exceeds text length', () => {
    const div = element('DIV', [text('hi')])
    document.body.appendChild(div)

    setCaretOffset(div, 999)

    const sel = window.getSelection()
    expect(sel).toBeTruthy()
    expect(sel!.rangeCount).toBe(1)

    document.body.removeChild(div)
  })

  it('handles offset 0 placing caret at start', () => {
    const div = element('DIV', [text('hello')])
    document.body.appendChild(div)

    setCaretOffset(div, 0)

    const sel = window.getSelection()
    expect(sel).toBeTruthy()
    expect(sel!.rangeCount).toBe(1)
    expect(sel!.getRangeAt(0).startOffset).toBe(0)

    document.body.removeChild(div)
  })
})

// ─── getCaretOffset ──────────────────────────────────────────────────────────

describe('getCaretOffset', () => {
  it('returns 0 for empty contenteditable with no text nodes', () => {
    const div = element('DIV', [])
    const result = getCaretOffset(div)
    expect(result).toBe(0)
  })
})

// ─── extractText — edge cases ────────────────────────────────────────────────

describe('extractText — edge cases', () => {
  it('returns "\\n" for contenteditable containing only a BR element', () => {
    const div = element('DIV', [element('BR')])
    const result = extractText(div)
    expect(result).toBe('\n')
  })
})

// ─── getTextOffset — multi-byte characters ───────────────────────────────────

describe('getTextOffset — multi-byte characters', () => {
  it('preserves emoji characters in text extraction', () => {
    const div = element('DIV', [text('hello 👋 world 🚀')])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('hello 👋 world 🚀')
  })

  it('correctly counts multi-byte character offset', () => {
    const div = element('DIV', [text('abc👋def')])
    // Target: after 'abc👋' — in JS, 👋 is 2 UTF-16 code units
    // getTextOffset should count by character length in text nodes
    const divChild = div.firstChild as Text
    const result = getTextOffset(div, divChild, 5) // 'abc👋'.length === 5 in JS
    expect(result.offset).toBe(5)
  })

  it('handles CJK characters in text extraction', () => {
    const div = element('DIV', [text('日本語テスト')])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('日本語テスト')
    expect(result.offset).toBe(0)
  })

  it('reports correct offset when data-raw contains multi-byte characters', () => {
    const label = text('jp')
    const link = element('SPAN', [label], { raw: '[[🚀projects/日本語]]' })
    const div = element('DIV', [text('before '), link, text(' after')])

    const result = getTextOffset(div, div, 2)
    // offset = 'before '.length + '[[🚀projects/日本語]]'.length
    expect(result.offset).toBe('before '.length + '[[🚀projects/日本語]]'.length)
  })
})

// ─── getTextOffset — line boundaries ─────────────────────────────────────────

describe('getTextOffset — line boundaries', () => {
  it('reports correct offset at boundary between two block elements', () => {
    const div = element('DIV', [element('DIV', [text('first')]), element('DIV', [text('second')])])
    // getTextOffset with target at childNodes[1] (second block)
    const result = getTextOffset(div, div.childNodes[1], 0)
    expect(result.text).toBe('first\nsecond')
    expect(result.offset).toBe('first\n'.length) // 6
  })

  it('reports correct offset at start of second line', () => {
    const div = element('DIV', [element('DIV', [text('line1')]), element('DIV', [text('line2')])])
    // Target: first text node of second block
    const secondBlock = div.childNodes[1] as HTMLElement
    const targetNode = secondBlock.firstChild
    const result = getTextOffset(div, targetNode, 0)
    expect(result.offset).toBe('line1\n'.length) // 6
  })

  it('handles content with text + BR + text', () => {
    const div = element('DIV', [text('before'), element('BR'), text('after')])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('before\nafter')
  })

  it('reports correct offset after BR element', () => {
    const div = element('DIV', [text('before'), element('BR'), text('after')])
    // Target: the 'after' text node at offset 2
    const afterNode = div.childNodes[2] as Text
    const result = getTextOffset(div, afterNode, 2)
    // offset = 'before\n'.length + 2
    expect(result.offset).toBe('before\n'.length + 2) // 'before\n' is 7, + 2 = 9
    expect(result.text).toBe('before\nafter')
  })
})

// ─── getTextOffset — data-raw boundary edge cases ────────────────────────────

describe('getTextOffset — data-raw boundary edge cases', () => {
  it('reports correct offset when target is inside data-raw element child text', () => {
    const before = text('open ')
    const label = text('acme')
    const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
    const after = text(' done')
    const line = element('DIV', [before, link, after])

    // Target inside the label text at offset 1
    const result = getTextOffset(line, label, 1)
    // Expected: 'open ' (5) + first char of raw '[[' parsed position
    expect(result.offset).toBe('open ['.length) // 6
  })

  it('reports correct cumulative offset for adjacent data-raw elements', () => {
    const link1 = element('SPAN', [text('a')], { raw: '[[page1]]' })
    const link2 = element('SPAN', [text('b')], { raw: '[[page2]]' })
    const div = element('DIV', [link1, text(' '), link2])

    // Target: text node ' ' at offset 1
    const spaceNode = div.childNodes[1] as Text
    const result = getTextOffset(div, spaceNode, 1)
    // offset = [[page1]] (9) + space (1) = 10
    expect(result.offset).toBe(10)
    expect(result.text).toBe('[[page1]] [[page2]]')
  })

  it('handles data-raw="" (empty raw) contributing 0 to offset', () => {
    const link = element('SPAN', [text('x')], { raw: '' })
    const div = element('DIV', [text('before'), link, text('after')])

    const result = getTextOffset(div, div.childNodes[2], 0)
    expect(result.offset).toBe('before'.length) // 6 — empty raw contributes 0
    expect(result.text).toBe('beforeafter')
  })
})

// ─── setCaretOffset — forced offset edge cases ───────────────────────────────

describe('setCaretOffset — forced offset edge cases', () => {
  it('handles offset 0 on empty div without throwing', () => {
    const div = element('DIV', [])
    document.body.appendChild(div)

    expect(() => setCaretOffset(div, 0)).not.toThrow()
    const sel = window.getSelection()
    expect(sel).toBeTruthy()

    document.body.removeChild(div)
  })

  it('handles offset 0 on div with only BR element', () => {
    const div = element('DIV', [element('BR')])
    document.body.appendChild(div)

    expect(() => setCaretOffset(div, 0)).not.toThrow()
    const sel = window.getSelection()
    expect(sel).toBeTruthy()

    document.body.removeChild(div)
  })
})
