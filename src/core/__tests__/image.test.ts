import { describe, it, expect } from 'vitest'
import { imagePlugin } from '../plugins/image'
import { scanInline } from '../tokenizer'
import { defaultPlugins } from '../plugins/defaults'
import type { Token, EditorContext } from '../types'

function createContext(): EditorContext {
  return {
    navigate: () => undefined,
    getTrail: () => [],
    getCurrentPage: () => 'home',
    getWorld: () => ({}),
    getPageText: () => '',
    setPageText: () => undefined,
  }
}

function token(src: string): Token {
  const m = src.match(imagePlugin.tokens[0].pattern)!
  return { type: 'image', raw: m[0], groups: m.slice(1).map((g) => g ?? '') }
}

describe('imagePlugin tokenization', () => {
  it('captures alt and src', () => {
    const m = 'x ![Diagram](/assets/d.png) y'.match(imagePlugin.tokens[0].pattern)
    expect(m).not.toBeNull()
    expect(m![0]).toBe('![Diagram](/assets/d.png)')
    expect(m![1]).toBe('Diagram')
    expect(m![2]).toBe('/assets/d.png')
  })

  it('allows empty alt, requires src without whitespace', () => {
    expect('![](/a.png)'.match(imagePlugin.tokens[0].pattern)).not.toBeNull()
    expect('![a](has space.png)'.match(imagePlugin.tokens[0].pattern)).toBeNull()
  })

  it('binds before linkPlugin at scan position 0 (ordering holds)', () => {
    const defs = defaultPlugins.flatMap((p) => p.tokens)
    const tokens = scanInline('see ![a](/i.png) here', defs)
    expect(tokens.map((t) => t.type)).toEqual(['text', 'image', 'text'])
  })

  it('loses to linkPlugin for linked images (known degradation)', () => {
    const defs = defaultPlugins.flatMap((p) => p.tokens)
    const types = scanInline('[![a](/i.png)](/p)', defs).map((t) => t.type)
    expect(types).toContain('link')
    expect(types).not.toContain('image')
  })
})

describe('imagePlugin DOM rendering', () => {
  it('renders punct-fidelity tree with a real <img>', () => {
    const el = imagePlugin.render(token('![alt](/a.png)'), createContext()) as HTMLElement
    expect(el.className).toBe('wn-image')
    // NO data-raw: DOM text must equal the source exactly (caret math)
    expect(el.dataset.raw).toBeUndefined()
    expect(el.textContent).toBe('![alt](/a.png)')
    const img = el.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/a.png')
    expect(img.getAttribute('alt')).toBe('alt')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('unsafe src degrades to a literal text node', () => {
    const raw = '![a](javascript:alert1)' // no ')' inside — token captures whole
    const node = imagePlugin.render(token(raw), createContext())
    expect(node.nodeType).toBe(Node.TEXT_NODE)
    expect(node.textContent).toBe(raw)
  })
})

describe('imagePlugin static rendering', () => {
  const ctx = { renderInline: (t: string) => t }

  it('emits the same tree as the DOM path', () => {
    const html = imagePlugin.renderToHTML!(token('![alt](/a.png)'), ctx)
    expect(html).toContain('<img class="wn-image-img" src="/a.png" alt="alt"')
    expect(html).toContain('<span class="wn-punct">![</span>')
    expect(html).toContain('<span class="wn-image-src">/a.png</span>')
  })

  it('attribute-breakout payload cannot open a new attribute', () => {
    // The exact B4 vector: src = x"onerror="y  (matched by [^)\s]+)
    const html = imagePlugin.renderToHTML!(token('![a](x"onerror="y)'), ctx)
    expect(html).toContain('<img') // still on-origin → renders
    expect(html).not.toMatch(/<img[^>]*"\s+onerror=/)
    expect(html).toContain('src="x&quot;onerror=&quot;y"')
  })

  it('escapes alt text in text and attribute positions', () => {
    const html = imagePlugin.renderToHTML!(token('![<b>&](/a.png)'), ctx)
    expect(html).toContain('<span class="wn-image-alt">&lt;b&gt;&amp;</span>')
    expect(html).toContain('alt="&lt;b&gt;&amp;"')
  })

  it.each([
    '![a](data:texthtml,<svg>)',
    '![a](mailto:x@y.z)',
    '![a](\\evil.com\\x.png)',
    '![a](//evil.test/x.png)',
  ])('unsafe src %s stays escaped literal', (src) => {
    const html = imagePlugin.renderToHTML!(token(src), ctx)
    expect(html).not.toContain('<img')
    expect(html).toContain('![a](') // the token source stays visible, escaped
  })
})
