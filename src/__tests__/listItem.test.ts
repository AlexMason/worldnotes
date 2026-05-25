// @vitest-environment happy-dom

import * as Y from 'yjs'
import { describe, it, expect } from 'vitest'
import { listItemPlugin } from '../plugins/listItem'
import type { Token, EditorContext } from '../types'

function createToken(type: string, raw: string, groups: string[]): Token {
  return { type, raw, groups }
}

function createContext(overrides: Partial<EditorContext> = {}): EditorContext {
  const mockDoc = new Y.Doc()
  return {
    navigate: () => {
      // noop
    },
    getTrail: () => ['home'],
    getCurrentPage: () => 'home',
    getWorld: () => ({}),
    getDoc: () => mockDoc,
    ...overrides,
  }
}

function renderPlugin(
  plugin: { render: (token: Token, context: EditorContext) => HTMLElement | Text },
  token: Token,
  context: EditorContext,
): HTMLElement {
  return plugin.render(token, context) as HTMLElement
}

// ─── Tokenization ──────────────────────────────────────────────────────────────

describe('listItemPlugin tokenization', () => {
  const pattern = listItemPlugin.tokens[0].pattern

  it('matches dash list item', () => {
    const m = '- milk'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('')
    expect(m![2]).toBe('-')
    expect(m![3]).toBe('milk')
  })

  it('matches asterisk list item', () => {
    const m = '* eggs'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('*')
    expect(m![3]).toBe('eggs')
  })

  it('matches plus list item', () => {
    const m = '+ butter'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('+')
  })

  it('matches indented list item', () => {
    const m = '  - nested'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('  ')
    expect(m![2]).toBe('-')
    expect(m![3]).toBe('nested')
  })

  it('matches deeply indented list item', () => {
    const m = '    * deep'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('    ')
  })

  it('does not match plain text', () => {
    expect('hello'.match(pattern)).toBeNull()
  })

  it('does not match heading', () => {
    expect('# heading'.match(pattern)).toBeNull()
  })

  it('does not match marker without space', () => {
    expect('-no-space'.match(pattern)).toBeNull()
  })

  it('matches empty content after marker', () => {
    const m = '- '.match(pattern)
    expect(m).not.toBeNull()
    expect(m![3]).toBe('')
  })
})

// ─── Rendering ─────────────────────────────────────────────────────────────────

describe('listItemPlugin rendering', () => {
  it('renders a basic list item', () => {
    const token = createToken('list-item', '- milk', ['', '-', 'milk'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.className).toBe('wn-list-item')
    expect(el.dataset.raw).toBe('- milk')

    // Should have 2 children: marker span, content span (no indent)
    expect(el.children).toHaveLength(2)

    expect(el.children[0].className).toBe('wn-list-item-marker')
    expect(el.children[0].textContent).toBe('- ')

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].textContent).toBe('milk')
  })

  it('renders an indented list item with indent span', () => {
    const token = createToken('list-item', '  - nested', ['  ', '-', 'nested'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.className).toBe('wn-list-item')
    expect(el.dataset.raw).toBe('  - nested')

    // Should have 3 children: indent span, marker span, content span
    expect(el.children).toHaveLength(3)

    expect(el.children[0].className).toBe('wn-list-item-indent')
    expect(el.children[0].textContent).toBe('  ')

    expect(el.children[1].className).toBe('wn-list-item-marker')
    expect(el.children[1].textContent).toBe('- ')

    expect(el.children[2].className).toBe('wn-list-item-content')
    expect(el.children[2].textContent).toBe('nested')
  })

  it('renders asterisk list item', () => {
    const token = createToken('list-item', '* item', ['', '*', 'item'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.classList.contains('wn-list-item')).toBe(true)
    expect(el.children[0].textContent).toBe('* ')
  })

  it('renders plus list item', () => {
    const token = createToken('list-item', '+ item', ['', '+', 'item'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.children[0].textContent).toBe('+ ')
  })

  it('renders empty content', () => {
    const token = createToken('list-item', '- ', ['', '-', ''])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].textContent).toBe('')
  })

  it('renders inline markdown within content when renderInline is provided', () => {
    const token = createToken('list-item', '- **bold** text', ['', '-', '**bold** text'])
    const inlineFragment = document.createDocumentFragment()
    const boldEl = document.createElement('span')
    boldEl.className = 'wn-bold'
    boldEl.textContent = 'bold'
    inlineFragment.appendChild(boldEl)

    const context = createContext({
      renderInline: (_text: string) => inlineFragment,
    })

    const el = renderPlugin(listItemPlugin, token, context)

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].childNodes).toHaveLength(1)
    expect(el.children[1].childNodes[0]).toBe(boldEl)
  })
})

