// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import {
  getLineOffset,
  setLineOffset,
  tryGetLineOffset,
  getSelectionOffsets,
  setSelectionOffsets,
} from '../caret-offset'

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

// ─── Regression: data-raw element handling ─────────────────────────────────────

describe('data-raw elements (wiki links)', () => {
  function buildRow(el: HTMLElement, items: (string | { raw: string; dom: string })[]): void {
    const container = document.createElement('div')
    container.dataset.line = '0'
    for (const item of items) {
      if (typeof item === 'string') {
        container.appendChild(document.createTextNode(item))
      } else {
        const span = document.createElement('span')
        span.dataset.raw = item.raw
        span.textContent = item.dom
        container.appendChild(span)
      }
    }
    el.appendChild(container)
  }

  it('getLineOffset counts raw length of data-raw elements', () => {
    const el = document.createElement('div')
    // "Hello [[world]] !"
    buildRow(el, ['Hello ', { raw: '[[world]]', dom: 'world' }, ' !'])
    // Cursor at end of ' !' . Raw total: Hello (6) + [[world]] (9) + ! (2) = 17
    const lastText = el.querySelector('[data-line="0"]')!.lastChild as Text
    setCaretAt(lastText, lastText.length)
    const offset = getLineOffset(el)
    expect(offset).toBe(17)
  })

  it('getLineOffset adds raw length when cursor is after data-raw element', () => {
    const el = document.createElement('div')
    buildRow(el, [{ raw: '[[hello]]', dom: 'hello' }, ' world'])
    // Cursor at end of ' world'. Raw total: [[hello]] (9) + world (6) = 15
    const lastText = el.querySelector('[data-line="0"]')!.lastChild as Text
    setCaretAt(lastText, lastText.length)
    const offset = getLineOffset(el)
    expect(offset).toBe(15)
  })

  it('setLineOffset round-trips past data-raw elements', () => {
    const el = document.createElement('div')
    buildRow(el, ['before ', { raw: '[[mid]]', dom: 'mid' }, ' after'])
    // Raw total: "before " (7) + "[[mid]]" (7) + " after" (6) = 20
    // Set cursor at raw offset 9 (inside "[[mid]]", close to start)
    setLineOffset(el, 17) // end of " after" (7 + 7 + 3 = 17 → wait let me recalculate)
    // Actually: "before " = 7, "[[mid]]" = 7, " after" = 6, total = 20
    // offset 17 = 7 + 7 + 3 = within " after" at DOM offset 3
    const after = getLineOffset(el)
    expect(after).toBe(17)
  })

  it('setLineOffset handles data-raw for cursor at end of line', () => {
    const el = document.createElement('div')
    buildRow(el, ['start ', { raw: '[[end]]', dom: 'end' }])
    // "start " = 6, "[[end]]" = 7, total = 13
    setLineOffset(el, 13)
    const after = getLineOffset(el)
    expect(after).toBe(13)
  })

  it('getLineOffset counts raw length when cursor is inside data-raw element', () => {
    const el = document.createElement('div')
    buildRow(el, [{ raw: '[[hello]]', dom: 'hello' }])
    // Place cursor at DOM offset 2 inside "hello" (between 'l' and 'l')
    const span = el.querySelector('[data-raw]')!
    const textNode = span.firstChild as Text
    setCaretAt(textNode, 2)
    // getLineOffset should compute raw-length-aware offset
    const offset = getLineOffset(el)
    // "[[he" is raw offset 4, but the DOM offset 2 maps to raw ~4
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThanOrEqual(9)
  })
})

// ─── Regression: cursor on \n text nodes between containers ─────────────────────

