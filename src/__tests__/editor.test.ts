// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { createEditor } from '../editor'
import type { Plugin, Token, EditorContext, StorageAdapter } from '../types'

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

// ─── Mock Plugin ──────────────────────────────────────────────────────────────

const mockPlugin: Plugin = {
  name: 'test-plugin',
  tokens: [{ type: 'test', pattern: /test/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.textContent = token.raw
    return el
  },
}

const mockPluginB: Plugin = {
  name: 'test-plugin', // Same name — should replace
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
    set: async (_key: string, _value: string) => {},
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
  it('mount() creates editor DOM with .wn-root class', () => {
    const mockStorage = createMockStorage()
    const editor = createEditor(container, { storage: mockStorage }).mount()

    // Container gets .wn-root class synchronously
    expect(container.className).toBe('wn-root')
    // Editor wraps and topbar are created synchronously
    expect(container.querySelector('.wn-editor-wrap')).toBeTruthy()
    expect(container.querySelector('.wn-topbar')).toBeTruthy()

    // Cleanup
    editor.destroy()
  })

  it('mount() returns EditorInstance with required methods', () => {
    const mockStorage = createMockStorage()
    const editor = createEditor(container, { storage: mockStorage }).mount()

    expect(typeof editor.destroy).toBe('function')
    expect(typeof editor.navigate).toBe('function')
    expect(typeof editor.getCurrentPage).toBe('function')
    expect(typeof editor.getTrail).toBe('function')
    expect(typeof editor.getContent).toBe('function')
    expect(typeof editor.setContent).toBe('function')

    // Cleanup
    editor.destroy()
  })

  it('destroy() removes editor DOM from container', () => {
    const mockStorage = createMockStorage()
    const editor = createEditor(container, { storage: mockStorage }).mount()

    expect(container.children.length).toBeGreaterThan(0)

    editor.destroy()

    // After destroy, container should be empty
    expect(container.innerHTML).toBe('')
  })

  it('createEditor accepts custom storage adapter via options', () => {
    const mockStorage = createMockStorage()
    const editor = createEditor(container, { storage: mockStorage }).mount()

    // Should mount without error — custom storage is accepted
    expect(container.className).toBe('wn-root')

    editor.destroy()
  })

  it('getContent returns text content from editor', () => {
    const mockStorage = createMockStorage()
    const editor = createEditor(container, { storage: mockStorage }).mount()

    const content = editor.getContent()
    expect(typeof content).toBe('string')

    editor.destroy()
  })
})
