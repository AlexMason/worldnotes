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
    expect(collectLinkSlugs(md, defaultPlugins, 2)).toEqual(['a', 'b'])
  })
})

describe('missing-page marker in reader HTML', () => {
  const md = '[[here]] [[gone]] [t](gone-too) [ext](https://example.com)'

  it('marks only targets reported as missing', () => {
    const html = renderDocumentHtml(md, defaultPlugins, (slug) => slug === 'here')
    expect(html).toContain('<a class="wn-wiki-link" href="/here"')
    expect(html).toContain('<a class="wn-wiki-link wn-link-missing" href="/gone"')
    expect(html).toContain('<a class="wn-wiki-link wn-link-missing" href="/gone-too"')
    expect(html).toContain('<a class="wn-link" href="https://example.com"')
  })

  it('treats unknown existence as existing and never marks without a resolver', () => {
    expect(renderDocumentHtml(md, defaultPlugins, () => undefined)).not.toContain('wn-link-missing')
    expect(renderDocumentHtml(md, defaultPlugins)).not.toContain('wn-link-missing')
  })

  it('reaches links nested inside list items', () => {
    const html = renderDocumentHtml('- see [[gone]]', defaultPlugins, () => false)
    expect(html).toContain('wn-wiki-link wn-link-missing')
  })
})
