// @vitest-environment node

// ─── Reader renderer (SSR engine == editor engine) ───────────────────────────
// The read path renders through the ONE engine in src/core. These tests pin
// the reader contract: output equals the core static renderer, everything
// unsafe stays escaped/literal, and nothing imports markdown-it anymore.

import { describe, it, expect } from 'vitest'
import { createReaderRenderer } from '../render/reader'
import { renderDocumentHtml } from '../../core/static-renderer'
import { defaultPlugins } from '../../core/plugins/defaults'

const render = createReaderRenderer()
const core = (src: string) => renderDocumentHtml(src, defaultPlugins)

describe('reader renderer', () => {
  it('is a pure pass-through of the single core engine', () => {
    const src = '# Title\n\n- a **b** [[c/d]]\n\n> quote `code`'
    expect(render.render(src)).toBe(core(src))
  })

  it('renders editor-shape HTML for supported constructs', () => {
    const html = render.render('# Hello There\n\n**world**')
    expect(html).toContain('<div data-line="0">')
    expect(html).toContain('<span class="wn-h1">')
    expect(html).toContain('<span class="wn-punct"># </span>')
    expect(html).toContain('>Hello There<')
    expect(html).toContain('<span class="wn-bold"><span class="wn-punct">**</span>world')
    expect(html).not.toContain('<h1>') // no markdown-it-era semantic HTML
  })

  it('renders [[wiki links]] as real slug anchors (zero-JS navigation)', () => {
    const html = render.render('See [[Blog/First Post|my post]] and [[plain-page]].')
    expect(html).toContain('href="/blog/first-post"')
    expect(html).toContain('>my post<')
    expect(html).toContain('href="/plain-page"')
  })

  it('keeps unfurlable wiki targets as literal text', () => {
    const html = render.render('CJK [[中文]] stays literal')
    expect(html).toContain('[[中文]]')
    expect(html).not.toContain('wn-wiki-link')
  })

  it('escapes author HTML (no script execution for readers)', () => {
    const html = render.render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('blocks javascript:/data:/protocol-relative hrefs; allows http/https/mailto', () => {
    const bad = render.render('[click](javascript:alert(1))')
    expect(bad).not.toContain('<a ')
    expect(bad).toContain('[click](javascript:alert(1))') // literal source
    expect(render.render('[x](data:text/html,%3Cb%3E)')).not.toContain('<a ')
    expect(render.render('[x](//evil.test/a)')).not.toContain('<a ')

    const ext = render.render('[ok](https://x.test/a)')
    expect(ext).toContain('<a class="wn-link" href="https://x.test/a" target="_blank"')
    expect(ext).toContain('rel="noopener noreferrer nofollow"')

    const mail = render.render('[us](mailto:a@b.c)')
    expect(mail).toContain('href="mailto:a@b.c"')
    expect(mail).not.toContain('target=')
    expect(mail).not.toContain('nofollow')
  })

  it('escapes HTML inside wiki display text', () => {
    const html = render.render('[[page|<img src=x onerror=bad>]]')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('neutralizes attribute breakout attempts in list markup', () => {
    const html = render.render('- x" onclick="alert(1)')
    expect(html).toContain('data-raw="- x&quot; onclick=&quot;alert(1)"')
    expect(html).not.toMatch(/<span[^>]*"\s+onclick=/)
  })
})

describe('grammar degradation (accepted: editor subset is the whole grammar)', () => {
  // markdown-it-era syntax that the single engine does not parse: it must
  // survive as VISIBLE literal source (never silently vanish, never execute).
  const literals = [
    ['table row', '| a | b |', '| a | b |'],
    ['task checkbox', '- [ ] todo', '[ ] todo'],
    ['h4 heading', '#### deep', '#### deep'],
    ['bare url stays text', 'visit https://example.com now', 'visit https://example.com now'],
    [
      'backslash escapes invert (no escape grammar)',
      'not \\*it\\* here',
      '<span class="wn-italic">',
    ],
    ['underscore emphasis', 'not _em_ here', 'not _em_ here'],
    ['html entities', 'copy &copy; left', '&amp;copy;'],
  ] as const

  it.each(literals)('%s renders as literal source', (_name, src, needle) => {
    const html = render.render(src)
    expect(html).toContain(needle)
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<pre')
    expect(html).not.toContain('<ol')
    expect(html).not.toContain('type="checkbox"')
    expect(html).not.toContain('<h4')
  })

  it('fenced code renders as a styled verbatim block', () => {
    const html = render.render('```js\nconst x = 1\n```')
    expect(html).toContain('<div class="wn-code-block" data-block="code-block">')
    expect(html).toContain('class="wn-code-fence"')
    expect(html).toContain('>```js</div>')
    expect(html).toContain('class="wn-code-line">const x = 1</div>')
    expect(html).not.toContain('<pre') // div shape preserved (pivot decision)
  })

  it('nothing inside a fence is parsed', () => {
    const html = render.render('```\n**bold** [[wiki]] [l](u)\n```')
    expect(html).not.toContain('wn-bold')
    expect(html).not.toContain('wn-wiki-link')
    expect(html).not.toContain('<a ')
    expect(html).toContain('**bold** [[wiki]] [l](u)')
  })

  it('HTML inside a fence is escaped, not executed (B4 vector)', () => {
    const html = render.render('```\n<script>alert(1)</script>\n```')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('unclosed fence runs to EOF; blank fence lines keep the <br> placeholder', () => {
    const html = render.render('```\nno close')
    expect(html).toContain('data-block="code-block"')
    const blank = render.render('```\n\nx\n```')
    expect(blank).toContain(
      '<div data-line="1" data-block="code-block" class="wn-code-line"><br></div>',
    )
  })

  it('images render styled (restored grammar)', () => {
    const html = render.render('![alt](https://x.test/a.png)')
    expect(html).toContain('<img class="wn-image-img" src="https://x.test/a.png" alt="alt"')
    expect(html).toContain('referrerpolicy="no-referrer"')
    expect(html).toContain('loading="lazy"')
    // punct-fidelity: the source characters are present as text nodes…
    expect(html).toContain('<span class="wn-punct">![</span>')
  })

  it('unsafe image srcs stay escaped literal source (never <img>)', () => {
    const html = render.render('![a](data:text/html,<script>alert(1)</script>)')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    // backslash origin-escape (WHATWG treats \ as / for img src)
    const evil = render.render('![a](\\evil.com\\x.png)')
    expect(evil).not.toContain('<img')
    // attribute-breakout attempt inside src — escaped, cannot open a new attr
    const breakout = render.render('![a](x"onerror="alert(1))')
    expect(breakout).not.toMatch(/<img[^>]*"\s*onerror=/)
  })

  it('linked images stay degraded (known limitation, documented)', () => {
    // [![alt](img.png)](url) — the link token wins the scan; no <img>.
    const html = render.render('[![alt](https://x.test/a.png)](https://x.test)')
    expect(html).not.toContain('<img')
    expect(html).toContain('wn-link')
  })
})

describe('lists render styled (restored grammar)', () => {
  it('unordered markers display as bullets; source preserved in data-raw', () => {
    const html = render.render('- milk')
    expect(html).toContain('class="wn-list-item" data-raw="- milk"')
    expect(html).toContain('wn-list-item-marker" aria-hidden="true">• </span>')
  })

  it('ordered markers render as typed (no auto-renumbering, no <ol>)', () => {
    const html = render.render('1. one\niv. four')
    expect(html).toContain('data-raw="1. one"')
    expect(html).toContain('>1. </span>')
    expect(html).toContain('data-raw="iv. four"')
    expect(html).toContain('>iv. </span>')
    expect(html).not.toContain('<ol')
    expect(html).not.toContain('<li')
  })
})
