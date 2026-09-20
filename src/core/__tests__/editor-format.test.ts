import { describe, it, expect } from 'vitest'
import { toggleWrap, wrapLink } from '../editor-format'

describe('toggleWrap', () => {
  it('wraps a selection and selects the inner content', () => {
    expect(toggleWrap('foo bar', 0, 3, '**')).toEqual({ text: '**foo** bar', start: 2, end: 5 })
  })

  it('collapsed caret inserts an empty pair with the caret between', () => {
    expect(toggleWrap('xy', 1, 1, '**')).toEqual({ text: 'x****y', start: 3, end: 3 })
  })

  it('unwraps when the markers sit just outside the selection (toggle)', () => {
    const r = toggleWrap('**foo** bar', 2, 5, '**')
    expect(r).toEqual({ text: 'foo bar', start: 0, end: 3 })
  })

  it('unwraps when the selection itself carries the markers', () => {
    const r = toggleWrap('**foo**', 0, 7, '**')
    expect(r).toEqual({ text: 'foo', start: 0, end: 3 })
  })

  it('caret sitting between a marker pair unwraps to nothing', () => {
    expect(toggleWrap('****', 2, 2, '**')).toEqual({ text: '', start: 0, end: 0 })
  })

  it('double press is an exact round trip', () => {
    const a = toggleWrap('text', 0, 4, '*')
    const b = toggleWrap(a.text, a.start, a.end, '*')
    expect(b).toEqual({ text: 'text', start: 0, end: 4 })
  })

  it('near-misses wrap rather than guess (undo reverts)', () => {
    // selecting only part of a bold span: wrap happens anyway, byte-safe
    const r = toggleWrap('**ab**', 2, 3, '**')
    expect(r.text).toBe('****a**b**')
  })

  it('single-char markers use the same rules', () => {
    expect(toggleWrap('hi there', 0, 2, '*')).toEqual({ text: '*hi* there', start: 1, end: 3 })
    expect(toggleWrap('*hi* there', 1, 3, '*')).toEqual({ text: 'hi there', start: 0, end: 2 })
  })

  it('clamps out-of-range selections', () => {
    expect(() => toggleWrap('abc', -5, 99, '**')).not.toThrow()
    const r = toggleWrap('abc', -5, 99, '**')
    expect(r.text).toBe('**abc**')
  })

  it('bold over an italic-wrapped range nests markers (no heuristic surgery)', () => {
    const italic = toggleWrap('word', 0, 4, '*') // '*word*', inner selected
    const bold = toggleWrap(italic.text, italic.start, italic.end, '**')
    expect(bold.text).toBe('***word***')
    expect(bold.start).toBe(3)
    expect(bold.end).toBe(7)
  })
})

describe('wrapLink', () => {
  it('wraps a selection and selects the empty URL slot', () => {
    const r = wrapLink('see foo here', 4, 7)
    expect(r.text).toBe('see [foo]() here')
    expect(r.text.slice(r.start, r.end)).toBe('')
    expect(r.start).toBe(10) // just after the '(' at index 9
  })

  it('collapsed caret creates []() with caret inside the parens', () => {
    const r = wrapLink('xy', 1, 1)
    expect(r.text).toBe('x[]()y')
    expect(r.start).toBe(4)
    expect(r.end).toBe(4)
  })

  it('a selection that is already a link re-selects its URL instead of double-wrapping', () => {
    const r = wrapLink('[foo](bar)', 0, 10)
    expect(r.text).toBe('[foo](bar)')
    expect(r.text.slice(r.start, r.end)).toBe('bar')
  })

  it('an empty existing link lands inside the parens', () => {
    const r = wrapLink('[]()', 0, 4)
    expect(r.text).toBe('[]()')
    expect(r.start).toBe(3)
    expect(r.end).toBe(3)
  })
})
