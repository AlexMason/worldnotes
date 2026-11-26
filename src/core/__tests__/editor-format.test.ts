import { describe, it, expect } from 'vitest'
import { toggleWrap, toggleList, activeFormats } from '../editor-format'
import { defaultPlugins } from '../plugins/defaults'

const defs = defaultPlugins.flatMap((p) => p.tokens)

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

describe('toggleWrap with an asymmetric pair', () => {
  const wrap = (t: string, s: number, e: number) => toggleWrap(t, s, e, '<u>', '</u>')

  it('wraps and selects the inner content', () => {
    expect(wrap('foo bar', 0, 3)).toEqual({ text: '<u>foo</u> bar', start: 3, end: 6 })
  })

  it('collapsed caret inserts the empty pair with the caret between', () => {
    expect(wrap('xy', 1, 1)).toEqual({ text: 'x<u></u>y', start: 4, end: 4 })
  })

  it('second press unwraps with correct offsets (outside markers)', () => {
    const a = wrap('foo bar', 0, 3)
    expect(wrap(a.text, a.start, a.end)).toEqual({ text: 'foo bar', start: 0, end: 3 })
  })

  it('unwraps when the selection carries both markers', () => {
    expect(wrap('<u>foo</u>', 0, 10)).toEqual({ text: 'foo', start: 0, end: 3 })
  })

  it('caret between the pair unwraps to nothing', () => {
    expect(wrap('<u></u>', 3, 3)).toEqual({ text: '', start: 0, end: 0 })
  })
})

describe('toggleList', () => {
  it('adds a bullet to a plain line, collapsed caret keeps its place in the text', () => {
    expect(toggleList('hello', 3, 3)).toEqual({ text: '- hello', start: 5, end: 5 })
  })

  it('removes the bullet when the line already is one', () => {
    expect(toggleList('- hello', 5, 5)).toEqual({ text: 'hello', start: 3, end: 3 })
  })

  it('caret in the marker clamps to the start of the content on removal', () => {
    expect(toggleList('- hello', 1, 1)).toEqual({ text: 'hello', start: 0, end: 0 })
  })

  it('keeps indentation on add and remove', () => {
    const added = toggleList('  nested', 4, 4)!
    expect(added.text).toBe('  - nested')
    expect(toggleList(added.text, added.start, added.end)!.text).toBe('  nested')
  })

  it('a range over mixed lines turns every non-blank line into a bullet and selects the block', () => {
    const text = 'a\n\nb\n* c'
    const r = toggleList(text, 0, text.length)!
    expect(r.text).toBe('- a\n\n- b\n* c')
    expect(r.start).toBe(0)
    expect(r.end).toBe(r.text.length)
  })

  it('removes bullets only when every target is a bullet (blank lines ignored)', () => {
    const text = '- a\n\n+ b'
    expect(toggleList(text, 0, text.length)!.text).toBe('a\n\nb')
  })

  it('swaps numbered markers for bullets instead of nesting them', () => {
    expect(toggleList('1. one\n2. two', 0, 13)!.text).toBe('- one\n- two')
  })

  it('skips block-region lines and no-ops when nothing is left', () => {
    const text = 'p\n```\ncode\n```'
    const r = toggleList(text, 0, text.length, new Set([1, 2, 3]))!
    expect(r.text).toBe('- p\n```\ncode\n```')
    expect(toggleList('```\ncode\n```', 0, 12, new Set([0, 1, 2]))).toBeNull()
  })

  it('a selection ending at the next line start does not touch that line', () => {
    const text = 'a\nb'
    expect(toggleList(text, 0, 2)!.text).toBe('- a\nb')
  })

  it('blank caret line is a no-op', () => {
    expect(toggleList('a\n\nb', 2, 2)).toBeNull()
  })

  it('round-trips: add then remove restores the text', () => {
    const text = 'one\ntwo'
    const a = toggleList(text, 0, text.length)!
    expect(toggleList(a.text, a.start, a.end)!.text).toBe(text)
  })
})

describe('activeFormats', () => {
  const at = (text: string, s: number, e = s) => activeFormats(text, s, e, defs)

  it('reports bold/italic/underline/link/wiki-link around a caret', () => {
    expect(at('a **b** c', 5).bold).toBe(true)
    expect(at('a *b* c', 4).italic).toBe(true)
    expect(at('a <u>b</u> c', 6).underline).toBe(true)
    expect(at('a [b](https://x.test) c', 5).link).toBe(true)
    expect(at('a [[page|b]] c', 6).link).toBe(true)
  })

  it('outer edges of a token are outside; markers count as inside', () => {
    expect(at('**b**', 0).bold).toBe(false)
    expect(at('**b**', 5).bold).toBe(false)
    expect(at('**b**', 1).bold).toBe(true)
    expect(at('**b**', 4).bold).toBe(true)
  })

  it('a range inside, or exactly on, the token is active', () => {
    expect(at('x **bold** y', 4, 8).bold).toBe(true) // the inner text
    expect(at('x **bold** y', 2, 10).bold).toBe(true) // the whole token
    expect(at('x **bold** y', 0, 6).bold).toBe(false) // straddles the start
  })

  it('plain text and other tokens leave the flags off', () => {
    const r = at('plain **b** text', 2)
    expect(r).toEqual({ bold: false, italic: false, underline: false, link: false, list: false })
  })

  it('list: bullet lines are active, numbered are not; content is re-scanned', () => {
    expect(at('- item', 3).list).toBe(true)
    expect(at('1. item', 4).list).toBe(false)
    const r = at('- a **b** c', 7)
    expect(r.list).toBe(true)
    expect(r.bold).toBe(true)
  })

  it('multi-line selections report only the list state', () => {
    const text = '- a\n- **b**'
    const r = at(text, 0, text.length)
    expect(r).toEqual({ bold: false, italic: false, underline: false, link: false, list: true })
    expect(at('- a\nb', 0, 5).list).toBe(false)
  })

  it('tokens on other lines never leak', () => {
    expect(at('**a**\nplain', 8).bold).toBe(false)
  })
})

describe('activeFormats list state with block lines', () => {
  it('agrees with toggleList: fenced lines are not part of the decision', () => {
    const text = '- a\n```\ncode\n```'
    const skip = new Set([1, 2, 3])
    expect(activeFormats(text, 0, text.length, defs).list).toBe(false) // fence counted
    expect(activeFormats(text, 0, text.length, defs, skip).list).toBe(true)
    // …and pressing the button therefore REMOVES the bullet, as the state says
    expect(toggleList(text, 0, text.length, skip)!.text).toBe('a\n```\ncode\n```')
  })
})
