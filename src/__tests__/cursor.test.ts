// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { getTextOffset } from '../cursor'

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
})
