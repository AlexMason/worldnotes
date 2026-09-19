import { describe, it, expect } from 'vitest'
import { slugify, validateSlug, wikiTargetToSlug, slugDisplayName } from '../slug'

describe('slugify', () => {
  it('folds titles into hyphenated segments', () => {
    expect(slugify('Blog Post')).toBe('blog-post')
    expect(slugify('  Weird   Title!! ')).toBe('weird-title')
    expect(slugify('Projects/World Notes')).toBe('projects/world-notes')
    expect(slugify('Ünicode Tïtle')).toBe('unicode-title')
    expect(slugify('already--slugged')).toBe('already-slugged')
  })

  it('returns empty for non-latin-only input', () => {
    expect(slugify('中文笔记')).toBe('')
    expect(slugify('🎉')).toBe('')
  })
})

describe('validateSlug', () => {
  it('normalizes leading/trailing/duplicate slashes', () => {
    expect(validateSlug('/blog//post/')).toEqual({ ok: true, slug: 'blog/post' })
  })

  it('rejects invalid charset', () => {
    expect(validateSlug('Bad-Caps').ok).toBe(false)
    expect(validateSlug('under_score').ok).toBe(false)
    expect(validateSlug('has space').ok).toBe(false)
    expect(validateSlug('trav/…/ers').ok).toBe(false)
  })

  it('rejects traversal and dot segments', () => {
    expect(validateSlug('../etc').ok).toBe(false)
    expect(validateSlug('a/./b').ok).toBe(false)
  })

  it('rejects empty and over-long slugs', () => {
    expect(validateSlug('').ok).toBe(false)
    expect(validateSlug('/').ok).toBe(false)
    expect(validateSlug('a/'.repeat(200)).ok).toBe(false)
  })

  it('rejects reserved first segments', () => {
    expect(validateSlug('api/pages').ok).toBe(false)
    expect(validateSlug('edit/home').ok).toBe(false)
    expect(validateSlug('all').ok).toBe(false)
    expect(validateSlug('admin').ok).toBe(false)
    expect(validateSlug('blog/api-post').ok).toBe(true) // only first segment matters
  })
})

describe('wikiTargetToSlug', () => {
  it('resolves wiki targets through the fold', () => {
    expect(wikiTargetToSlug('Blog/First Post')).toBe('blog/first-post')
    expect(wikiTargetToSlug('中文')).toBeNull()
    expect(wikiTargetToSlug('api/stuff')).toBeNull() // reserved
  })
})

describe('slugDisplayName', () => {
  it('title-cases the last segment', () => {
    expect(slugDisplayName('blog/my-first-post')).toBe('My First Post')
  })
})
