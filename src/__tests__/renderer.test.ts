// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { renderLine } from '../renderer'
import type { EditorContext, Plugin, Token } from '../types'

// ─── Plugin Mock ──────────────────────────────────────────────────────────────

const previewPlugin: Plugin = {
  name: 'preview',
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
})
