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
})

// ─── pageDisplayName ──────────────────────────────────────────────────────────

describe('pageDisplayName', () => {
  it('uses the final path segment for breadcrumb labels', () => {
    expect(pageDisplayName('projects/acme')).toBe('acme')
  })
})

// ─── encodePathSearch ─────────────────────────────────────────────────────────

describe('encodePathSearch', () => {
  it('serializes breadcrumb trail without flattening page path separators', () => {
    expect(encodePathSearch('?theme=dark', ['home', 'projects/acme'])).toBe(
      '?theme=dark&path=home/projects%2Facme',
    )
  })
})

// ─── decodePathSearch ─────────────────────────────────────────────────────────

describe('decodePathSearch', () => {
  it('restores breadcrumb trail while preserving slashes inside page names', () => {
    expect(
      decodePathSearch('?theme=dark&path=home/projects%2Facme'),
    ).toEqual(['home', 'projects/acme'])
  })
})
