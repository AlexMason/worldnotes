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
