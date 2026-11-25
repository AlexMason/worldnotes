// ─── Link source rewriting for page moves ────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { rewriteLinks } from '../link-rewrite'
import { defaultPlugins } from '../plugins/defaults'
import type { ContentPlugin, LinkRewriteContext } from '../types'

/** projects/acme (+ its notes child) moved to clients/acme-corp. */
const MOVES = new Map([
  ['projects/acme', 'clients/acme-corp'],
  ['projects/acme/notes', 'clients/acme-corp/notes'],
])

function ctx(
  oldBase: string | null = null,
  newBase: string | null = oldBase,
  moves: Map<string, string> = MOVES,
): LinkRewriteContext {
  return { oldBase, newBase, moved: (slug) => moves.get(slug) }
}

const rewrite = (md: string, c: LinkRewriteContext = ctx()): string =>
  rewriteLinks(md, defaultPlugins, c)

describe('rewriteLinks — wiki links', () => {
  it('rewrites absolute targets in the original style', () => {
    expect(rewrite('see [[/projects/acme]] now')).toBe('see [[/clients/acme-corp]] now')
    expect(rewrite('see [[/Projects/Acme]] now')).toBe('see [[/Clients/Acme Corp]] now')
  })

  it('keeps relative targets relative while still under the base', () => {
    // On the home page (base null) relative targets resolve from the root.
    expect(rewrite('[[Projects/Acme]]')).toBe('[[Clients/Acme Corp]]')
    expect(rewrite('[[projects/acme]]')).toBe('[[clients/acme-corp]]')
    // On `projects` a relative `[[acme]]` means projects/acme; the target left
    // the base, so it becomes root-absolute.
    expect(rewrite('[[acme]]', ctx('projects'))).toBe('[[/clients/acme-corp]]')
    // On `clients`, a page now containing the target: relative again.
    const moves = new Map([['clients/acme', 'clients/acme-corp']])
    expect(rewrite('[[Acme]]', ctx('clients', 'clients', moves))).toBe('[[Acme Corp]]')
  })

  it('keeps an explicit label byte-exact and lets implicit display follow', () => {
    expect(rewrite('[[/projects/acme/notes| Acme Notes ]]')).toBe(
      '[[/clients/acme-corp/notes| Acme Notes ]]',
    )
  })

  it('leaves relative links inside the moved subtree alone', () => {
    // On projects/acme itself (now clients/acme-corp), `[[notes]]` already
    // follows the move.
    expect(rewrite('[[notes]] and [[Notes]]', ctx('projects/acme', 'clients/acme-corp'))).toBe(
      '[[notes]] and [[Notes]]',
    )
  })

  it('leaves missing relative children and unmoved targets alone', () => {
    expect(rewrite('[[todo]]', ctx('projects/acme', 'clients/acme-corp'))).toBe('[[todo]]')
    expect(rewrite('[[/projects/other]] [[中文]] [[!!!]]')).toBe(
      '[[/projects/other]] [[中文]] [[!!!]]',
    )
  })

  it('rewrites absolute links ON a moved page that point into the subtree', () => {
    expect(rewrite('[[/projects/acme/notes]]', ctx('projects/acme', 'clients/acme-corp'))).toBe(
      '[[/clients/acme-corp/notes]]',
    )
  })
})

describe('rewriteLinks — markdown links', () => {
  it('rewrites internal hrefs, keeping text and the leading-slash choice', () => {
    expect(rewrite('[the **client**](/projects/acme)')).toBe('[the **client**](/clients/acme-corp)')
    expect(rewrite('[x](projects/acme/notes)')).toBe('[x](clients/acme-corp/notes)')
  })

  it('never introduces whitespace into an href', () => {
    expect(rewrite('[x](/Projects/Acme)')).toBe('[x](/clients/acme-corp)')
  })

  it('ignores external, same-doc and mail links', () => {
    const md = '[a](https://x.test/projects/acme) [b](#projects/acme) [c](mailto:a@b.c)'
    expect(rewrite(md)).toBe(md)
  })
})

describe('rewriteLinks — engine-faithful nesting', () => {
  it('rewrites inside list items, headings, quotes and table cells', () => {
    expect(rewrite('- item [[/projects/acme]]\n  - nested [[/projects/acme]]')).toBe(
      '- item [[/clients/acme-corp]]\n  - nested [[/clients/acme-corp]]',
    )
    expect(rewrite('## About [[/projects/acme]]')).toBe('## About [[/clients/acme-corp]]')
    expect(rewrite('> quoted [[/projects/acme]]')).toBe('> quoted [[/clients/acme-corp]]')
    expect(rewrite('| a | b |\n|---|---|\n| [[/projects/acme]] | 2 |')).toBe(
      '| a | b |\n|---|---|\n| [[/clients/acme-corp]] | 2 |',
    )
  })

  it('touches only what the engine renders as a link', () => {
    // Fences and code spans are literal; emphasis content is plain text in
    // this engine (no nested links), so it is not a link to rewrite either.
    const md =
      '```\n[[/projects/acme]]\n```\nuse `[[/projects/acme]]` literally\n' +
      '**bold [[/projects/acme]]** *it [x](/projects/acme)*'
    expect(rewrite(md)).toBe(md)
  })

  it('leaves image sources alone', () => {
    const md = '![acme](/projects/acme)'
    expect(rewrite(md)).toBe(md)
  })
})

describe('rewriteLinks — identity when nothing moved', () => {
  const CORPUS: string[] = [
    '# Heading\n\ntext with **bold**, *it*, `code`, ~~struck~~',
    '- bullet\n  - nested\n1. ordered\niv. roman\n* plus? + star',
    '> quote [[Page]]\n\n---\n\nplain',
    'link [Example](https://x.test) mail [m](mailto:a@b.c) [in](/page) [[a|b]]',
    'inline ![alt](/assets/i.png) image and ![bad](data:text/html,x) literal',
    '```js\nconst **x** = `<i>` 1\n\nclose me\n```',
    '```\nunclosed to EOF with | pipe | chars',
    '| a | b |\n|:--|--:|\n| **x** [[y]] | 2 |\n| ragged |',
    'a | b\n--- | ---\n1 | ![img](/i.png)',
    '  leading-space preserved [[x]] \n\ttabs too',
    'mixed: - item then ```\n| not | a | table |\n``` then | 1 | 2 |\n|---|---|',
    '## [[/projects/acme-x]] **[x](/projects/acmex)**',
    '',
    '\n\n',
  ]

  for (const [i, text] of CORPUS.entries()) {
    it(`corpus[${i}] comes back unchanged`, () => {
      expect(rewrite(text, ctx('projects/acme', 'clients/acme-corp'))).toBe(text)
    })
  }
})

describe('rewriteLinks — fail-safe splice', () => {
  it('keeps a container token byte-exact when its inline text cannot be located', () => {
    // A container that hands the engine TRANSFORMED inner text (not a
    // substring of its raw): the rewritten inner cannot be spliced back.
    const shouty: ContentPlugin = {
      name: 'shouty',
      version: '1.0.0',
      kind: 'content',
      tokens: [{ type: 'shouty', pattern: /!!(.+?)!!/ }],
      render: () => {
        throw new Error('editor DOM render is not used by rewriting')
      },
      renderToHTML: (token, ctx) => ctx.renderInline(` ${token.groups[0] ?? ''}`),
    }
    const plugins = [...defaultPlugins, shouty]
    const md = '!![[/projects/acme]]!! and [[/projects/acme]]'
    expect(rewriteLinks(md, plugins, ctx())).toBe(
      '!![[/projects/acme]]!! and [[/clients/acme-corp]]',
    )
  })
})
