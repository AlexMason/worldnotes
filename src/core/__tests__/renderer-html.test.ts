// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { renderDocumentToHTML, renderInlineHTML, renderLineToHTML } from '../renderer'
import { tokenizeDocument } from '../tokenizer'
import type { StaticRenderContext, ContentPlugin, Token } from '../types'
import { defaultPlugins } from '../plugins/defaults'
import { headingsPlugin } from '../plugins/headings'
import { wikiLinkPlugin } from '../plugins/wikiLink'
import { boldPlugin, italicPlugin, inlineCodePlugin, blockquotePlugin, hrPlugin } from '../plugins/inline'
import { linkPlugin } from '../plugins/link'
import { strikethroughPlugin } from '../plugins/strikethrough'

const allContentPlugins = defaultPlugins.filter(
  (p): p is ContentPlugin => p.kind === 'content',
)

describe('renderDocumentToHTML', () => {
  it('renders plain text wrapped in div[data-line]', () => {
    const text = 'hello world'
    const tokens = tokenizeDocument(
      text,
      allContentPlugins.flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, allContentPlugins)
    expect(html).toBe('<div data-line="0">hello world</div>')
  })

  it('renders empty line with <br>', () => {
    const text = ''
    const tokens = tokenizeDocument(
      text,
      allContentPlugins.flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, allContentPlugins)
    expect(html).toBe('<div data-line="0"><br></div>')
  })

  it('renders multiple lines', () => {
    const text = 'line1\nline2'
    const tokens = tokenizeDocument(
      text,
      allContentPlugins.flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, allContentPlugins)
    expect(html).toBe(
      '<div data-line="0">line1</div>\n<div data-line="1">line2</div>',
    )
  })
})

