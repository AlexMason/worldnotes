// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import {
  parseListItem,
  isBulletMarker,
  nextMarker,
  indentLine,
  dedentLine,
  getLineAtOffset,
  replaceLine,
  insertAtOffset,
} from '../editor-indentation'

describe('parseListItem', () => {
  it('parses a dash list item', () => {
    const result = parseListItem('- milk')
    expect(result).toEqual({ indent: '', marker: '-', content: 'milk' })
  })

  it('parses an asterisk list item', () => {
    const result = parseListItem('* eggs')
    expect(result).toEqual({ indent: '', marker: '*', content: 'eggs' })
  })

  it('parses a plus list item', () => {
    const result = parseListItem('+ butter')
    expect(result).toEqual({ indent: '', marker: '+', content: 'butter' })
  })

  it('parses an indented list item', () => {
    const result = parseListItem('  - nested')
    expect(result).toEqual({ indent: '  ', marker: '-', content: 'nested' })
  })

  it('parses a deeply indented list item', () => {
    const result = parseListItem('    * deep')
    expect(result).toEqual({ indent: '    ', marker: '*', content: 'deep' })
  })

  it('returns null for non-list lines', () => {
    expect(parseListItem('plain text')).toBeNull()
    expect(parseListItem('# heading')).toBeNull()
    expect(parseListItem('> quote')).toBeNull()
    expect(parseListItem('')).toBeNull()
  })

  it('returns null for marker without space', () => {
    expect(parseListItem('-no-space')).toBeNull()
  })

  it('parses ordered markers as typed (D1)', () => {
    expect(parseListItem('1. one')).toEqual({ indent: '', marker: '1.', content: 'one' })
    expect(parseListItem('  a. alpha')).toEqual({ indent: '  ', marker: 'a.', content: 'alpha' })
    expect(parseListItem('II. roman')).toEqual({ indent: '', marker: 'II.', content: 'roman' })
    expect(parseListItem('e.g. example')).toBeNull() // no space after 'e.'
  })

  it('isBulletMarker discriminates bullets from ordered markers', () => {
    expect(isBulletMarker('-')).toBe(true)
    expect(isBulletMarker('*')).toBe(true)
    expect(isBulletMarker('+')).toBe(true)
    expect(isBulletMarker('1.')).toBe(false)
    expect(isBulletMarker('a.')).toBe(false)
  })

  it('nextMarker continues ordered sequences (user feedback)', () => {
    // numeric
    expect(nextMarker('1.')).toBe('2.')
    expect(nextMarker('9.')).toBe('10.')
    expect(nextMarker('12.')).toBe('13.')
    // alpha (case preserved; z overflows to repeat)
    expect(nextMarker('a.')).toBe('b.')
    expect(nextMarker('b.')).toBe('c.') // c stays ALPHA (a→b→c runs)
    expect(nextMarker('A.')).toBe('B.')
    expect(nextMarker('z.')).toBe('z.')
    // roman starts: i/v/x resolve roman (i→ii per feedback)
    expect(nextMarker('i.')).toBe('ii.')
    expect(nextMarker('I.')).toBe('II.')
    expect(nextMarker('v.')).toBe('vi.')
    expect(nextMarker('x.')).toBe('xi.')
    // multi-char roman always roman
    expect(nextMarker('iv.')).toBe('v.')
    expect(nextMarker('IX.')).toBe('X.')
    expect(nextMarker('ii.')).toBe('iii.')
    expect(nextMarker('xxxix.')).toBe('xl.')
    // c/d/l/m stay alpha (lists starting at roman 100/500/50/1000 are rare;
    // a.→b.→c.→d. continuity matters more)
    expect(nextMarker('c.')).toBe('d.')
    expect(nextMarker('m.')).toBe('n.')
    // bullets unchanged
    expect(nextMarker('-')).toBe('-')
    expect(nextMarker('+')).toBe('+')
  })

  it('returns null for marker with only space and no content', () => {
    // Actually "- " IS a valid list item with empty content
    const result = parseListItem('- ')
    expect(result).not.toBeNull()
    expect(result!.content).toBe('')
  })

  it('handles multiple spaces after marker', () => {
    const result = parseListItem('-   extra spaces')
    expect(result).toEqual({ indent: '', marker: '-', content: '  extra spaces' })
  })
})

describe('indentLine', () => {
  it('adds two spaces to a line', () => {
    expect(indentLine('- item')).toBe('  - item')
  })

  it('adds two spaces to an already indented line', () => {
    expect(indentLine('  - item')).toBe('    - item')
  })

  it('handles empty string', () => {
    expect(indentLine('')).toBe('  ')
  })
})

describe('dedentLine', () => {
  it('removes two leading spaces', () => {
    expect(dedentLine('  - item')).toBe('- item')
  })

  it('removes two spaces from deeply indented line', () => {
    expect(dedentLine('    - item')).toBe('  - item')
  })

  it('returns null when fewer than 2 leading spaces', () => {
    expect(dedentLine('- item')).toBeNull()
    expect(dedentLine(' - item')).toBeNull()
    expect(dedentLine('')).toBeNull()
  })
})

describe('getLineAtOffset', () => {
  it('finds the first line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 0)
    expect(result.lineIndex).toBe(0)
    expect(result.lineStart).toBe(0)
    expect(result.lineText).toBe('- milk')
  })

  it('finds a middle line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 10)
    expect(result.lineIndex).toBe(1)
    expect(result.lineText).toBe('- eggs')
  })

  it('finds the last line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 20)
    expect(result.lineIndex).toBe(2)
    expect(result.lineText).toBe('- bread')
  })

  it('handles offset at newline character', () => {
    // Offset 6 is the '\n' after "- milk"
    const result = getLineAtOffset('- milk\n- eggs', 6)
    expect(result.lineIndex).toBe(1)
    expect(result.lineText).toBe('- eggs')
  })

  it('clamps offset beyond text length', () => {
    const result = getLineAtOffset('hello', 100)
    expect(result.lineIndex).toBe(0)
    expect(result.lineText).toBe('hello')
  })
})

describe('replaceLine', () => {
  it('replaces a line by index', () => {
    const result = replaceLine('a\nb\nc', 1, 'X')
    expect(result).toBe('a\nX\nc')
  })

  it('replaces the first line', () => {
    const result = replaceLine('a\nb\nc', 0, 'X')
    expect(result).toBe('X\nb\nc')
  })

  it('replaces the last line', () => {
    const result = replaceLine('a\nb\nc', 2, 'X')
    expect(result).toBe('a\nb\nX')
  })
})

describe('insertAtOffset', () => {
  it('inserts text at the beginning', () => {
    expect(insertAtOffset('world', 0, 'hello ')).toBe('hello world')
  })

  it('inserts text in the middle', () => {
    expect(insertAtOffset('hello world', 6, 'beautiful ')).toBe('hello beautiful world')
  })

  it('inserts text at the end', () => {
    expect(insertAtOffset('hello', 5, ' world')).toBe('hello world')
  })
})
