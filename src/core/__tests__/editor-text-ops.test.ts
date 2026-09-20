import { describe, it, expect } from 'vitest'
import {
  selectedLineRange,
  moveLines,
  duplicateLines,
  deleteLines,
  deleteWordLeft,
  moveWord,
  wordExtend,
} from '../editor-text-ops'

// Fixture offsets for "alpha\nbeta\ngamma":
//   a0 l1 p2 h3 a4 \n5 b6 e7 t8 a9 \n10 g11 a12 m13 m14 a15
const DOC = 'alpha\nbeta\ngamma'

describe('selectedLineRange', () => {
  it('collapsed caret touches its own line only', () => {
    expect(selectedLineRange(DOC, 7, 7)).toEqual({ firstLine: 1, lastLine: 1, startCol: 1, endCol: 1 })
  })

  it('intra-line selection keeps columns', () => {
    expect(selectedLineRange(DOC, 1, 4)).toEqual({ firstLine: 0, lastLine: 0, startCol: 1, endCol: 4 })
  })

  it('multi-line selection spans touched lines', () => {
    const r = selectedLineRange(DOC, 2, 13)
    expect(r.firstLine).toBe(0)
    expect(r.lastLine).toBe(2)
    expect(r.startCol).toBe(2)
    expect(r.endCol).toBe(2)
  })

  it('boundary rule: an end exactly at a line start does not touch that line', () => {
    const r = selectedLineRange(DOC, 2, 6) // ends at line 1 start
    expect(r.lastLine).toBe(0)
    expect(r.endCol).toBe(5)
  })

  it('boundary rule keeps the following selection intact', () => {
    // Selection ending at a line start covers exactly the previous line
    const r = selectedLineRange(DOC, 0, 11) // ends at line 2 start
    expect(r.lastLine).toBe(1)
    expect(r.endCol).toBe(4)
  })

  it('clamps out-of-range offsets', () => {
    expect(() => selectedLineRange(DOC, -50, 9999)).not.toThrow()
    const r = selectedLineRange(DOC, -50, 9999)
    expect(r.firstLine).toBe(0)
    expect(r.lastLine).toBe(2)
    expect(r.endCol).toBe(5) // clamped to line 2's length
  })
})

describe('moveLines', () => {
  it('moves the caret line down, keeping the caret column', () => {
    // lines: alpha(0) beta(1) gamma(2); caret 7 = line 1 col 1 → down
    const r = moveLines(DOC, 7, 7, 1)!
    expect(r.text).toBe('alpha\ngamma\nbeta')
    expect(r.start).toBe(13) // new line 2 starts at 12, caret col 1
    expect(r.end).toBe(13)
  })

  it('moves the caret line up', () => {
    const r = moveLines(DOC, 7, 7, -1)!
    expect(r.text).toBe('beta\nalpha\ngamma')
    expect(r.start).toBe(1) // line 0 start 0 + col 1
  })

  it('moves a multi-line selection with the selection', () => {
    // Select "pha\nb" (2..7) — lines 0..1 → move down past "gamma"
    const r = moveLines(DOC, 2, 7, 1)!
    expect(r.text).toBe('gamma\nalpha\nbeta')
    expect(r.start).toBe(8) // moved block now lines 1..2: line 1 start 6 + startCol 2
    expect(r.end).toBe(13) // endCol = 7-6 = 1 → line 2 start 12 + 1
  })

  it('returns null at document edges', () => {
    expect(moveLines(DOC, 0, 0, -1)).toBeNull() // first line up
    expect(moveLines(DOC, 15, 15, 1)).toBeNull() // last line down
    expect(moveLines('only line', 2, 2, 1)).toBeNull()
    expect(moveLines('only line', 2, 2, -1)).toBeNull()
  })

  it('no-op equality never happens when a swap is possible with empty neighbor', () => {
    const r = moveLines('line\n', 0, 0, 1)!
    expect(r.text).toBe('\nline')
  })

  it('moving a block down into the last line works', () => {
    const r = moveLines(DOC, 0, 6, 1)! // lines 0 (+boundary rule) — 0..5? [0,6) ends at \n → normEnd 5 → lines 0..0
    expect(r.text).toBe('beta\nalpha\ngamma')
  })

  it('repeated moves round-trip (down then up restores text and selection)', () => {
    const a = moveLines(DOC, 7, 7, 1)!
    const b = moveLines(a.text, a.start, a.end, -1)!
    expect(b.text).toBe(DOC)
    expect(b.start).toBe(7)
    expect(b.end).toBe(7)
  })
})

describe('duplicateLines', () => {
  it('duplicates the caret line below and selects the copy', () => {
    const r = duplicateLines(DOC, 7, 7)
    expect(r.text).toBe('alpha\nbeta\nbeta\ngamma')
    expect(r.start).toBe(12) // copy is line 2, starts at 11; caret col 1
    expect(r.end).toBe(12)
  })

  it('duplicates a multi-line block and the selection covers the copy', () => {
    const r = duplicateLines(DOC, 0, DOC.length) // whole document [0,15)
    expect(r.text).toBe(DOC + '\n' + DOC)
    // startCol 0 on new first line (start 16), endCol 5 on new last line (start 27+5)
    expect(r.text.slice(r.start, r.end)).toBe('alpha\nbeta\ngamma')
  })
})

