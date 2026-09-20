// ─── Nav-page link extraction + service ─────────────────────────────────────
// Extraction runs the real engine (buildDocument + inline scan), so these
// tests pin grammar parity with the renderer, not a regex approximation.

import { describe, it, expect } from 'vitest'
import { extractNavLinks, createNavLinksService, NAV_MAX_ITEMS } from '../render/nav'
import { createRenderCache } from '../cache'
import { createSettingsService } from '../settings'
import { createMemorySettingsRepository } from '../db/settings-memory'
import { createMemoryPagesRepository } from '../db/pages-memory'

describe('extractNavLinks', () => {
  it('returns nothing for empty or link-free content', () => {
    expect(extractNavLinks('')).toEqual([])
    expect(extractNavLinks('Just a paragraph with a [[stray-link]] inside.')).toEqual([])
  })

  it('takes wiki links from top-level list items, in order', () => {
    const links = extractNavLinks('- [[about|About us]]\n- [[projects/acme]]\n')
    expect(links).toEqual([
      { slug: 'about', href: '/about', label: 'About us' },
      { slug: 'projects/acme', href: '/projects/acme', label: 'acme' },
    ])
  })

  it('takes markdown links that fold to an internal slug', () => {
    const links = extractNavLinks('- [Docs](/docs/getting-started)\n')
    expect(links).toEqual([
      { slug: 'docs/getting-started', href: '/docs/getting-started', label: 'Docs' },
    ])
  })

  it('accepts every list marker grammar the engine treats as a list item', () => {
    const links = extractNavLinks('- [[a]]\n+ [[b]]\n* [[c]]\n1. [[d]]\na. [[e]]\niv. [[f]]\n')
    expect(links.map((l) => l.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('skips nested (indented) items and plain list items without a link', () => {
    const links = extractNavLinks('- [[top]]\n  - [[nested]]\n\t- [[tabbed]]\n- no link here\n')
    expect(links.map((l) => l.slug)).toEqual(['top'])
  })

  it('skips external, same-doc and unfoldable targets', () => {
    const links = extractNavLinks(
      [
        '- [External](https://example.com/x)',
        '- [Protocol-relative](//example.com/x)',
        '- [Script](javascript:alert(1))',
        '- [Mail](mailto:me@x.test)',
        '- [Anchor](#section)',
        '- [Query](?f=1)',
        '- [[🎉]]',
      ].join('\n'),
    )
    expect(links).toEqual([])
  })

  it('does not mistake an image for a link', () => {
    expect(extractNavLinks('- ![alt](/media/3)\n').length).toBe(0)
  })

  it('ignores list-looking lines inside fenced code (and unterminated fences)', () => {
    const links = extractNavLinks(
      ['```', '- [[fake]]', '```', '- [[real]]', '```', '- [[never-closed]]'].join('\n'),
    )
    expect(links.map((l) => l.slug)).toEqual(['real'])
  })

  it('prefers the earliest link in an item', () => {
    const links = extractNavLinks('- first [[a]] then [[b]]\n')
    expect(links.map((l) => l.slug)).toEqual(['a'])
  })

  it('renders a link that sits inside emphasis', () => {
    const links = extractNavLinks('- **[[a|Alpha]]**\n')
    expect(links.map((l) => l.slug)).toEqual(['a'])
  })

  it('strips emphasis markers from labels and falls back to the slug name', () => {
    const links = extractNavLinks('- [[a|*Italic* `code` ~~gone~~]]\n- [[b|   ]]\n')
    expect(links.map((l) => l.label)).toEqual(['Italic code gone', 'b'])
  })

  it('truncates over-long labels', () => {
    const [link] = extractNavLinks('- [[a|' + 'x'.repeat(80) + ']]\n')
    expect(link.label.length).toBeLessThanOrEqual(40)
    expect(link.label.endsWith('…')).toBe(true)
  })

  it('caps the number of links', () => {
    const src = Array.from({ length: 20 }, (_, i) => `- [[p${i}]]`).join('\n')
    expect(extractNavLinks(src)).toHaveLength(NAV_MAX_ITEMS)
  })

  it('rejects reserved-segment targets (chrome can never link into app routes)', () => {
    expect(extractNavLinks('- [[api/internal]]\n- [[search-ish]]').map((l) => l.slug)).toEqual([
      'search-ish',
    ])
  })
})

describe('createNavLinksService', () => {
  async function setup(navSlug?: string) {
    const pages = createMemoryPagesRepository()
    const settings = await createSettingsService(
      createMemorySettingsRepository(navSlug ? { nav_slug: navSlug } : {}),
    )
    const cache = createRenderCache({ maxEntries: 100, ttlMs: 60_000 })
    const service = createNavLinksService({ pages, settings, cache })
    return { pages, settings, cache, service }
  }

  it('returns nothing without a configured nav page', async () => {
    const { service } = await setup()
    expect(await service.links()).toEqual([])
  })

  it('returns nothing when the nav page does not exist', async () => {
    const { service } = await setup('nav')
    expect(await service.links()).toEqual([])
  })

  it('parses the nav page and memoizes until it changes', async () => {
    const { pages, service } = await setup('nav')
    await pages.put('nav', { title: 'Nav', content: '- [[a]]\n- [[b]]' })
    expect((await service.links()).map((l) => l.slug)).toEqual(['a', 'b'])
    // Cache hit: the stored parse survives until the page is written…
    await pages.put('nav', { title: 'Nav', content: '- [[c]]' })
    expect((await service.links()).map((l) => l.slug)).toEqual(['a', 'b'])
    // …and a write-through invalidation sees the new content.
    service.onPageWrite('nav')
    expect((await service.links()).map((l) => l.slug)).toEqual(['c'])
  })

  it('reacts to a navSlug change on the next call', async () => {
    const { pages, settings, service } = await setup('nav-a')
    await pages.put('nav-a', { title: 'A', content: '- [[x]]' })
    await pages.put('nav-b', { title: 'B', content: '- [[y]]' })
    expect((await service.links()).map((l) => l.slug)).toEqual(['x'])
    await settings.update({ navSlug: 'nav-b' })
    expect((await service.links()).map((l) => l.slug)).toEqual(['y'])
  })

  it('clears when the setting is unset', async () => {
    const { pages, settings, service } = await setup('nav')
    await pages.put('nav', { title: 'Nav', content: '- [[a]]' })
    expect(await service.links()).toHaveLength(1)
    await settings.update({ navSlug: null })
    expect(await service.links()).toEqual([])
  })

  it('keeps the last good parse when the store fails', async () => {
    const { pages, service } = await setup('nav')
    await pages.put('nav', { title: 'Nav', content: '- [[a]]' })
    expect(await service.links()).toHaveLength(1)
    const broken = {
      get: async () => {
        throw new Error('db down')
      },
    }
    const failing = createNavLinksService({
      pages: broken,
      settings: {
        get: () => ({ navSlug: 'nav' }),
        update: async () => ({}),
        getRevision: () => 0,
      } as never,
      cache: createRenderCache({ maxEntries: 10, ttlMs: 60_000 }),
    })
    expect(await failing.links()).toEqual([]) // no last-good yet → empty, not thrown
    expect(await service.links()).toHaveLength(1) // service cache still holds it
  })
})
