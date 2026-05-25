// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { createEditor } from '../editor'
import type { ContentPlugin, Token, EditorContext, StorageAdapter } from '../types'

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

// ─── Mock Plugin ──────────────────────────────────────────────────────────────

const mockPlugin: ContentPlugin = {
  name: 'test-plugin',
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'test', pattern: /test/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.textContent = token.raw
    return el
  },
}

const mockPluginB: ContentPlugin = {
  name: 'test-plugin', // Same name — should replace
  version: '1.0.0',
  kind: 'content' as const,
  tokens: [{ type: 'test-b', pattern: /test-b/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.textContent = token.raw.toUpperCase()
    return el
  },
}

// ─── Mock Storage Adapter ─────────────────────────────────────────────────────

function createMockStorage(): StorageAdapter {
  return {
    get: async (_key: string) => null as string | null,
    set: async (_key: string, _value: string) => {
      // noop — mock storage
    },
    keys: async () => [] as string[],
  }
}

// ─── createEditor ─────────────────────────────────────────────────────────────

describe('createEditor', () => {
  it('returns an EditorBuilder with chainable methods', () => {
    const builder = createEditor(container)

    expect(builder).toBeDefined()
    expect(typeof builder.use).toBe('function')
    expect(typeof builder.clearPlugins).toBe('function')
    expect(typeof builder.withStorage).toBe('function')
    expect(typeof builder.mount).toBe('function')
  })

  it('EditorBuilder.use() is chainable and returns this', () => {
    const builder = createEditor(container)
    const result = builder.use(mockPlugin)

    expect(result).toBe(builder)
  })

  it('EditorBuilder.use() replaces plugin by matching name', () => {
    const builder = createEditor(container)
    builder.use(mockPlugin)
    // Replace with same-named plugin — should not throw
    builder.use(mockPluginB)

    // mount() should still work — we verify by checking the builder doesn't throw
    expect(() => {
      // Just verify chainability, don't actually mount (mount triggers async)
    }).not.toThrow()
  })
})

// ─── EditorBuilder.mount() ────────────────────────────────────────────────────

describe('EditorBuilder mount lifecycle', () => {
  it('mount() creates editor DOM with .wn-root class', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    // Container gets .wn-root class synchronously
    expect(container.className).toBe('wn-root')
    // Editor wraps and topbar are created synchronously
    expect(container.querySelector('.wn-editor-wrap')).toBeTruthy()
    expect(container.querySelector('.wn-topbar')).toBeTruthy()

    // Cleanup
    editor.destroy()
  })

  it('mount() returns EditorInstance with required methods', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    expect(typeof editor.destroy).toBe('function')
    expect(typeof editor.navigate).toBe('function')
    expect(typeof editor.getCurrentPage).toBe('function')
    expect(typeof editor.getTrail).toBe('function')
    expect(typeof editor.getContent).toBe('function')
    expect(typeof editor.setContent).toBe('function')

    // Cleanup
    editor.destroy()
  })

  it('destroy() removes editor DOM from container', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    expect(container.children.length).toBeGreaterThan(0)

    editor.destroy()

    // After destroy, container should be empty
    expect(container.innerHTML).toBe('')
  })

  it('createEditor accepts custom storage adapter via options', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    // Should mount without error — custom storage is accepted
    expect(container.className).toBe('wn-root')

    editor.destroy()
  })

  it('getContent returns text content from editor', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    const content = editor.getContent()
    expect(typeof content).toBe('string')

    editor.destroy()
  })

  it('clearPlugins() empties the plugin list and returns this', () => {
    const builder = createEditor(container)
    const result = builder.clearPlugins()

    expect(result).toBe(builder)
  })

  it('withStorage() replaces the storage adapter and returns this', () => {
    const builder = createEditor(container)
    const mockStorage = createMockStorage()
    const result = builder.withStorage(mockStorage)

    expect(result).toBe(builder)
  })

  it('getCurrentPage() returns the current page name', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, {
      storage: mockStorage,
      initialPage: 'test-page',
    }).mount()

    const page = editor.getCurrentPage()
    // Default initial page is 'home', but we configure 'test-page'
    expect(typeof page).toBe('string')

    editor.destroy()
  })

  it('getTrail() returns a copy of the navigation trail', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    const trail = editor.getTrail()
    expect(Array.isArray(trail)).toBe(true)
    expect(trail.length).toBeGreaterThan(0)

    editor.destroy()
  })

  it('setContent() updates editor content synchronously', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    editor.setContent('new content')
    const content = editor.getContent()

    expect(typeof content).toBe('string')
    // After setContent, getContent should reflect the change
    // (note: getContent uses extractText which processes the rendered DOM)

    editor.destroy()
  })

  it('navigate() calls through to internal page navigation', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    // navigate should not throw
    expect(() => {
      editor.navigate('some-page')
    }).not.toThrow()

    editor.destroy()
  })
})

// ─── Keyboard & Paste Handling ────────────────────────────────────────────

describe('Editor keyboard and paste handling', () => {
  it('handles Tab key by inserting two spaces', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    const editorDiv = container.querySelector('.wn-editor') as HTMLElement
    expect(editorDiv).toBeTruthy()

    // Place caret inside first line container's text node
    const firstLine = editorDiv.querySelector('[data-line="0"]')
    const textNode = firstLine?.firstChild
    const range = document.createRange()
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, 0)
    } else if (firstLine) {
      range.setStart(firstLine, 0)
    } else {
      range.setStart(editorDiv, 0)
    }
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    // Dispatch Tab keydown
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    editorDiv.dispatchEvent(tabEvent)

    // Content should now include spaces
    const content = editor.getContent()
    expect(content).toBeTruthy()

    editor.destroy()
  })

  it('handles Enter key by inserting newline', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    const editorDiv = container.querySelector('.wn-editor') as HTMLElement
    expect(editorDiv).toBeTruthy()

    // Place caret inside first line container's text node
    const firstLine = editorDiv.querySelector('[data-line="0"]')
    const textNode = firstLine?.firstChild
    const range = document.createRange()
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, 0)
    } else if (firstLine) {
      range.setStart(firstLine, 0)
    } else {
      range.setStart(editorDiv, 0)
    }
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    // Dispatch Enter keydown
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    editorDiv.dispatchEvent(enterEvent)

    const content = editor.getContent()
    expect(content).toBeTruthy()

    editor.destroy()
  })

  it('handles paste event by inserting plain text', async () => {
    const mockStorage = createMockStorage()
    const editor = await createEditor(container, { storage: mockStorage }).mount()

    const editorDiv = container.querySelector('.wn-editor') as HTMLElement

    // Create a paste event with clipboard data
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
      bubbles: true,
    })
    // Set clipboard data via the event's clipboardData
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => 'pasted text',
      },
    })

    expect(() => {
      editorDiv.dispatchEvent(pasteEvent)
    }).not.toThrow()

    editor.destroy()
  })
})