// ─── Static HTML ───────────────────────────────────────────────────────────────

describe('listItemPlugin renderToHTML', () => {
  it('renders basic list item as HTML string', () => {
    const token = createToken('list-item', '- milk', ['', '-', 'milk'])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })

    expect(html).toContain('class="wn-list-item"')
    expect(html).toContain('data-raw="- milk"')
    expect(html).toContain('class="wn-list-item-marker"')
    expect(html).toContain('- ')
    expect(html).toContain('class="wn-list-item-content"')
    expect(html).toContain('milk')
  })

  it('renders indented list item with indent span', () => {
    const token = createToken('list-item', '  * nested', ['  ', '*', 'nested'])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })

    expect(html).toContain('class="wn-list-item-indent"')
    expect(html).not.toContain('undefined')
  })

  it('falls back to empty string for empty groups', () => {
    const token = createToken('list-item', '- ', [])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })
    expect(html).not.toContain('undefined')
  })
})

// ─── onKeydown Tab ─────────────────────────────────────────────────────────────

describe('listItemPlugin onKeydown', () => {
  it('returns false for non-list-item line on Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('hello world')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">hello world</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const result = listItemPlugin.onKeydown!(event, context)

    document.body.removeChild(editorDiv)
    expect(result).toBeFalsy()
  })

  it('indents a list item on Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk\n- eggs')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">- milk</div><div data-line="1">- eggs</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 4) // after '- mi'
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const keydownResult = result as { cursorOffset: number }
    expect(keydownResult.cursorOffset).toBeGreaterThan(0)

    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toContain('  - milk')

    document.body.removeChild(editorDiv)
  })

  it('dedents a list item on Shift+Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('  - milk\n- eggs')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">  - milk</div><div data-line="1">- eggs</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 6)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toContain('- milk')
    expect(newRaw).not.toContain('  - milk')

    document.body.removeChild(editorDiv)
  })

  it('consumes event but makes no change for list item at level 0 on Shift+Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">- milk</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 2)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    const result = listItemPlugin.onKeydown!(event, context)

    // Should consume the event even though no change is made
    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toBe('- milk') // unchanged

    document.body.removeChild(editorDiv)
  })

  // ── Enter key ───────────────────────────────────────────────────────────

  it('auto-continues list item on Enter (splits at cursor)', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk\nplain')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">- milk</div><div data-line="1">plain</div>'

    // cursor after '- ' (before 'milk')
    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 2)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    const lines = newRaw.split('\n')
    expect(lines[0]).toBe('- ')
    expect(lines[1]).toBe('- milk')
    expect(lines[2]).toBe('plain')

    document.body.removeChild(editorDiv)
  })

  it('removes empty list item on Enter (exits list)', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- \nplain')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">- </div><div data-line="1">plain</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 2) // after "- "
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    const lines = newRaw.split('\n')
    expect(lines[0]).toBe('')
    expect(lines[1]).toBe('plain')

    document.body.removeChild(editorDiv)
  })

  it('returns false for non-list-item line on Enter', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('hello world')
    pages.set('home', ytext)

    const editorDiv = document.createElement('div')
    document.body.appendChild(editorDiv)
    editorDiv.innerHTML = '<div data-line="0">hello world</div>'

    const textNode = editorDiv.querySelector('[data-line="0"]')!.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).toBeFalsy()

    document.body.removeChild(editorDiv)
  })
})
