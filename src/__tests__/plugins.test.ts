// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'
import { headingsPlugin } from '../plugins/headings'
import {
  boldPlugin,
  italicPlugin,
  inlineCodePlugin,
  blockquotePlugin,
  hrPlugin,
} from '../plugins/inline'
import { wikiLinkPlugin } from '../plugins/wikiLink'
import type { Token, EditorContext } from '../types'

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createToken(type: string, raw: string, groups: string[]): Token {
  return { type, raw, groups }
}

function createContext(overrides: Partial<EditorContext> = {}): EditorContext {
  return {
    navigate: () => {},
    getTrail: () => [],
    getWorld: () => ({}),
    ...overrides,
  }
}

/**
 * Helper: call plugin.render() and cast to HTMLElement.
 * All built-in plugins return HTMLElement (never Text), but Plugin.render()
 * is typed as HTMLElement | Text for extensibility.
 */
function renderPlugin(
  plugin: { render: (token: Token, context: EditorContext) => HTMLElement | Text },
  token: Token,
  context: EditorContext,
): HTMLElement {
  return plugin.render(token, context) as HTMLElement
}

// ─── Headings Plugin ──────────────────────────────────────────────────────────

describe('headingsPlugin', () => {
  it('renders h1 heading with correct DOM structure', () => {
    const token = createToken('h1', '# Title', ['Title'])
    const el = renderPlugin(headingsPlugin, token, createContext())

    expect(el.className).toBe('wn-h1')
    expect(el.children).toHaveLength(2)

    // First child: punct span
    expect(el.children[0].className).toBe('wn-punct')
    expect(el.children[0].textContent).toBe('# ')

    // Second child: content span
    expect(el.children[1].className).toBe('wn-h1-text')
    expect(el.children[1].textContent).toBe('Title')
  })

  it('renders h2 heading with correct DOM structure', () => {
    const token = createToken('h2', '## Section', ['Section'])
    const el = renderPlugin(headingsPlugin, token, createContext())

    expect(el.className).toBe('wn-h2')
    expect(el.children).toHaveLength(2)

    // First child: punct span
    expect(el.children[0].className).toBe('wn-punct')
    expect(el.children[0].textContent).toBe('## ')

    // Second child: content span
    expect(el.children[1].className).toBe('wn-h2-text')
    expect(el.children[1].textContent).toBe('Section')
  })

  it('renders h3 heading with correct DOM structure', () => {
    const token = createToken('h3', '### Sub', ['Sub'])
    const el = renderPlugin(headingsPlugin, token, createContext())

    expect(el.className).toBe('wn-h3')
    expect(el.children).toHaveLength(2)

    // First child: punct span
    expect(el.children[0].className).toBe('wn-punct')
    expect(el.children[0].textContent).toBe('### ')

    // Second child: content span
    expect(el.children[1].className).toBe('wn-h3-text')
    expect(el.children[1].textContent).toBe('Sub')
  })

  it('renders heading with empty content after marker', () => {
    const token = createToken('h1', '# ', [''])
    const el = renderPlugin(headingsPlugin, token, createContext())

    expect(el.className).toBe('wn-h1')
    expect(el.children).toHaveLength(2)
    expect(el.children[1].className).toBe('wn-h1-text')
    expect(el.children[1].textContent).toBe('')
  })

  it('falls through to default case for unknown token type', () => {
    const token = createToken('unknown', 'some text', ['some text'])
    const el = renderPlugin(headingsPlugin, token, createContext())

    // Default case renders using renderHeading with levelCls='wn-h1'
    expect(el.className).toBe('wn-h1')
    expect(el.children).toHaveLength(2)
    expect(el.children[0].className).toBe('wn-punct')
    // Default puntText is ''
    expect(el.children[0].textContent).toBe('')
    expect(el.children[1].className).toBe('wn-h1-text')
    expect(el.children[1].textContent).toBe('some text')
  })
})

// ─── Inline Plugins ───────────────────────────────────────────────────────────

