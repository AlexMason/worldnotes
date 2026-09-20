import { describe, it, expect } from 'vitest'
import { composeDocTitle } from '../doc-title'

describe('composeDocTitle', () => {
  it('suffixes the site name with an em dash', () => {
    expect(composeDocTitle('Hello There', 'My Wiki')).toBe('Hello There — My Wiki')
  })

  it('is the bare site name when the page title already is it (index/home)', () => {
    expect(composeDocTitle('My Wiki', 'My Wiki')).toBe('My Wiki')
  })

  it('leaves the title untouched when no site name is set', () => {
    expect(composeDocTitle('Hello There', '')).toBe('Hello There')
  })
})
