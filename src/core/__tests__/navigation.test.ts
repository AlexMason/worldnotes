import { describe, it, expect } from 'vitest'
import { parseWikiLink, pageDisplayName, encodePathSearch, decodePathSearch } from '../navigation'

// ─── parseWikiLink ────────────────────────────────────────────────────────────

describe('parseWikiLink', () => {
  it('uses the final path segment as wiki link display text', () => {
    expect(parseWikiLink('projects/acme')).toEqual({
      page: 'projects/acme',
      display: 'acme',
    })
  })

  it('supports Obsidian-style custom wiki link display text', () => {
    expect(parseWikiLink('projects/acme|Client Portal')).toEqual({
      page: 'projects/acme',
      display: 'Client Portal',
    })
  })

  it('falls back to pageDisplayName when display text after pipe is empty', () => {
    expect(parseWikiLink('projects/acme|')).toEqual({
      page: 'projects/acme',
      display: 'acme',
    })
  })

  it('handles wiki link with only a page name', () => {
    expect(parseWikiLink('home')).toEqual({
      page: 'home',
      display: 'home',
    })
  })
})

// ─── pageDisplayName ──────────────────────────────────────────────────────────

describe('pageDisplayName', () => {
  it('uses the final path segment for breadcrumb labels', () => {
    expect(pageDisplayName('projects/acme')).toBe('acme')
  })

  it('returns the original string when there is no path separator', () => {
    expect(pageDisplayName('home')).toBe('home')
  })

  it('returns empty string for empty input', () => {
    expect(pageDisplayName('')).toBe('')
  })

  it('returns empty string for slashes-only input', () => {
    // '///'.trim() → '', .replace(/\/+$/,'') → '', split/filter → [] → ?? '' → ''
    expect(pageDisplayName('///')).toBe('')
  })
})

// ─── encodePathSearch ─────────────────────────────────────────────────────────

describe('encodePathSearch', () => {
  it('serializes breadcrumb trail', () => {
    expect(encodePathSearch('?theme=dark', ['home', 'projects', 'acme'])).toBe(
      '?theme=dark&path=home/projects/acme',
    )
  })

  it('handles empty trail by producing only the path key', () => {
    expect(encodePathSearch('?theme=dark', [])).toBe('?theme=dark&path=')
  })

  it('handles search string without leading question mark', () => {
    expect(encodePathSearch('theme=dark', ['home'])).toBe('?theme=dark&path=home')
  })
})

// ─── decodePathSearch ─────────────────────────────────────────────────────────

describe('decodePathSearch', () => {
  it('restores breadcrumb trail', () => {
    expect(decodePathSearch('?theme=dark&path=home/projects/acme')).toEqual([
      'home',
      'projects',
      'acme',
    ])
  })

  it('handles page names with encoded characters', () => {
    expect(decodePathSearch('?theme=dark&path=home/my%20page')).toEqual([
      'home',
      'my page',
    ])
  })

  it('returns empty array when no path parameter exists', () => {
    expect(decodePathSearch('?theme=dark')).toEqual([])
  })

  it('returns empty array when path parameter has no value', () => {
    expect(decodePathSearch('?path=')).toEqual([])
  })

  it('returns empty array for empty search string', () => {
    expect(decodePathSearch('')).toEqual([])
  })

  it('returns empty array when path param has no equals sign', () => {
    expect(decodePathSearch('?path')).toEqual([])
  })
})
