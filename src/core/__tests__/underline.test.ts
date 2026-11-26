// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { underlinePlugin } from '../plugins/underline'
import { defaultPlugins } from '../plugins/defaults'
import { renderDocumentHtml } from '../static-renderer'
import { tokenizeLine } from '../tokenizer'
import type { EditorContext, Token } from '../types'

const defs = defaultPlugins.flatMap((p) => p.tokens)

describe('underline grammar', () => {
  it('tokenizes the exact <u>…</u> pair with surrounding text', () => {
    const tokens = tokenizeLine('a <u>under</u> b', defs)
    expect(tokens.map((t) => [t.type, t.raw])).toEqual([
      ['text', 'a '],
      ['underline', '<u>under</u>'],
      ['text', ' b'],
    ])
  })

  it('is not general inline HTML: other tags and nested tags stay text', () => {
    for (const src of ['<b>x</b>', '<u></u>', '<u><b>x</b></u>', '<U>x</U>', '<u>x']) {
      expect(tokenizeLine(src, defs).some((t) => t.type === 'underline')).toBe(false)
    }
  })

  it('editor DOM: dimmed open/close markers, raw source kept on the span', () => {
    const token: Token = { type: 'underline', raw: '<u>hi</u>', groups: ['hi'] }
    const el = underlinePlugin.render(token, {} as EditorContext) as HTMLElement
    expect(el.className).toBe('wn-underline')
    expect(el.dataset.raw).toBe('<u>hi</u>')
    expect(Array.from(el.childNodes).map((n) => n.textContent)).toEqual(['<u>', 'hi', '</u>'])
    expect((el.firstChild as HTMLElement).className).toBe('wn-punct')
    expect((el.lastChild as HTMLElement).className).toBe('wn-punct')
  })

  it('reader: a classed span, markers escaped, never a raw <u> element', () => {
    const html = renderDocumentHtml('x <u>a & b</u> y', defaultPlugins)
    expect(html).toBe(
      '<div data-line="0">x <span class="wn-underline" data-raw="&lt;u&gt;a &amp; b&lt;/u&gt;"><span class="wn-punct">&lt;u&gt;</span>a &amp; b<span class="wn-punct">&lt;/u&gt;</span></span> y</div>',
    )
    expect(html).not.toMatch(/<u[ >]/)
  })

  it('reader: tags outside the exact pair are escaped text', () => {
    const html = renderDocumentHtml('<u><script>alert(1)</script></u>', defaultPlugins)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('class="wn-underline"')
  })

  it('does not interfere with bold/italic/strike on the same line', () => {
    const html = renderDocumentHtml('**b** <u>u</u> *i* ~~s~~', defaultPlugins)
    for (const cls of ['wn-bold', 'wn-underline', 'wn-italic', 'wn-strikethrough']) {
      expect(html).toContain(`class="${cls}"`)
    }
  })
})
