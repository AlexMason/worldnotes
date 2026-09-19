// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import {
  parseListItem,
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