describe('deleteLines', () => {
  it('deletes the caret line and lands at the replacing line start', () => {
    const r = deleteLines(DOC, 7, 7)
    expect(r.text).toBe('alpha\ngamma')
    expect(r.start).toBe(6)
    expect(r.end).toBe(6)
  })

  it('deleting the last line lands on the new last line', () => {
    const r = deleteLines(DOC, 15, 15)
    expect(r.text).toBe('alpha\nbeta')
    expect(r.start).toBe(6)
  })

  it('deleting everything leaves one empty line', () => {
    const r = deleteLines(DOC, 0, DOC.length)
    expect(r.text).toBe('')
    expect(r.start).toBe(0)
  })

  it('deletes a multi-line selection block', () => {
    const r = deleteLines(DOC, 2, 13)
    expect(r.text).toBe('')
    expect(r.start).toBe(0)
  })
})

describe('deleteWordLeft', () => {
  it('deletes a word run leftward', () => {
    const r = deleteWordLeft('hello world', 11)
    expect(r.text).toBe('hello ')
    expect(r.offset).toBe(6)
  })

  it('treats punctuation as its own run', () => {
    const r = deleteWordLeft('foo--bar', 8)
    expect(r.text).toBe('foo--')
    expect(r.offset).toBe(5)
    const r2 = deleteWordLeft('foo--bar', 5) // delete the '--' run
    expect(r2.text).toBe('foobar')
    expect(r2.offset).toBe(3)
  })

  it('deletes a whitespace run (stops at line start)', () => {
    const r = deleteWordLeft('hello   ', 8)
    expect(r.text).toBe('hello')
    expect(r.offset).toBe(5)
    const none = deleteWordLeft('   x', 3)
    expect(none.text).toBe('x')
    expect(none.offset).toBe(0)
  })

  it('at a line start joins with the previous line', () => {
    const r = deleteWordLeft(DOC, 6) // start of "beta"
    expect(r.text).toBe('alphabeta\ngamma') // joins lines
    expect(r.offset).toBe(5)
  })

  it('at document start is a no-op', () => {
    const r = deleteWordLeft(DOC, 0)
    expect(r.text).toBe(DOC)
    expect(r.offset).toBe(0)
  })

  it('never crosses a line break from mid-line', () => {
    const r = deleteWordLeft(DOC, 7) // 'b'|eta
    expect(r.text).toBe('alpha\neta\ngamma')
    expect(r.offset).toBe(6)
  })

  it('stops deleting the previous line even for whitespace-only current prefix', () => {
    const r = deleteWordLeft('ab\ncd', 3) // caret at start of line 1 → join
    expect(r.text).toBe('abcd')
    expect(r.offset).toBe(2)
  })
})

describe('moveWord', () => {
  it('forward lands at the next run start, skipping separators', () => {
    expect(moveWord('foo bar baz', 0, 'forward')).toBe(4)
    expect(moveWord('foo bar baz', 4, 'forward')).toBe(8)
    expect(moveWord('foo bar baz', 8, 'forward')).toBe(11)
  })

  it('backward lands at the previous run start', () => {
    expect(moveWord('foo bar baz', 11, 'backward')).toBe(8)
    expect(moveWord('foo bar baz', 8, 'backward')).toBe(4)
    expect(moveWord('foo bar baz', 4, 'backward')).toBe(0)
  })

  it('backward from trailing whitespace jumps to the previous word start', () => {
    expect(moveWord('foo   ', 6, 'backward')).toBe(0)
  })

  it('crosses line breaks (document-scoped motion)', () => {
    expect(moveWord(DOC, 1, 'forward')).toBe(6) // alpha → beta start
    expect(moveWord(DOC, 6, 'backward')).toBe(0) // beta start → alpha start
    expect(moveWord(DOC, 0, 'forward')).toBe(6)
    expect(moveWord(DOC, 6, 'forward')).toBe(11)
  })

  it('clamps at document edges', () => {
    expect(moveWord(DOC, 0, 'backward')).toBe(0)
    expect(moveWord(DOC, DOC.length, 'forward')).toBe(DOC.length)
    expect(moveWord('', 0, 'forward')).toBe(0)
  })

  it('punctuation runs step independently', () => {
    // 'hello' word-run → skip no space → stop before ','
    expect(moveWord('hello, world', 0, 'forward')).toBe(5)
    // ',' punctuation run, then skip the space → next run start
    expect(moveWord('hello, world', 5, 'forward')).toBe(7)
    expect(moveWord('a.bb', 1, 'forward')).toBe(2) // consume '.', stop before 'bb'
    expect(moveWord('a.bb', 2, 'forward')).toBe(4) // consume 'bb'
  })
})

describe('wordExtend', () => {
  it('extends forward from the end focus', () => {
    expect(wordExtend(DOC, 0, 1, 'end', 'forward')).toEqual({ start: 0, end: 6 })
  })

  it('extends backward from the start focus', () => {
    expect(wordExtend(DOC, 11, 13, 'start', 'backward')).toEqual({ start: 6, end: 13 })
  })

  it('shrinks when focus moves toward the anchor', () => {
    // focus 13 (inside 'gamma', g starts 11) backs to the run start
    expect(wordExtend(DOC, 0, 13, 'end', 'backward')).toEqual({ start: 0, end: 11 })
  })

  it('normalizes when the focus crosses the anchor', () => {
    expect(wordExtend(DOC, 0, 2, 'start', 'backward')).toEqual({ start: 0, end: 2 }) // start stays 0
    const r = wordExtend(DOC, 7, 13, 'start', 'forward')
    expect(r).toEqual({ start: 11, end: 13 }) // crossed: anchor 13, focus→11
  })
})
