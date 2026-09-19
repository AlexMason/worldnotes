import { describe, it, expect } from 'vitest'
import { createViewerRenderer } from '../render/markdown'
import { isSafeHref } from '../../shared/url-policy'

const md = createViewerRenderer()

describe('viewer renderer', () => {
  it('renders semantic headings, emphasis, and code', () => {
    const html = md.render('# Title\n\nSome **bold**, *italic*, ~~struck~~, and `code`.\n')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<s>struck</s>')
    expect(html).toContain('<code>code</code>')
  })

  it('renders lists, tables, blockquotes, and fences', () => {
    const html = md.render(
      '- one\n- two\n\n> quoted\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```\nfence\n```\n',
    )
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<table>')
    expect(html).toContain('<pre><code>fence\n')
  })

  it('escapes author HTML (no script execution for readers)', () => {
    const html = md.render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;') // harmless escaped text
  })

  it('renders [[wiki links]] as real slug URLs', () => {
    const html = md.render('See [[Blog/First Post|my post]] and [[plain-page]].')
    expect(html).toContain('<a href="/blog/first-post" class="wn-wiki-link">my post</a>')
    expect(html).toContain('<a href="/plain-page" class="wn-wiki-link">plain-page</a>')
  })

  it('keaves unfurlable wiki targets as literal text', () => {
    const html = md.render('CJK [[中文]] stays literal')
    expect(html).toContain('[[中文]]')
    expect(html).not.toContain('wn-wiki-link')
  })

  it('escapes HTML inside wiki display text', () => {
    const html = md.render('[[page|<img src=x onerror=bad>]]')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('renders task list checkboxes as disabled inputs', () => {
    const html = md.render('- [ ] todo\n- [x] done\n')
    expect(html).toContain('<input type="checkbox" class="wn-task" disabled>')
    expect(html).toContain('<input type="checkbox" class="wn-task" disabled checked>')
  })

  it('blocks javascript:/data: hrefs, allows http/https/mailto', () => {
    const html = md.render('[click](javascript:alert(1)) and [ok](https://x.test/a)')
    expect(html).not.toMatch(/href="javascript:/)
    expect(html).toContain(
      '<a href="https://x.test/a" rel="noopener noreferrer nofollow">ok</a>',
    )
  })

  it('adds rel=noopener only to external links', () => {
    const html = md.render('[ext](https://example.com) [rel](/local/page)')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
    expect(html).toMatch(/href="\/local\/page"(?!.*rel=)/)
  })

  it('linkifies bare URLs', () => {
    const html = md.render('visit https://example.com now')
    expect(html).toContain('<a href="https://example.com')
  })
})

describe('isSafeHref (url policy)', () => {
  it.each([
    ['https://ok.test/x', true],
    ['http://ok.test', true],
    ['mailto:a@b.c', true],
    ['/relative/path', true],
    ['blog/post', true],
    ['javascript:alert(1)', false],
    ['JaVaScRiPt:alert(1)', false],
    ['data:text/html,<script>', false],
    ['vbscript:x', false],
    ['//evil.test/x', false],
    ['', false],
  ])('%s → %s', (url, safe) => {
    expect(isSafeHref(url)).toBe(safe)
  })
})
