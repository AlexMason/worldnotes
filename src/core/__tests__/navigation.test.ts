import { describe, it, expect } from 'vitest'
import { parseWikiLink, pageDisplayName } from '../navigation'

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
