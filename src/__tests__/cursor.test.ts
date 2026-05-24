// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { getTextOffset, extractText, setCaretOffset } from '../cursor'

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
    const div = element('DIV', [
      element('DIV', [text('first')]),
      element('DIV', [text('second')]),
    ])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('first\nsecond')
  })

  it('uses data-raw when rendered text differs from source text', () => {
    const div = element('DIV', [
      element('SPAN', [text('acme')], { raw: '[[projects/acme]]' }),
    ])
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
