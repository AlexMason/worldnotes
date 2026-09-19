import { describe, it, expect } from 'vitest'
import { pageUrlPath, slugFromPath } from '../url-helpers'

describe('pageUrlPath', () => {
  it('encodes nested slugs', () => {
    expect(pageUrlPath('blog/first-post')).toBe('/blog/first-post')
  })
})

describe('slugFromPath', () => {
  it('reads a nested slug from a /{slug} path', () => {
    expect(slugFromPath('/blog/first-post')).toBe('blog/first-post')
  })
  it('maps / to home', () => {
    expect(slugFromPath('/')).toBe('home')
    expect(slugFromPath('')).toBe('home')
  })
  it('ignores trailing slashes', () => {
    expect(slugFromPath('/blog/')).toBe('blog')
  })
  it('decodes percent-encoded segments', () => {
    expect(slugFromPath('/my%20page')).toBe('my page')
  })
})