describe('inline plugins', () => {
  describe('boldPlugin', () => {
    it('renders bold text with punct markers on both sides', () => {
      const token = createToken('bold', '**bold text**', ['bold text'])
      const el = renderPlugin(boldPlugin, token, createContext())

      expect(el.className).toBe('wn-bold')
      expect(el.childNodes).toHaveLength(3)

      // First: punct span with **
      expect(el.childNodes[0].nodeType).toBe(1) // ELEMENT_NODE
      expect((el.childNodes[0] as HTMLElement).className).toBe('wn-punct')
      expect(el.childNodes[0].textContent).toBe('**')

      // Middle: text node
      expect(el.childNodes[1].nodeType).toBe(3) // TEXT_NODE
      expect(el.childNodes[1].textContent).toBe('bold text')

      // Last: punct span with **
      expect(el.childNodes[2].nodeType).toBe(1) // ELEMENT_NODE
      expect((el.childNodes[2] as HTMLElement).className).toBe('wn-punct')
      expect(el.childNodes[2].textContent).toBe('**')
    })

    it('handles empty group with fallback to empty string', () => {
      const token = createToken('bold', '****', [''])
      const el = renderPlugin(boldPlugin, token, createContext())

      expect(el.className).toBe('wn-bold')
      expect(el.childNodes[1].textContent).toBe('')
    })
  })

  describe('italicPlugin', () => {
    it('renders italic text with punct markers on both sides', () => {
      const token = createToken('italic', '*italic text*', ['italic text'])
      const el = renderPlugin(italicPlugin, token, createContext())

      expect(el.className).toBe('wn-italic')
      expect(el.childNodes).toHaveLength(3)
      expect(el.childNodes[0].textContent).toBe('*')
      expect(el.childNodes[1].textContent).toBe('italic text')
      expect(el.childNodes[2].textContent).toBe('*')
    })
  })

  describe('inlineCodePlugin', () => {
    it('renders inline code with backtick punct and code-text span', () => {
      const token = createToken('inline-code', '`const x = 1`', ['const x = 1'])
      const el = renderPlugin(inlineCodePlugin, token, createContext())

      expect(el.className).toBe('wn-inline-code')
      expect(el.children).toHaveLength(3)

      // First child: punct backtick
      expect(el.children[0].className).toBe('wn-punct')
      expect(el.children[0].textContent).toBe('`')

      // Second child: wn-code-text span
      expect(el.children[1].className).toBe('wn-code-text')
      expect(el.children[1].textContent).toBe('const x = 1')

      // Third child: punct backtick
      expect(el.children[2].className).toBe('wn-punct')
      expect(el.children[2].textContent).toBe('`')
    })
  })

  describe('blockquotePlugin', () => {
    it('renders blockquote with punct and content spans', () => {
      const token = createToken('blockquote', '> A wise quote', ['> ', 'A wise quote'])
      const el = renderPlugin(blockquotePlugin, token, createContext())

      expect(el.className).toBe('wn-blockquote')
      expect(el.children).toHaveLength(2)

      // Punct span
      expect(el.children[0].className).toBe('wn-punct')
      expect(el.children[0].textContent).toBe('> ')

      // Content span
      expect(el.children[1].className).toBe('wn-blockquote-text')
      expect(el.children[1].textContent).toBe('A wise quote')
    })

    it('handles blockquote with empty content', () => {
      const token = createToken('blockquote', '> ', ['> ', ''])
      const el = renderPlugin(blockquotePlugin, token, createContext())

      expect(el.className).toBe('wn-blockquote')
      expect(el.children[1].textContent).toBe('')
    })
  })

  describe('hrPlugin', () => {
    it('renders horizontal rule with hardcoded text', () => {
      const token = createToken('hr', '---', [])
      const el = renderPlugin(hrPlugin, token, createContext())

      expect(el.className).toBe('wn-hr')
      expect(el.textContent).toBe('---')
    })
  })
})

// ─── Wiki Link Plugin ─────────────────────────────────────────────────────────

describe('wikiLinkPlugin', () => {
  it('renders wiki link with page and display attributes', () => {
    const token = createToken('wiki-link', '[[projects/acme]]', ['projects/acme'])
    const el = renderPlugin(wikiLinkPlugin, token, createContext())

    expect(el.className).toBe('wn-wiki-link')
    expect(el.dataset.page).toBe('projects/acme')
    expect(el.dataset.raw).toBe('[[projects/acme]]')
    expect(el.textContent).toBe('acme')
  })

  it('renders wiki link with pipe display text', () => {
    const token = createToken('wiki-link', '[[projects/acme|Client Portal]]', [
      'projects/acme|Client Portal',
    ])
    const el = renderPlugin(wikiLinkPlugin, token, createContext())

    expect(el.className).toBe('wn-wiki-link')
    expect(el.dataset.page).toBe('projects/acme')
    expect(el.dataset.raw).toBe('[[projects/acme|Client Portal]]')
    expect(el.textContent).toBe('Client Portal')
  })

  it('calls context.navigate on onNavigate with correct page', () => {
    const navigate = vi.fn()
    const context = createContext({ navigate })

    const token = createToken('wiki-link', '[[projects/acme]]', ['projects/acme'])
    const result = wikiLinkPlugin.onNavigate!(token, context)

    expect(navigate).toHaveBeenCalledWith('projects/acme')
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it('handles wiki link with pipe display in onNavigate', () => {
    const navigate = vi.fn()
    const context = createContext({ navigate })

    const token = createToken('wiki-link', '[[projects/acme|Client Portal]]', [
      'projects/acme|Client Portal',
    ])
    const result = wikiLinkPlugin.onNavigate!(token, context)

    expect(navigate).toHaveBeenCalledWith('projects/acme')
    expect(result).toBe(true)
  })
})
