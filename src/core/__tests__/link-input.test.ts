import { describe, it, expect } from 'vitest'
import {
  applyLink,
  classifyLinkInput,
  findLinkAt,
  rankSuggestions,
  suggestionTarget,
  type ValidLinkInput,
} from '../link-input'
import { defaultPlugins } from '../plugins/defaults'

const defs = defaultPlugins.flatMap((p) => p.tokens)

describe('classifyLinkInput', () => {
  it.each([
    ['https://x.test/a?b=1', 'https://x.test/a?b=1'],
    ['http://x.test', 'http://x.test'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['www.x.test', 'https://www.x.test'],
    ['example.com', 'https://example.com'],
    ['example.com/a/b', 'https://example.com/a/b'],
    ['#section', '#section'],
    ['  https://x.test  ', 'https://x.test'],
  ])('%s is a URL → %s', (raw, url) => {
    expect(classifyLinkInput(raw)).toEqual({ kind: 'url', url })
  })

  it('percent-encodes ")" because the link token ends at the first one', () => {
    expect(classifyLinkInput('https://x.test/a_(b)')).toEqual({
      kind: 'url',
      url: 'https://x.test/a_(b%29',
    })
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.com/x', 'vbscript:x'])(
    'refuses the unsafe link %s',
    (raw) => {
      expect(classifyLinkInput(raw).kind).toBe('error')
    },
  )

  it('refuses a spaced URL instead of guessing', () => {
    expect(classifyLinkInput('https://x.test/a b')).toEqual({
      kind: 'error',
      message: 'A URL cannot contain spaces',
    })
  })

  it('anything else is a wiki target, with its folded slug', () => {
    expect(classifyLinkInput('lore/old-gods')).toEqual({
      kind: 'wiki',
      target: 'lore/old-gods',
      slug: 'lore/old-gods',
    })
    expect(classifyLinkInput('Clients/Acme Corp')).toMatchObject({
      kind: 'wiki',
      slug: 'clients/acme-corp',
    })
  })

  it('resolves relative wiki targets under the link base, root-absolute ones not', () => {
    expect(classifyLinkInput('beta', 'alpha')).toMatchObject({ slug: 'alpha/beta' })
    expect(classifyLinkInput('/beta', 'alpha')).toMatchObject({ slug: 'beta' })
  })

  it.each([
    ['', 'Enter a page name or a URL'],
    ['   ', 'Enter a page name or a URL'],
    ['a]b', 'A page name cannot contain ] or |'],
    ['a|b', 'A page name cannot contain ] or |'],
    ['!!!', 'Not a valid page name'],
    ['/', 'Not a valid page name'],
  ])('rejects %j: %s', (raw, message) => {
    expect(classifyLinkInput(raw)).toEqual({ kind: 'error', message })
  })
})

describe('suggestionTarget', () => {
  it('bare slug at the site root', () => {
    expect(suggestionTarget('lore/old-gods', null)).toBe('lore/old-gods')
  })
  it('base-relative remainder under the link base', () => {
    expect(suggestionTarget('lore/old-gods', 'lore')).toBe('old-gods')
  })
  it('root-absolute outside the link base (a sibling prefix is not under it)', () => {
    expect(suggestionTarget('other/x', 'lore')).toBe('/other/x')
    expect(suggestionTarget('lore-extra/x', 'lore')).toBe('/lore-extra/x')
    expect(suggestionTarget('lore', 'lore')).toBe('/lore')
  })
})

describe('findLinkAt', () => {
  it('finds a markdown link around a caret and reports its source span', () => {
    const text = 'see [the docs](https://x.test) now'
    expect(findLinkAt(text, 8, 8, defs)).toEqual({
      kind: 'url',
      from: 4,
      to: 30,
      target: 'https://x.test',
      label: 'the docs',
      implicitLabel: false,
    })
  })

  it('finds wiki links with and without an explicit label', () => {
    expect(findLinkAt('[[a/b|Bee]]', 4, 4, defs)).toMatchObject({
      kind: 'wiki',
      target: 'a/b',
      label: 'Bee',
      implicitLabel: false,
    })
    expect(findLinkAt('[[a/b]]', 4, 4, defs)).toMatchObject({
      kind: 'wiki',
      target: 'a/b',
      label: 'b',
      implicitLabel: true,
    })
  })

  it('works on a list line', () => {
    expect(findLinkAt('- [x](https://y.test)', 5, 5, defs)).toMatchObject({ from: 2, to: 21 })
  })

  it('outer edges, plain text, images and multi-line selections are not links', () => {
    expect(findLinkAt('[x](https://y.test)', 0, 0, defs)).toBeNull()
    expect(findLinkAt('[x](https://y.test)', 19, 19, defs)).toBeNull()
    expect(findLinkAt('plain', 2, 2, defs)).toBeNull()
    expect(findLinkAt('![alt](https://y.test/a.png)', 4, 4, defs)).toBeNull()
    expect(findLinkAt('[a](https://y.test)\nb', 2, 21, defs)).toBeNull()
  })
})

describe('applyLink', () => {
  const wiki = (target: string, slug = target): ValidLinkInput => ({ kind: 'wiki', target, slug })
  const url = (u: string): ValidLinkInput => ({ kind: 'url', url: u })

  it('wiki link around a selection keeps it as the label; caret lands after the link', () => {
    const r = applyLink('the old gods', 4, 12, wiki('lore/old-gods'), defs)
    expect(r).toEqual({ text: 'the [[lore/old-gods|old gods]]', start: 30, end: 30 })
  })

  it('omits the pipe when the selection is what the link already displays', () => {
    const r = applyLink('see old-gods', 4, 12, wiki('lore/old-gods'), defs)
    expect(r).toEqual({ text: 'see [[lore/old-gods]]', start: 21, end: 21 })
  })

  it('no selection: a bare wiki link / a URL labelled by itself', () => {
    expect(applyLink('ab', 1, 1, wiki('c'), defs)).toEqual({ text: 'a[[c]]b', start: 6, end: 6 })
    expect(applyLink('ab', 1, 1, url('https://x.test'), defs)).toEqual({
      text: 'a[https://x.test](https://x.test)b',
      start: 33,
      end: 33,
    })
  })

  it('URL around a selection', () => {
    expect(applyLink('go docs now', 3, 7, url('https://x.test'), defs)).toEqual({
      text: 'go [docs](https://x.test) now',
      start: 25,
      end: 25,
    })
  })

  it('inside an existing link it rewrites the target and keeps the visible text', () => {
    const text = 'a [t](https://x.test) b'
    expect(applyLink(text, 4, 4, url('https://y.test'), defs)).toMatchObject({
      text: 'a [t](https://y.test) b',
    })
    expect(applyLink(text, 4, 4, wiki('page'), defs)).toMatchObject({ text: 'a [[page|t]] b' })
    expect(applyLink('[[old|Label]]', 4, 4, wiki('new'), defs)).toMatchObject({
      text: '[[new|Label]]',
    })
  })

  it('an implicit wiki label follows the new target; as a URL it keeps the derived text', () => {
    expect(applyLink('[[a/b]]', 3, 3, wiki('c'), defs)).toMatchObject({ text: '[[c]]' })
    expect(applyLink('[[a/b]]', 3, 3, url('https://x.test'), defs)).toMatchObject({
      text: '[b](https://x.test)',
    })
  })

  it('refuses what the link grammar cannot hold', () => {
    expect(applyLink('a\nb', 0, 3, wiki('c'), defs)).toEqual({
      error: 'Select text on a single line to turn it into a link',
    })
    expect(applyLink('a]b', 0, 3, wiki('c'), defs)).toEqual({
      error: 'The link text cannot contain ]',
    })
  })

  it('output is read back as the same link by the grammar (round trip)', () => {
    const r = applyLink('x docs y', 2, 6, url('https://x.test/a'), defs) as { text: string }
    const link = findLinkAt(r.text, 5, 5, defs)
    expect(link).toMatchObject({ kind: 'url', target: 'https://x.test/a', label: 'docs' })
  })
})

describe('rankSuggestions', () => {
  const page = (slug: string, title: string) => ({ slug, title })

  it('exact first, then prefix matches (title, slug, last segment), then the rest — stable within a group', () => {
    const items = [
      page('diary/the-old-men', 'Diary'), // contains only
      page('lore/old-gods', 'The Old Gods'), // last segment prefix
      page('old', 'Something'), // exact slug
      page('misc/zzz', 'Old Maps'), // title prefix
      page('notes/older', 'Notes'), // last segment prefix
    ]
    expect(rankSuggestions('old', items).map((i) => i.slug)).toEqual([
      'old',
      'lore/old-gods',
      'misc/zzz',
      'notes/older',
      'diary/the-old-men',
    ])
  })

  it('ignores case and a leading slash, and never mutates its input', () => {
    const items = [page('b', 'Beta'), page('a/alpha', 'Alpha')]
    const before = [...items]
    expect(rankSuggestions('/ALPHA', items).map((i) => i.slug)).toEqual(['a/alpha', 'b'])
    expect(items).toEqual(before)
  })
})
