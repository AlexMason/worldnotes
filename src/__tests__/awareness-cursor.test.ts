// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { getLineOffset, setLineOffset } from '../awareness-cursor'

function setCaretAt(node: Node, offset: number): void {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()
  sel!.removeAllRanges()
  sel!.addRange(range)
}

describe('getLineOffset → setLineOffset round-trip', () => {
  it('preserves offset for a single-line document', () => {
    const el = document.createElement('div')
    const line = document.createElement('div')
    line.dataset.line = '0'
    line.textContent = 'hello'
    el.appendChild(line)

    setCaretAt(line.firstChild!, 3)
    const offset = getLineOffset(el)
    expect(offset).toBe(3)

    // setLineOffset should restore cursor at same position
    setLineOffset(el, offset)
    const after = getLineOffset(el)
    expect(after).toBe(3)
  })

  it('preserves offset on empty line with <br> placeholder', () => {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'hello'
    el.appendChild(line0)

    // newline separator
    el.appendChild(document.createTextNode('\n'))

    // empty line with <br>
    const line1 = document.createElement('div')
    line1.dataset.line = '1'
    line1.appendChild(document.createElement('br'))
    el.appendChild(line1)

    // Offset 6: after "hello" (5) + newline (1)
    setLineOffset(el, 6)
    const after = getLineOffset(el)
    expect(after).toBe(6)
  })

  it('restores cursor at start of empty line when offset lands there (Enter key scenario)', () => {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'before'
    el.appendChild(line0)
    el.appendChild(document.createTextNode('\n'))

    const line1 = document.createElement('div')
    line1.dataset.line = '1'
    line1.appendChild(document.createElement('br'))
    el.appendChild(line1)

    // Offset after "before\n" = 7
    setLineOffset(el, 7)
    const sel = window.getSelection()
    expect(sel).not.toBeNull()
    expect(sel!.rangeCount).toBe(1)

    const range = sel!.getRangeAt(0)
    // Cursor should be inside line1, at offset 0 (before the <br>)
    expect(range.startContainer).toBe(line1)
    expect(range.startOffset).toBe(0)
    expect(range.collapsed).toBe(true)
  })

  it('falls back to last line when offset exceeds total length', () => {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'hi'
    el.appendChild(line0)

    // Offset 999 is way past the end
    // Should fall back to end of last line
    setLineOffset(el, 999)
    const after = getLineOffset(el)
    expect(after).toBe(2) // end of "hi"
  })
})

// ─── Regression: Enter key scenarios ────────────────────────────────────────────

describe('Enter key — offset survives render remapping', () => {
  function buildEditor(lines: (string | null)[]): HTMLElement {
    const el = document.createElement('div')
    for (let i = 0; i < lines.length; i++) {
      const container = document.createElement('div')
      container.dataset.line = String(i)
      const text = lines[i]
      if (text) {
        container.textContent = text
      } else {
        container.appendChild(document.createElement('br'))
      }
      el.appendChild(container)
      if (i < lines.length - 1) {
        el.appendChild(document.createTextNode('\n'))
      }
    }
    return el
  }

  it('Enter at end of line: cursor lands at start of new empty line', () => {
    const el = buildEditor(['hello', null])
    // "hello\n" has length 6, cursor after \n → offset 6
    setLineOffset(el, 6)
    const range = window.getSelection()!.getRangeAt(0)
    // Should be inside the empty line1 container at offset 0
    expect(range.startContainer).toBe(el.querySelector('[data-line="1"]'))
    expect(range.startOffset).toBe(0)
  })

  it('Enter at start of line: cursor lands at start of new empty line above', () => {
    const el = buildEditor([null, 'world'])
    // "\nworld" has cursor after \n (position 0) → offset 1
    // After split: line0="" line1="world", offset 1 maps to start of line1
    setLineOffset(el, 1)
    const range = window.getSelection()!.getRangeAt(0)

    // Cursor should be in the text node of line1 at offset 0
    const line1 = el.querySelector('[data-line="1"]')!
    expect(range.startContainer).toBe(line1.firstChild)
    expect(range.startOffset).toBe(0)
  })

  it('Enter in middle of line: cursor lands at start of new split line', () => {
    const el = buildEditor(['hello ', 'world'])
    // "hello \nworld" cursor position after "\n" = 7
    // After split: line0="hello " (len=6) line1="world" (len=5)
    // offset 7 → remaining after line0 = 7-6-1 = 0, pos 0 in line1
    setLineOffset(el, 7)
    const range = window.getSelection()!.getRangeAt(0)

    // Cursor should be in the text node of line1 at offset 0
    const line1 = el.querySelector('[data-line="1"]')!
    expect(range.startContainer).toBe(line1.firstChild)
    expect(range.startOffset).toBe(0)
  })

  it('double Enter on empty line: cursor stays on new empty line', () => {
    const el = buildEditor(['line', null, null])
    // "line\n\n" → two newlines, cursor after second \n
    // offset = 4(line) + 1(\n) + 0(empty) + 1(\n) = 6
    setLineOffset(el, 6)
    const range = window.getSelection()!.getRangeAt(0)

    // Should be on the third (empty) line
    const line2 = el.querySelector('[data-line="2"]')
    expect(range.startContainer).toBe(line2)
    expect(range.startOffset).toBe(0)
  })

  it('Enter at very end of document: cursor on new empty trailing line', () => {
    // "hello" has no trailing newline, cursor at end → offset 5
    // After inserting \n: "hello\n", cursor at offset 6
    // setLineOffset with offset at the empty last line
    const el2 = buildEditor(['hello', null])
    setLineOffset(el2, 5 + 1) // 6
    const range = window.getSelection()!.getRangeAt(0)
    expect(range.startContainer).toBe(el2.querySelector('[data-line="1"]'))
    expect(range.startOffset).toBe(0)
  })

  it('cursor preserved after typing on empty line', () => {
    const el = buildEditor(['hello', 'x'])
    // User clicked on empty line (offset 6), typed 'x'
    // Cursor now at offset 7 (after 'x')
    setLineOffset(el, 7)
    const after = getLineOffset(el)
    expect(after).toBe(7)
    const range = window.getSelection()!.getRangeAt(0)
    expect(range.startContainer).toBe(el.querySelector('[data-line="1"]')!.firstChild)
    expect(range.startOffset).toBe(1) // end of 'x'
  })
})
