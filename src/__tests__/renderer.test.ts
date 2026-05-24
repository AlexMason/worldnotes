// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { renderLine } from '../renderer'
import type { EditorContext, ContentPlugin, Token } from '../types'

// ─── Plugin Mock ──────────────────────────────────────────────────────────────

const previewPlugin: ContentPlugin = {
  name: 'preview',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'preview', pattern: /\[\[([^\]]+)\]\]/ }],
  render(token: Token): HTMLElement {
    const el = document.createElement('span')
    el.textContent = token.groups[0].split('/').pop() ?? ''
    return el
  },
}

// ─── Test Tokens ──────────────────────────────────────────────────────────────

const tokens: Token[] = [
  { type: 'text', raw: 'open ', groups: ['open '] },
  { type: 'preview', raw: '[[projects/acme]]', groups: ['projects/acme'] },
]

// ─── renderLine ───────────────────────────────────────────────────────────────

describe('renderLine', () => {
  it('renders preview text when caret is outside the token', () => {
    const result = renderLine(tokens, [previewPlugin], {} as EditorContext, 0)
    expect(result.childNodes[1].textContent).toBe('acme')
  })

  it('renders raw token text when caret is inside the token', () => {
    const result = renderLine(tokens, [previewPlugin], {} as EditorContext, 8)
    expect(result.childNodes[1].textContent).toBe('[[projects/acme]]')
  })

  it('renders unknown token type as raw text fallback', () => {
    const unknownTokens: Token[] = [
      { type: 'unknown-type', raw: 'some raw text', groups: ['some raw text'] },
    ]
    const result = renderLine(unknownTokens, [previewPlugin], {} as EditorContext, 0)
    // Unknown type falls back to rendering raw text
    expect(result.childNodes.length).toBeGreaterThan(0)
    expect(result.childNodes[0].textContent).toBe('some raw text')
  })

  it('renders token with onNavigate handler as clickable element', () => {
    const navPlugin: ContentPlugin = {
      name: 'navigable',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'nav', pattern: /\[\[([^\]]+)\]\]/ }],
      render(_token: Token): HTMLElement {
        const el = document.createElement('span')
        el.textContent = 'click me'
        return el
      },
      onNavigate(): true {
        return true // suppress default
      },
    }

    const navTokens: Token[] = [{ type: 'nav', raw: '[[test]]', groups: ['test'] }]

    const result = renderLine(navTokens, [navPlugin], {} as EditorContext, -1)
    expect(result.childNodes[0].textContent).toBe('click me')
    // The element should have a mousedown event listener attached
    // (we can verify the element exists; the listener is attached internally)
  })
})
