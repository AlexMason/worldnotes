// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { collectLinkSlugs } from '../link-slugs'
import { renderDocumentHtml } from '../static-renderer'
import { defaultPlugins } from '../plugins/defaults'

describe('collectLinkSlugs', () => {
  it('collects wiki links and internal markdown links, folded and deduped', () => {
    const md = ['[[Projects/Acme|Client]] and [x](Other Page) again [[projects/acme]]'].join('\n')
    expect(collectLinkSlugs(md, defaultPlugins)).toEqual(['projects/acme', 'other-page'])
  })

  it('ignores external, same-doc, unfoldable and fenced links', () => {
    const md = [
      '[a](https://example.com) [b](mailto:a@b.c) [c](#frag) [[中文]] [d](/all)',
      '```',
      '[[inside-fence]]',
      '```',
    ].join('\n')
    expect(collectLinkSlugs(md, defaultPlugins)).toEqual([])
  })

  it('finds links nested in list items, headings, quotes and table cells', () => {
    const md = [
      '- item [[in-list]]',
      '# Head [[in-heading]]',
      '> quote [[in-quote]]',
      '| h |',
      '|---|',
      '| [[in-cell]] |',
    ].join('\n')
    expect(collectLinkSlugs(md, defaultPlugins).sort()).toEqual([
      'in-cell',
      'in-heading',
      'in-list',
      'in-quote',
    ])
  })

  it('stops collecting at the cap', () => {
    const md = '[[a]] [[b]] [[c]]'
    expect(collectLinkSlugs(md, defaultPlugins, { max: 2 })).toEqual(['a', 'b'])
  })

  it('resolves relative wiki links under the page base, as the render does', () => {
    const md = '[[beta]] [[/root-page]] [x](md-link) [[!!!]]'
    expect(collectLinkSlugs(md, defaultPlugins, { linkBase: 'alpha' })).toEqual([
      'alpha/beta',
      'root-page',
      'md-link',
    ])
  })
})

describe('missing-page marker in reader HTML', () => {
  const md = '[[here]] [[gone]] [t](gone-too) [ext](https://example.com)'

  it('marks only targets reported as missing', () => {
    const html = renderDocumentHtml(md, defaultPlugins, { pageExists: (slug) => slug === 'here' })
    expect(html).toContain('<a class="wn-wiki-link" href="/here"')
    expect(html).toContain('<a class="wn-wiki-link wn-link-missing" href="/gone"')
    expect(html).toContain('<a class="wn-wiki-link wn-link-missing" href="/gone-too"')
    expect(html).toContain('<a class="wn-link" href="https://example.com"')
  })

  it('treats unknown existence as existing and never marks without a resolver', () => {
    expect(renderDocumentHtml(md, defaultPlugins, { pageExists: () => undefined })).not.toContain(
      'wn-link-missing',
    )
    expect(renderDocumentHtml(md, defaultPlugins)).not.toContain('wn-link-missing')
  })

  it('reaches links nested inside list items', () => {
    const html = renderDocumentHtml('- see [[gone]]', defaultPlugins, { pageExists: () => false })
    expect(html).toContain('wn-wiki-link wn-link-missing')
  })

  it('asks about the RESOLVED slug of a relative link', () => {
    // /beta exists but /alpha/beta does not: the relative link is missing.
    const pageExists = (slug: string) => slug === 'beta'
    const html = renderDocumentHtml('[[beta]] [[/beta]]', defaultPlugins, {
      linkBase: 'alpha',
      pageExists,
    })
    expect(html).toContain('<a class="wn-wiki-link wn-link-missing" href="/alpha/beta"')
    expect(html).toContain('<a class="wn-wiki-link" href="/beta"')
  })
})

describe('relative wiki links in reader HTML', () => {
  const render = (md: string, linkBase?: string) =>
    renderDocumentHtml(md, defaultPlugins, linkBase ? { linkBase } : {})

  it('nests [[target]] under the page and roots [[/target]] at the site', () => {
    expect(render('[[beta]]', 'alpha')).toContain('href="/alpha/beta" data-page="/alpha/beta"')
    expect(render('[[beta]]', 'alpha/gamma')).toContain('href="/alpha/gamma/beta"')
    expect(render('[[/beta]]', 'alpha')).toContain('href="/beta" data-page="/beta"')
  })

  it('keeps the alias and the last-segment label', () => {
    const aliased = render('[[Beta Page|Shown]]', 'alpha')
    expect(aliased).toContain('href="/alpha/beta-page"')
    expect(aliased).toContain('>Shown</a>')
    expect(render('[[/docs/intro]]', 'alpha')).toContain('>intro</a>')
  })

  it('leaves base-less pages and markdown links at the root', () => {
    expect(render('[[beta]]')).toContain('href="/beta" data-page="beta"')
    expect(render('[x](beta)', 'alpha')).toContain('href="/beta"')
  })

  it('renders an unresolvable relative target as literal source', () => {
    expect(render('[[!!!]]', 'alpha')).not.toContain('<a')
    expect(render('[[!!!]]', 'alpha')).toContain('[[!!!]]')
  })
})