describe('cursor on \\n text nodes between containers', () => {
  it('getLineOffset resolves \\n node to start of next line', () => {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'hello'
    el.appendChild(line0)

    const newlineNode = document.createTextNode('\n')
    el.appendChild(newlineNode)

    const line1 = document.createElement('div')
    line1.dataset.line = '1'
    line1.textContent = 'world'
    el.appendChild(line1)

    // Place cursor on the \n text node at offset 0
    setCaretAt(newlineNode, 0)

    // getLineOffset should resolve to start of line 1
    // "hello\n" = 6, so offset 6 = start of "world"
    const offset = getLineOffset(el)
    expect(offset).toBe(6)

    // Restore cursor via setLineOffset — cursor should land in line1
    setLineOffset(el, offset)
    const sel = window.getSelection()!
    const range = sel.getRangeAt(0)
    expect(range.startContainer).toBe(line1.firstChild)
    expect(range.startOffset).toBe(0)
  })

  it('cursor can move from \\n node back to end of previous line', () => {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'hello'
    el.appendChild(line0)

    const newlineNode = document.createTextNode('\n')
    el.appendChild(newlineNode)

    const line1 = document.createElement('div')
    line1.dataset.line = '1'
    line1.textContent = 'world'
    el.appendChild(line1)

    // Place cursor on the \n text node at offset 0
    setCaretAt(newlineNode, 0)

    // Simulate "going backward" — place at end of line 0 (offset 5)
    setLineOffset(el, 5)
    const sel = window.getSelection()!
    const range = sel.getRangeAt(0)
    expect(range.startContainer).toBe(line0.firstChild)
    expect(range.startOffset).toBe(5) // end of "hello"
  })
})

describe('tryGetLineOffset — unrecognized selections return null', () => {
  function buildEditor(): HTMLElement {
    const el = document.createElement('div')
    const line0 = document.createElement('div')
    line0.dataset.line = '0'
    line0.textContent = 'hello'
    el.appendChild(line0)
    const line1 = document.createElement('div')
    line1.dataset.line = '1'
    line1.textContent = 'world'
    el.appendChild(line1)
    return el
  }

  it('returns null when the selection has no ranges', () => {
    const el = buildEditor()
    const sel = window.getSelection()!
    sel.removeAllRanges()
    expect(tryGetLineOffset(el)).toBeNull()
  })

  it('returns null when the selection is anchored outside the editor', () => {
    const el = buildEditor()
    const outside = document.createElement('p')
    outside.textContent = 'page chrome text'
    document.body.appendChild(outside)

    setCaretAt(outside.firstChild!, 4)
    expect(tryGetLineOffset(el)).toBeNull()

    document.body.removeChild(outside)
  })

  it('getLineOffset keeps its legacy 0 default for unknown selections', () => {
    const el = buildEditor()
    const sel = window.getSelection()!
    sel.removeAllRanges()
    expect(getLineOffset(el)).toBe(0)
  })

  it('returns the offset for a valid in-editor selection', () => {
    const el = buildEditor()
    const line1 = el.children[1] as HTMLElement
    setCaretAt(line1.firstChild!, 2)
    expect(tryGetLineOffset(el)).toBe(5 + 1 + 2) // hello + newline + wo
  })
})