describe('renderDocumentToHTML: bold', () => {
  it('renders bold text', () => {
    const text = 'hello **world** here'
    const tokens = tokenizeDocument(
      text,
      [boldPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [boldPlugin])
    expect(html).toBe(
      '<div data-line="0">hello <span class="wn-bold"><span class="wn-punct">**</span>world<span class="wn-punct">**</span></span> here</div>',
    )
  })

  it('escapes HTML in bold content', () => {
    const text = '**<script>alert(1)</script>**'
    const tokens = tokenizeDocument(
      text,
      [boldPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [boldPlugin])
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('renderDocumentToHTML: italic', () => {
  it('renders italic text', () => {
    const text = 'some *italic* word'
    const tokens = tokenizeDocument(
      text,
      [italicPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [italicPlugin])
    expect(html).toBe(
      '<div data-line="0">some <span class="wn-italic"><span class="wn-punct">*</span>italic<span class="wn-punct">*</span></span> word</div>',
    )
  })
})

describe('renderDocumentToHTML: inline code', () => {
  it('renders inline code', () => {
    const text = 'use `const x = 1` here'
    const tokens = tokenizeDocument(
      text,
      [inlineCodePlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [inlineCodePlugin])
    expect(html).toBe(
      '<div data-line="0">use <span class="wn-inline-code"><span class="wn-punct">`</span><span class="wn-code-text">const x = 1</span><span class="wn-punct">`</span></span> here</div>',
    )
  })

  it('escapes HTML in code content', () => {
    const text = '`<div>`'
    const tokens = tokenizeDocument(
      text,
      [inlineCodePlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [inlineCodePlugin])
    expect(html).toContain('&lt;div&gt;')
  })
})

describe('renderDocumentToHTML: strikethrough', () => {
  it('renders strikethrough text', () => {
    const text = '~~removed~~ text'
    const tokens = tokenizeDocument(
      text,
      [strikethroughPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [strikethroughPlugin])
    expect(html).toBe(
      '<div data-line="0"><span class="wn-strikethrough" data-raw="~~removed~~"><span class="wn-punct">~~</span>removed<span class="wn-punct">~~</span></span> text</div>',
    )
  })
})

describe('renderDocumentToHTML: headings', () => {
  it('renders h1', () => {
    const text = '# Title'
    const tokens = tokenizeDocument(
      text,
      [headingsPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [headingsPlugin])
    expect(html).toBe(
      '<div data-line="0"><span class="wn-h1"><span class="wn-punct"># </span><span class="wn-h1-text">Title</span></span></div>',
    )
  })

  it('renders h2', () => {
    const text = '## Subtitle'
    const tokens = tokenizeDocument(
      text,
      [headingsPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [headingsPlugin])
    expect(html).toContain('class="wn-h2"')
    expect(html).toContain('## ')
  })

  it('renders h3', () => {
    const text = '### Deep'
    const tokens = tokenizeDocument(
      text,
      [headingsPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [headingsPlugin])
    expect(html).toContain('class="wn-h3"')
    expect(html).toContain('### ')
  })

  it('renders inline markdown within heading', () => {
    const text = '# Hello **world**'
    const tokens = tokenizeDocument(
      text,
      [headingsPlugin, boldPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [headingsPlugin, boldPlugin])
    expect(html).toContain('class="wn-bold"')
  })
})

describe('renderDocumentToHTML: wiki links', () => {
  it('renders wiki link', () => {
    const text = 'see [[projects/acme]]'
    const tokens = tokenizeDocument(
      text,
      [wikiLinkPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [wikiLinkPlugin])
    expect(html).toContain('class="wn-wiki-link"')
    expect(html).toContain('data-page="projects/acme"')
    expect(html).toContain('>acme<')
  })

  it('renders wiki link with custom display text', () => {
    const text = 'see [[projects/acme|Client Portal]]'
    const tokens = tokenizeDocument(
      text,
      [wikiLinkPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [wikiLinkPlugin])
    expect(html).toContain('data-page="projects/acme"')
    expect(html).toContain('>Client Portal<')
  })

  it('escapes special chars in page name and display', () => {
    const text = '[[page"name|dis<play]]'
    const tokens = tokenizeDocument(
      text,
      [wikiLinkPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [wikiLinkPlugin])
    expect(html).toContain('data-page="page&quot;name"')
    expect(html).toContain('>dis&lt;play<')
  })
})

describe('renderDocumentToHTML: links', () => {
  it('renders external link as anchor', () => {
    const text = 'visit [Example](https://example.com) now'
    const tokens = tokenizeDocument(
      text,
      [linkPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [linkPlugin])
    expect(html).toContain('<a class="wn-link"')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('>Example</a>')
  })

  it('renders internal link as wiki-link span', () => {
    const text = 'see [page](projects/acme) now'
    const tokens = tokenizeDocument(
      text,
      [linkPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [linkPlugin])
    expect(html).toContain('class="wn-wiki-link"')
    expect(html).toContain('data-page="projects/acme"')
    expect(html).toContain('>page<')
  })
})

describe('renderDocumentToHTML: blockquote', () => {
  it('renders blockquote', () => {
    const text = '> quoted text'
    const tokens = tokenizeDocument(
      text,
      [blockquotePlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [blockquotePlugin])
    expect(html).toContain('class="wn-blockquote"')
    expect(html).toContain('class="wn-punct"')
    expect(html).toContain('&gt;')
    expect(html).toContain('quoted text')
  })

  it('renders inline markdown within blockquote', () => {
    const text = '> **bold** quote'
    const tokens = tokenizeDocument(
      text,
      [blockquotePlugin, boldPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [blockquotePlugin, boldPlugin])
    expect(html).toContain('class="wn-bold"')
  })
})

describe('renderDocumentToHTML: horizontal rule', () => {
  it('renders hr', () => {
    const text = '---'
    const tokens = tokenizeDocument(
      text,
      [hrPlugin].flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, [hrPlugin])
    expect(html).toBe(
      '<div data-line="0"><span class="wn-hr">---</span></div>',
    )
  })
})

describe('renderDocumentToHTML: full document', () => {
  it('renders a realistic document with multiple token types', () => {
    const text = `# My Notes

This is **bold** and *italic* text.

> A blockquote with **bold**

see [[projects/acme]] and [Example](https://example.com)

\`\`\` (not a token)
`

    const tokens = tokenizeDocument(
      text,
      allContentPlugins.flatMap((p) => p.tokens),
    )
    const html = renderDocumentToHTML(tokens, allContentPlugins)

    // H1
    expect(html).toContain('class="wn-h1"')
    expect(html).toContain('My Notes')

    // Bold
    expect(html).toContain('class="wn-bold"')

    // Italic
    expect(html).toContain('class="wn-italic"')

    // Blockquote with nested bold
    expect(html).toContain('class="wn-blockquote"')

    // Wiki link
    expect(html).toContain('class="wn-wiki-link"')
    expect(html).toContain('data-page="projects/acme"')

    // External link
    expect(html).toContain('href="https://example.com"')

    // Backticks NOT rendered as inline code (no closing backtick before `(`)
    // The text "`\`\`\` (not a token)`" includes a mix that shouldn't match inline code

    // Empty line gets <br>
    expect(html).toContain('<br>')

    // Line numbers
    expect(html).toContain('data-line="0"')
    expect(html).toContain('data-line="7"')
  })
})

describe('renderInlineHTML', () => {
  it('renders plain text', () => {
    const html = renderInlineHTML('hello', [])
    expect(html).toBe('hello')
  })

  it('renders bold text', () => {
    const html = renderInlineHTML('**bold**', [boldPlugin])
    expect(html).toContain('class="wn-bold"')
  })

  it('renders mixed content', () => {
    const html = renderInlineHTML('[[test]] and **bold**', [wikiLinkPlugin, boldPlugin])
    expect(html).toContain('class="wn-wiki-link"')
    expect(html).toContain('class="wn-bold"')
    expect(html).toContain(' and ')
  })

  it('escapes HTML in plain text', () => {
    const html = renderInlineHTML('<script>', [])
    expect(html).toBe('&lt;script&gt;')
  })
})

describe('renderLineToHTML', () => {
  it('renders line through plugins', () => {
    const tokens: Token[] = [
      { type: 'text', raw: 'see ', groups: ['see '] },
      { type: 'wiki-link', raw: '[[test]]', groups: ['test'] },
    ]
    const ctx: StaticRenderContext = {
      renderInline: (t: string) => t,
    }
    const html = renderLineToHTML(tokens, [wikiLinkPlugin], ctx)
    expect(html).toContain('class="wn-wiki-link"')
    expect(html).toContain('see ')
  })

  it('falls back to raw text for unknown token types', () => {
    const tokens: Token[] = [{ type: 'unknown', raw: '<raw>', groups: [] }]
    const ctx: StaticRenderContext = {
      renderInline: (t: string) => t,
    }
    const html = renderLineToHTML(tokens, [], ctx)
    expect(html).toBe('&lt;raw&gt;')
  })

  it('falls back to raw text when plugin lacks renderToHTML', () => {
    const plugin: ContentPlugin = {
      name: 'no-html',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'nohtml', pattern: /test/ }],
      render(_token: Token): HTMLElement {
        return document.createElement('span')
      },
    }
    const tokens: Token[] = [{ type: 'nohtml', raw: 'test', groups: ['test'] }]
    const ctx: StaticRenderContext = {
      renderInline: (t: string) => t,
    }
    const html = renderLineToHTML(tokens, [plugin], ctx)
    expect(html).toBe('test')
  })
})

describe('renderInlineHTML: no renderToHTML fallback', () => {
  it('falls back to escaped raw text when plugin lacks renderToHTML', () => {
    const plugin: ContentPlugin = {
      name: 'no-html-inline',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'test', pattern: /test/ }],
      render(_token: Token): HTMLElement {
        return document.createElement('span')
      },
    }
    const html = renderInlineHTML('test', [plugin])
    expect(html).toBe('test')
  })
})

describe('renderInlineHTML: recursive renderInline context', () => {
  it('passes StaticRenderContext with renderInline to plugins', () => {
    const recursivePlugin: ContentPlugin = {
      name: 'recursive-test',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'outer', pattern: /\{(.*)\}/ }],
      renderToHTML(token: Token, context: StaticRenderContext): string {
        const inner = context.renderInline(token.groups[0] ?? '')
        return `<span class="outer">${inner}</span>`
      },
      render(_token: Token): HTMLElement {
        return document.createElement('span')
      },
    }

    const html = renderInlineHTML(
      '{**bold inside**}',
      [recursivePlugin, boldPlugin],
    )
    expect(html).toContain('class="outer"')
    expect(html).toContain('class="wn-bold"')
  })
})
