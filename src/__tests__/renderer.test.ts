// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { renderLine, renderInlineContent } from '../renderer'
import type { EditorContext, ContentPlugin, Token } from '../types'
import { wikiLinkPlugin } from '../plugins/wikiLink'
import { boldPlugin } from '../plugins/inline'

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

  it('renders link token through correct plugin (external)', () => {
    const linkContentPlugin: ContentPlugin = {
      name: 'link-test',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'link', pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
      render(token: Token): HTMLElement {
        const el = document.createElement('a')
        el.className = 'wn-link'
        el.href = token.groups[1] ?? ''
        el.target = '_blank'
        el.textContent = token.groups[0] ?? ''
        return el
      },
    }

    const linkTokens: Token[] = [
      {
        type: 'link',
        raw: '[Example](https://example.com)',
        groups: ['Example', 'https://example.com'],
      },
    ]

    const result = renderLine(linkTokens, [linkContentPlugin], {} as EditorContext, -1)
    const anchor = result.childNodes[0] as HTMLAnchorElement
    expect(anchor.tagName).toBe('A')
    expect(anchor.className).toBe('wn-link')
    expect(anchor.target).toBe('_blank')
    expect(anchor.textContent).toBe('Example')
  })
})

// ─── renderInlineContent ──────────────────────────────────────────────────────

describe('renderInlineContent', () => {
  const ctx = {} as EditorContext

  it('renders plain text as a single text node', () => {
    const fragment = renderInlineContent('hello world', [], ctx)
    expect(fragment.childNodes).toHaveLength(1)
    expect(fragment.childNodes[0].textContent).toBe('hello world')
  })

  it('renders wikilink through wikiLinkPlugin', () => {
    const fragment = renderInlineContent('[[test]]', [wikiLinkPlugin], ctx)
    expect(fragment.childNodes).toHaveLength(1)
    const el = fragment.childNodes[0] as HTMLElement
    expect(el.className).toBe('wn-wiki-link')
    expect(el.dataset.page).toBe('test')
    expect(el.textContent).toBe('test')
  })

  it('renders bold text through boldPlugin', () => {
    const fragment = renderInlineContent('**bold text**', [boldPlugin], ctx)
    const el = fragment.childNodes[0] as HTMLElement
    expect(el.className).toBe('wn-bold')
    expect(el.textContent).toBe('**bold text**')
  })

  it('renders mixed inline content (wikilink + text + bold)', () => {
    const fragment = renderInlineContent(
      '[[test]] and **bold**',
      [wikiLinkPlugin, boldPlugin],
      ctx,
    )
    expect(fragment.childNodes).toHaveLength(3)

    const linkEl = fragment.childNodes[0] as HTMLElement
    expect(linkEl.className).toBe('wn-wiki-link')
    expect(linkEl.dataset.page).toBe('test')

    expect(fragment.childNodes[1].textContent).toBe(' and ')

    const boldEl = fragment.childNodes[2] as HTMLElement
    expect(boldEl.className).toBe('wn-bold')
  })

  it('attaches onNavigate handler for navigable plugins', () => {
    const navPlugin: ContentPlugin = {
      name: 'nav-test',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'nav-wiki', pattern: /\[\[([^\]]+)\]\]/ }],
      render(token: Token): HTMLElement {
        const el = document.createElement('span')
        el.className = 'nav-link'
        el.dataset.page = token.groups[0] ?? ''
        return el
      },
      onNavigate(): true {
        return true
      },
    }

    const fragment = renderInlineContent('[[page]]', [navPlugin], ctx)
    const el = fragment.childNodes[0] as HTMLElement

    // Dispatch mousedown and verify default is prevented (onNavigate returns true)
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    const prevented = !el.dispatchEvent(event)
    expect(prevented).toBe(true)
  })

  it('returns empty fragment for empty string input', () => {
    const fragment = renderInlineContent('', [wikiLinkPlugin], ctx)
    expect(fragment.childNodes).toHaveLength(0)
  })

  it('renders as plain text when no plugins match', () => {
    const fragment = renderInlineContent(
      'no matching patterns here',
      [wikiLinkPlugin, boldPlugin],
      ctx,
    )
    expect(fragment.childNodes).toHaveLength(1)
    expect(fragment.childNodes[0].textContent).toBe('no matching patterns here')
  })
})