// ─── Two-ended selection mapping (get/setSelectionOffsets) ─────────────────
describe('getSelectionOffsets / setSelectionOffsets', () => {
  // raw: "alpha\nbeta\n[[gamma]] delta\nepsilon"
  // line starts: 0, 6, 11, 27 — total raw length 34
  function buildMultiLine(): HTMLElement {
    const el = document.createElement('div')
    const mk = (idx: number): HTMLElement => {
      const d = document.createElement('div')
      d.dataset.line = String(idx)
      el.appendChild(d)
      return d
    }
    mk(0).textContent = 'alpha'
    mk(1).textContent = 'beta'
    const l2 = mk(2)
    const span = document.createElement('span')
    span.dataset.raw = '[[gamma]]' // 9 raw chars, 5 DOM chars → raw 17..19 dead zone
    span.textContent = 'gamma'
    l2.appendChild(span)
    l2.appendChild(document.createTextNode(' delta'))
    mk(3).textContent = 'epsilon'
    return el
  }

  function setSel(sc: Node, so: number, ec: Node, eo: number): void {
    const range = document.createRange()
    range.setStart(sc, so)
    range.setEnd(ec, eo)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  }

  it('maps a plain multi-line selection to raw start/end', () => {
    const el = buildMultiLine()
    const line0 = el.children[0] as HTMLElement
    const line1 = el.children[1] as HTMLElement
    setSel(line0.firstChild!, 3, line1.firstChild!, 3)
    expect(getSelectionOffsets(el)).toEqual({ start: 3, end: 9 })
  })

  it('respects data-raw lengths on both ends of a selection', () => {
    const el = buildMultiLine()
    const line2 = el.children[2] as HTMLElement
    const span = line2.querySelector('[data-raw]') as HTMLElement
    const tail = line2.lastChild as Text
    setSel(line2.firstChild!, 0, tail, 6)
    expect(getSelectionOffsets(el)).toEqual({ start: 11, end: 26 })
    setSel(span.firstChild!, 3, span.firstChild!, 5)
    expect(getSelectionOffsets(el)).toEqual({ start: 14, end: 16 })
  })

  it('root-anchored end maps to true document end, not raw.length + 1 (end bias)', () => {
    const el = buildMultiLine()
    const line0 = el.children[0] as HTMLElement
    setSel(line0.firstChild!, 0, el, el.children.length)
    expect(getSelectionOffsets(el)).toEqual({ start: 0, end: 34 })
  })

  it('wrapper-anchored end maps to the covered region end, not its start (end bias)', () => {
    // editor > [line0, wrapper(line1, line2), line3]
    const el = document.createElement('div')
    const l0 = document.createElement('div')
    l0.dataset.line = '0'
    l0.textContent = 'import x'
    el.appendChild(l0)
    const wrapper = document.createElement('div')
    wrapper.dataset.block = 'fence'
    const wl0 = document.createElement('div')
    wl0.dataset.line = '1'
    wl0.textContent = '```'
    wrapper.appendChild(wl0)
    const wl1 = document.createElement('div')
    wl1.dataset.line = '2'
    wl1.textContent = 'code here'
    wrapper.appendChild(wl1)
    el.appendChild(wrapper)
    const l3 = document.createElement('div')
    l3.dataset.line = '3'
    l3.textContent = 'tail'
    el.appendChild(l3)
    // raw: "import x\n```\ncode here\ntail" → 27; line starts 0, 9, 13, 23
    setSel(l0.firstChild!, 0, wrapper, wrapper.children.length)
    // Start bias on l0 text → 0; end bias on wrapper at child n → end of its
    // last line child (13 + 9 = 22), NOT the region start (9) the start bias
    // fallback would give.
    expect(getSelectionOffsets(el)).toEqual({ start: 0, end: 22 })
  })

  it('null when either boundary is outside the editor', () => {
    // outside FIRST so a range spanning outside→editor is not collapsed by
    // the spec's end-precedes-start normalization (browsers do the same).
    const outside = document.createElement('p')
    outside.textContent = 'chrome'
    document.body.appendChild(outside)
    const el = buildMultiLine()
    document.body.appendChild(el)
    const line0 = el.children[0] as HTMLElement
    setSel(line0.firstChild!, 0, outside.firstChild!, 2)
    expect(getSelectionOffsets(el)).toBeNull()
    setSel(outside.firstChild!, 0, line0.firstChild!, 2)
    expect(getSelectionOffsets(el)).toBeNull()
    document.body.removeChild(outside)
    document.body.removeChild(el)
  })

  it('null when there is no selection', () => {
    const el = buildMultiLine()
    const sel = window.getSelection()!
    sel.removeAllRanges()
    expect(getSelectionOffsets(el)).toBeNull()
  })

  it('collapsed pair behaves like setLineOffset', () => {
    const el = buildMultiLine()
    setSelectionOffsets(el, 7, 7)
    expect(getSelectionOffsets(el)).toEqual({ start: 7, end: 7 })
    expect(window.getSelection()!.isCollapsed).toBe(true)
  })

  describe('setSelectionOffsets → getSelectionOffsets round trip', () => {
    const dead = new Set([17, 18, 19]) // trailing glyphs of [[gamma]]
    const clamp = (o: number): number => (dead.has(o) ? 16 : o)
    const reachable: number[] = []
    for (let i = 0; i <= 34; i++) if (!dead.has(i)) reachable.push(i)

    it('round-trips every reachable offset pair (incl. line/data-raw boundaries)', () => {
      const el = buildMultiLine()
      for (const a of reachable) {
        for (const b of reachable) {
          if (b < a) continue
          setSelectionOffsets(el, a, b)
          const got = getSelectionOffsets(el)
          expect(got, `(${a}, ${b})`).not.toBeNull()
          expect(got!.start, `start for (${a}, ${b})`).toBe(clamp(a))
          expect(got!.end, `end for (${a}, ${b})`).toBe(clamp(b))
          // Stability: re-placing the mapped-back pair is exact.
          setSelectionOffsets(el, got!.start, got!.end)
          expect(getSelectionOffsets(el)).toEqual({ start: clamp(a), end: clamp(b) })
        }
      }
    })
  })
})
