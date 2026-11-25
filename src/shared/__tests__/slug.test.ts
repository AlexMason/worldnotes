import { describe, it, expect } from 'vitest'
import {
  slugify,
  validateSlug,
  wikiTargetToSlug,
  navTargetToSlug,
  slugDisplayName,
  wikiLinkBase,
  wikiLinkAddress,
  relocateSlug,
  styleLinkPath,
  rewriteWikiTarget,
  SLUG_MAX_LENGTH,
} from '../slug'

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
    expect(validateSlug('icons/set').ok).toBe(false)
    expect(validateSlug('media/1').ok).toBe(false)
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

describe('navTargetToSlug', () => {
  it('folds every spelling of the same page onto one canonical slug', () => {
    expect(navTargetToSlug('/blog/first-post')).toBe('blog/first-post')
    expect(navTargetToSlug('blog//first-post/')).toBe('blog/first-post')
    expect(navTargetToSlug('Blog/First Post')).toBe('blog/first-post')
    expect(navTargetToSlug('blog/first-post')).toBe('blog/first-post') // idempotent
  })

  it('returns null for targets that cannot address a page (callers must refuse)', () => {
    expect(navTargetToSlug('')).toBeNull()
    expect(navTargetToSlug('中文')).toBeNull()
    expect(navTargetToSlug('/all')).toBeNull() // reserved route
    expect(navTargetToSlug('api/x')).toBeNull()
  })
})

describe('wikiLinkBase', () => {
  it('is the page itself, or the root for the configured home page', () => {
    expect(wikiLinkBase('alpha/gamma', 'start')).toBe('alpha/gamma')
    expect(wikiLinkBase('start', 'start')).toBeNull()
    expect(wikiLinkBase('', 'start')).toBeNull()
    // No configured home: a page slugged `home` is an ordinary page.
    expect(wikiLinkBase('home', null)).toBe('home')
    expect(wikiLinkBase('home', undefined)).toBe('home')
  })
})

describe('wikiLinkAddress', () => {
  const resolve = (target: string, base: string | null) =>
    navTargetToSlug(wikiLinkAddress(target, base))

  it('nests relative targets under the base, whatever their spelling', () => {
    expect(wikiLinkAddress('beta', 'alpha')).toBe('/alpha/beta')
    expect(resolve('beta', 'alpha')).toBe('alpha/beta')
    expect(resolve('Beta Page', 'alpha/gamma')).toBe('alpha/gamma/beta-page')
    expect(resolve('  x/Y ', 'alpha')).toBe('alpha/x/y')
  })

  it('keeps root semantics for /-rooted targets and base-less pages', () => {
    expect(resolve('/beta', 'alpha')).toBe('beta')
    expect(resolve('/Docs/Intro', 'alpha/gamma')).toBe('docs/intro')
    expect(wikiLinkAddress('beta', null)).toBe('beta')
    expect(wikiLinkAddress('beta', '')).toBe('beta')
  })

  it('never turns an unfoldable target into a link to the base page', () => {
    expect(wikiLinkAddress('!!!', 'alpha')).toBe('!!!')
    expect(resolve('!!!', 'alpha')).toBeNull()
    expect(resolve('中文', 'alpha')).toBeNull()
  })

  it('is unresolvable when the nested slug exceeds the length limit', () => {
    const base = 'a'.repeat(SLUG_MAX_LENGTH - 2)
    expect(resolve('bc', base)).toBeNull()
    expect(resolve('/bc', base)).toBe('bc')
  })

  it('lets a relative target reuse a reserved word below the base', () => {
    expect(resolve('api', 'alpha')).toBe('alpha/api')
    expect(resolve('/api', 'alpha')).toBeNull()
  })

  it('never prefixes targets that are not page addresses', () => {
    // Navigation refuses these at the root; a base prefix must not hide them.
    for (const target of ['https://x.com/y', 'mailto:a@b.c', '#frag', '?q=1', '//host/x']) {
      expect(wikiLinkAddress(target, 'alpha')).toBe(target)
    }
  })
})

describe('slugDisplayName', () => {
  it('title-cases the last segment', () => {
    expect(slugDisplayName('blog/my-first-post')).toBe('My First Post')
  })
})

describe('relocateSlug', () => {
  it('relocates the page and its subtree, segment-aware', () => {
    expect(relocateSlug('alpha', 'alpha', 'gamma')).toBe('gamma')
    expect(relocateSlug('alpha/beta/c', 'alpha', 'x/gamma')).toBe('x/gamma/beta/c')
    expect(relocateSlug('alpha-x', 'alpha', 'gamma')).toBeNull()
    expect(relocateSlug('beta', 'alpha', 'gamma')).toBeNull()
  })
})

describe('styleLinkPath', () => {
  it('keeps slug-cased originals in slug form', () => {
    expect(styleLinkPath('projects/acme', 'clients/acme-corp')).toBe('clients/acme-corp')
    expect(styleLinkPath('/v2', 'docs/v3-final')).toBe('docs/v3-final')
  })

  it('humanizes segments for human-written originals', () => {
    expect(styleLinkPath('Projects/Acme', 'clients/acme-corp')).toBe('Clients/Acme Corp')
    expect(styleLinkPath('My Page', 'release-2')).toBe('Release 2')
  })
})

describe('rewriteWikiTarget', () => {
  it('stays relative only while the target is under the new base', () => {
    expect(rewriteWikiTarget('Acme', 'clients/acme-corp', null)).toBe('Clients/Acme Corp')
    expect(rewriteWikiTarget('acme', 'clients/acme-corp', 'clients')).toBe('acme-corp')
    expect(rewriteWikiTarget('acme', 'clients/acme-corp', 'projects')).toBe('/clients/acme-corp')
  })

  it('keeps absolute originals absolute', () => {
    expect(rewriteWikiTarget('/acme', 'clients/acme', 'clients')).toBe('/clients/acme')
  })
})
