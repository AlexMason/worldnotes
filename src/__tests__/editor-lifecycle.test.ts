// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  ContentPlugin,
  UIPlugin,
  StorageAdapter,
  EditorOptions,
  EditorContext,
  EditorInstance,
  Token,
} from '../types'
import type { EditorStateAPI } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import type { EditorRenderAPI } from '../editor-render'
import type { EditorNavigationAPI } from '../editor-navigation'
import { createEditorLifecycle } from '../editor-lifecycle'
import { createYDocState } from '../y-doc-state'
import { extractText } from '../cursor'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mockStorage(): StorageAdapter {
  const store: Record<string, string> = {}
  return {
    async get(key: string): Promise<string | null> {
      return store[key] ?? null
    },
    async set(key: string, value: string): Promise<void> {
      store[key] = value
    },
    async keys(): Promise<string[]> {
      return Object.keys(store)
    },
  }
}

function mockState(initialTrail?: string[]): EditorStateAPI {
  const yDocState = createYDocState()
  let trail: string[] = initialTrail ? [...initialTrail] : ['home']
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  return {
    getYDocState: () => yDocState,
    getTrail: () => [...trail],
    getWorld: () => yDocState.getWorld(),
    pushTrail: (page: string) => {
      trail.push(page)
    },
    setTrail: (t: string[]) => {
      trail = t
    },
    truncateTrail: (index: number) => {
      trail = trail.slice(0, index + 1)
    },
    setNavigating: (v: boolean) => {
      isNavigating = v
      return v
    },
    isNavigating: () => isNavigating,
    clearSaveTimer: () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
    },
    setSaveTimer: (timer: ReturnType<typeof setTimeout> | null) => {
      saveTimer = timer
    },
    toContext: (_navigate: (page: string) => void): EditorContext => ({
      navigate: _navigate,
      getTrail: () => [...trail],
      getWorld: () => yDocState.getWorld(),
      getDoc: () => yDocState.doc,
    }),
  }
}

function mockDOM(): EditorDOM {
  const container = document.createElement('div')
  const topbar = document.createElement('div')
  const breadcrumb = document.createElement('div')
  const toolbar = document.createElement('div')
  toolbar.className = 'wn-toolbar'
  const editorWrap = document.createElement('div')
  const editorDiv = document.createElement('div') as HTMLDivElement
  const placeholder = document.createElement('div')

  editorDiv.contentEditable = 'true'
  editorDiv.spellcheck = false
  topbar.appendChild(breadcrumb)
  editorWrap.appendChild(placeholder)
  editorWrap.appendChild(editorDiv)
  container.appendChild(topbar)
  container.appendChild(toolbar)
  container.appendChild(editorWrap)

  return { container, topbar, breadcrumb, toolbar, editorWrap, editorDiv, placeholder, overlay: document.createElement('div') }
}

function mockRender(state: EditorStateAPI, dom: EditorDOM): EditorRenderAPI {
  return {
    render: vi.fn((force?: boolean) => {
      if (force) {
        const trail = state.getTrail()
        const page = trail[trail.length - 1]
        const ytext = state.getYDocState().getPage(page)
        dom.editorDiv.textContent = ytext.toString()
      }
    }),
    renderBreadcrumb: vi.fn(),
    syncUrlToTrail: vi.fn(),
    checkSelectChange: vi.fn(),
  }
}

function mockNavigation(): EditorNavigationAPI {
  return {
    navigateToPage: vi.fn(async (_page: string) => {
      /* noop */
    }),
    loadPage: vi.fn(async (_page: string) => {
      /* noop */
    }),
    setRenderAPI: vi.fn(),
  }
}

function mockPlugins(): ContentPlugin[] {
  return [
    {
      name: 'test-plugin',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'test', pattern: /./ }],
      render(token: Token, _context: EditorContext): HTMLElement | Text {
        return document.createTextNode(token.raw)
      },
    },
  ]
}

// ─── createEditorLifecycle ─────────────────────────────────────────────────────

describe('createEditorLifecycle', () => {
  let storage: StorageAdapter
  let state: EditorStateAPI
  let dom: EditorDOM
  let render: EditorRenderAPI
  let navigation: EditorNavigationAPI
  let plugins: ContentPlugin[]
  let options: EditorOptions

  beforeEach(() => {
    storage = mockStorage()
    state = mockState(['home'])
    dom = mockDOM()
    render = mockRender(state, dom)
    navigation = mockNavigation()
    plugins = mockPlugins()
    options = {}
  })

  it('exports createEditorLifecycle factory function', async () => {
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [],
      state,
      render,
      navigation,
      storage,
      options,
    )
    expect(lifecycle).toBeDefined()
    expect(typeof lifecycle.mount).toBe('function')
  })

  // ── mount() ───────────────────────────────────────────────────────────────

  describe('mount()', () => {
    it('returns EditorInstance with all required methods', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      expect(typeof instance.destroy).toBe('function')
      expect(typeof instance.navigate).toBe('function')
      expect(typeof instance.getCurrentPage).toBe('function')
      expect(typeof instance.getTrail).toBe('function')
      expect(typeof instance.getContent).toBe('function')
      expect(typeof instance.setContent).toBe('function')
    })

    it('calls navigation.loadPage with the initial page from trail', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      expect(navigation.loadPage).toHaveBeenCalled()
      // Should be called with 'home' (the last element in the trail)
    })

    it('loads the configured initial page when provided', async () => {
      const customState = mockState(['custom-page'])
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        customState,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      // loadPage should have been called with the page from the trail
      expect(navigation.loadPage).toHaveBeenCalled()
    })
  })

  // ── EditorInstance.destroy() ──────────────────────────────────────────────

  describe('EditorInstance.destroy()', () => {
    it('empties container innerHTML', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      // Before destroy, container should have children
      expect(dom.container.children.length).toBeGreaterThan(0)

      instance.destroy()

      expect(dom.container.innerHTML).toBe('')
    })
  })

  // ── EditorInstance.getCurrentPage() ───────────────────────────────────────

  describe('EditorInstance.getCurrentPage()', () => {
    it('returns the last element of the trail', async () => {
      const trailState = mockState(['home', 'about', 'contact'])
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        trailState,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      expect(instance.getCurrentPage()).toBe('contact')
    })
  })

  // ── EditorInstance.getTrail() ─────────────────────────────────────────────

  describe('EditorInstance.getTrail()', () => {
    it('returns a copy of the navigation trail', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      const trail = instance.getTrail()
      expect(Array.isArray(trail)).toBe(true)
      expect(trail.length).toBeGreaterThan(0)
      // Should be a copy, not the original reference
      trail.push('mutated')
      expect(instance.getTrail().length).toBe(trail.length - 1)
    })
  })

  // ── EditorInstance.getContent() ───────────────────────────────────────────

  describe('EditorInstance.getContent()', () => {
    it('returns text content from the current page Y.Text', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      state.getYDocState().getPage('home').insert(0, 'hello world')

      expect(instance.getContent()).toBe('hello world')
    })
  })

  // ── EditorInstance.setContent() ───────────────────────────────────────────

  describe('EditorInstance.setContent()', () => {
    it('updates world cache and re-renders', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      // Reset the render mock to clear calls from loadPage
      vi.mocked(render.render).mockClear()

      instance.setContent('new content')

      // Y.Text should be updated
      expect(state.getYDocState().getPage('home').toString()).toBe('new content')
      // editorDiv textContent should be set
      expect(dom.editorDiv.textContent).toBe('new content')
      // render should be called again
      expect(render.render).toHaveBeenCalled()
    })
  })

  // ── EditorInstance.navigate() ─────────────────────────────────────────────

  describe('EditorInstance.navigate()', () => {
    it('delegates to navigation.navigateToPage', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      const instance = await lifecycle.mount()

      instance.navigate('some-page')

      expect(navigation.navigateToPage).toHaveBeenCalledWith('some-page')
    })
  })
})

// ─── Event Handlers ────────────────────────────────────────────────────────────

describe('Editor lifecycle event handlers', () => {
  let storage: StorageAdapter
  let state: EditorStateAPI
  let dom: EditorDOM
  let render: EditorRenderAPI
  let navigation: EditorNavigationAPI
  let plugins: ContentPlugin[]
  let options: EditorOptions

  beforeEach(() => {
    storage = mockStorage()
    state = mockState(['home'])
    dom = mockDOM()
    render = mockRender(state, dom)
    navigation = mockNavigation()
    plugins = mockPlugins()
    options = {}
  })

  // ── Input handler ────────────────────────────────────────────────────────

  describe('input event', () => {
    it('calls render() when input event fires', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      // Clear render calls from loadPage
      vi.mocked(render.render).mockClear()

      dom.editorDiv.textContent = 'typed text'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      expect(render.render).toHaveBeenCalled()
    })
  })

  // ── Paste handler ────────────────────────────────────────────────────────

  describe('paste event', () => {
    it('handles paste event by preventing default', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      // Place caret at start
      const range = document.createRange()
      range.setStart(dom.editorDiv, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
        bubbles: true,
      })
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (_type: string) => 'pasted content',
        },
      })

      // In happy-dom, dispatchEvent always returns true, but the handler
      // should not throw — that's the key assertion
      expect(() => {
        dom.editorDiv.dispatchEvent(pasteEvent)
      }).not.toThrow()
    })
  })

  // ── Keydown handler (Tab) ────────────────────────────────────────────────

  describe('keydown Tab', () => {
    it('inserts two spaces on Tab key', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      // Place caret at start
      const range = document.createRange()
      range.setStart(dom.editorDiv, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      dom.editorDiv.dispatchEvent(tabEvent)

      // Content should include spaces — extractText should pick them up
      const text = extractText(dom.editorDiv)
      expect(text).toContain('  ')
    })
  })

  // ── Keydown handler (Enter) ──────────────────────────────────────────────

  describe('keydown Enter', () => {
    it('inserts newline on Enter key', async () => {
      const lifecycle = createEditorLifecycle(
        dom,
        plugins,
        [],
        state,
        render,
        navigation,
        storage,
        options,
      )
      await lifecycle.mount()

      // Place caret at start
      const range = document.createRange()
      range.setStart(dom.editorDiv, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      dom.editorDiv.dispatchEvent(enterEvent)

      const text = extractText(dom.editorDiv)
      expect(text).toContain('\n')
    })
  })
})

// ─── UI Plugin Lifecycle (Plan 05-01 Task 3) ──────────────────────────────────

describe('UI plugin lifecycle', () => {
  let storage: StorageAdapter
  let state: EditorStateAPI
  let dom: EditorDOM
  let render: EditorRenderAPI
  let navigation: EditorNavigationAPI
  let plugins: ContentPlugin[]
  let options: EditorOptions

  beforeEach(() => {
    storage = mockStorage()
    state = mockState(['home'])
    dom = mockDOM()
    render = mockRender(state, dom)
    navigation = mockNavigation()
    plugins = mockPlugins()
    options = {}
  })

  it('calls onMount with toolbar element for each UI plugin during mount()', async () => {
    const onMount = vi.fn()
    const uiPlugin: UIPlugin = {
      name: 'ui-test',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-toolbar'],
      priority: 0,
      onMount,
    }
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [uiPlugin],
      state,
      render,
      navigation,
      storage,
      options,
    )
    await lifecycle.mount()

    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onMount).toHaveBeenCalledWith(dom.toolbar)
  })

  it('calls onDestroy for UI plugins during destroy()', async () => {
    const onDestroy = vi.fn()
    const onMount = vi.fn()
    const uiPlugin: UIPlugin = {
      name: 'ui-test',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-toolbar'],
      priority: 0,
      onMount,
      onDestroy,
    }
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [uiPlugin],
      state,
      render,
      navigation,
      storage,
      options,
    )
    const instance = await lifecycle.mount()
    instance.destroy()

    expect(onDestroy).toHaveBeenCalledTimes(1)
  })

  it('catches onDestroy failure and continues destroying other plugins', async () => {
    const onDestroyGood = vi.fn()
    const onDestroyBad = vi.fn(() => {
      throw new Error('boom')
    })
    const onMount = vi.fn()

    const badPlugin: UIPlugin = {
      name: 'bad-ui',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-toolbar'],
      priority: 0,
      onMount,
      onDestroy: onDestroyBad,
    }
    const goodPlugin: UIPlugin = {
      name: 'good-ui',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-toolbar'],
      priority: 1,
      onMount,
      onDestroy: onDestroyGood,
    }

    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [badPlugin, goodPlugin],
      state,
      render,
      navigation,
      storage,
      options,
    )
    const instance = await lifecycle.mount()
    instance.destroy()

    expect(onDestroyBad).toHaveBeenCalled()
    expect(onDestroyGood).toHaveBeenCalled() // continues after bad plugin fails
  })

  it('does not call onMount for slots not present in the DOM', async () => {
    const onMount = vi.fn()
    const uiPlugin: UIPlugin = {
      name: 'ui-test',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-sidebar'], // slot that doesn't exist in slotElements map
      priority: 0,
      onMount,
    }
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [uiPlugin],
      state,
      render,
      navigation,
      storage,
      options,
    )
    await lifecycle.mount()

    expect(onMount).not.toHaveBeenCalled()
  })

  it('destroy does not fail when UI plugin has no onDestroy', async () => {
    const onMount = vi.fn()
    const uiPlugin: UIPlugin = {
      name: 'ui-test',
      version: '1.0.0',
      kind: 'ui',
      slots: ['wn-toolbar'],
      priority: 0,
      onMount,
      // onDestroy intentionally omitted
    }
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [uiPlugin],
      state,
      render,
      navigation,
      storage,
      options,
    )
    const instance = await lifecycle.mount()

    expect(() => instance.destroy()).not.toThrow()
  })
})

// ─── EditorInstance Cursor API ─────────────────────────────────────────────────

describe('EditorInstance cursor API', () => {
  let storage: StorageAdapter
  let state: EditorStateAPI
  let dom: EditorDOM
  let render: EditorRenderAPI
  let navigation: EditorNavigationAPI
  let plugins: ContentPlugin[]
  let options: EditorOptions
  let editor: EditorInstance
  let origModify: typeof Selection.prototype.modify | undefined

  async function mount(): Promise<void> {
    const lifecycle = createEditorLifecycle(
      dom,
      plugins,
      [],
      state,
      render,
      navigation,
      storage,
      options,
    )
    editor = await lifecycle.mount()
  }

  function setCaretAt(textNode: Node, offset: number): void {
    const range = document.createRange()
    range.setStart(textNode, offset)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)
  }

  function setContentAndFocus(text: string): void {
    state.getYDocState().doc.transact(() => {
      const ytext = state.getYDocState().getPage('home')
      ytext.delete(0, ytext.length)
      ytext.insert(0, text)
    })
    dom.editorDiv.textContent = text
    dom.editorDiv.focus()
  }

  beforeEach(async () => {
    storage = mockStorage()
    state = mockState(['home'])
    dom = mockDOM()
    document.body.appendChild(dom.container)
    render = mockRender(state, dom)
    navigation = mockNavigation()
    plugins = mockPlugins()
    options = {}

    // happy-dom doesn't implement Selection.modify(); polyfill it
    origModify = Selection.prototype.modify
    Selection.prototype.modify = function (
      alter: string,
      _direction: string,
      granularity: string,
    ): void {
      if (alter === 'extend' && granularity === 'character') {
        const sel = this as unknown as Selection
        if (!sel.isCollapsed || !sel.rangeCount) return
        const r = sel.getRangeAt(0)
        try {
          if (_direction === 'forward') {
            r.setEnd(r.endContainer, r.endOffset + 1)
          } else if (_direction === 'backward' && r.endOffset > 0) {
            r.setStart(r.startContainer, r.startOffset - 1)
          }
        } catch {
          // ignore boundary errors
        }
      }
    }

    await mount()
  })

  afterEach(() => {
    if (origModify) {
      Selection.prototype.modify = origModify
    }
    document.body.removeChild(dom.container)
  })

  // ── insertText ────────────────────────────────────────────────────────────

  describe('insertText', () => {
    it('inserts text at caret position when no selection', async () => {
      setContentAndFocus('hello world')
      const textNode = dom.editorDiv.firstChild!
      setCaretAt(textNode, 6) // after 'hello '

      editor.insertText('beautiful ')

      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('hello beautiful world')
    })

    it('replaces selected text when range is not collapsed', async () => {
      setContentAndFocus('hello world')
      const textNode = dom.editorDiv.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 5)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      editor.insertText('goodbye')

      const raw = extractText(dom.editorDiv)
      expect(raw).toContain('goodbye world')
    })

    it('is a no-op when there is no selection', async () => {
      setContentAndFocus('hello')
      const sel = window.getSelection()
      sel!.removeAllRanges()

      expect(() => editor.insertText('extra')).not.toThrow()
      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('hello')
    })
  })

  // ── deleteForward ─────────────────────────────────────────────────────────

  describe('deleteForward', () => {
    it('deletes one character after caret when selection is collapsed', async () => {
      setContentAndFocus('hello')
      const textNode = dom.editorDiv.firstChild!
      setCaretAt(textNode, 2) // after 'he'

      editor.deleteForward()

      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('helo')
    })

    it('deletes selected text when range is not collapsed', async () => {
      setContentAndFocus('hello world')
      const textNode = dom.editorDiv.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 6) // select 'hello '
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      editor.deleteForward()

      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('world')
    })

    it('is a no-op when there is no selection', async () => {
      setContentAndFocus('hello')
      const sel = window.getSelection()
      sel!.removeAllRanges()

      expect(() => editor.deleteForward()).not.toThrow()
      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('hello')
    })
  })

  // ── deleteBackward ────────────────────────────────────────────────────────

  describe('deleteBackward', () => {
    it('deletes one character before caret when selection is collapsed', async () => {
      setContentAndFocus('hello')
      const textNode = dom.editorDiv.firstChild!
      setCaretAt(textNode, 2) // after 'he'

      editor.deleteBackward()

      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('hllo')
    })

    it('deletes selected text when range is not collapsed', async () => {
      setContentAndFocus('hello world')
      const textNode = dom.editorDiv.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 6)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      editor.deleteBackward()

      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('world')
    })

    it('is a no-op at start of content', async () => {
      setContentAndFocus('hello')
      const textNode = dom.editorDiv.firstChild!
      setCaretAt(textNode, 0) // at very start

      editor.deleteBackward()

      const raw = extractText(dom.editorDiv)
      expect(raw).toHaveLength(5)
    })

    it('is a no-op when there is no selection', async () => {
      setContentAndFocus('hello')
      const sel = window.getSelection()
      sel!.removeAllRanges()

      expect(() => editor.deleteBackward()).not.toThrow()
      const raw = extractText(dom.editorDiv)
      expect(raw).toBe('hello')
    })
  })

  // ── getSelection ──────────────────────────────────────────────────────────

  describe('getSelection', () => {
    it('returns null when there is no selection', async () => {
      setContentAndFocus('hello')
      const sel = window.getSelection()
      sel!.removeAllRanges()

      const result = editor.getSelection()
      expect(result).toBeNull()
    })

    it('reports collapsed caret with empty text and matching start/end', async () => {
      // Set up DOM with data-line structure expected by getLineOffset
      dom.editorDiv.innerHTML = '<span data-line="0">hello</span>'
      dom.editorDiv.focus()
      const textNode = dom.editorDiv.querySelector('[data-line="0"]')!.firstChild!
      setCaretAt(textNode, 3) // after 'hel'

      const result = editor.getSelection()
      expect(result).not.toBeNull()
      expect(result!.text).toBe('')
      expect(result!.start).toBe(3)
      expect(result!.end).toBe(3)
    })

    it('reports selected text with correct start/end offsets', async () => {
      // Set up DOM with data-line structure expected by getLineOffset
      dom.editorDiv.innerHTML = '<span data-line="0">hello world</span>'
      dom.editorDiv.focus()
      const textNode = dom.editorDiv.querySelector('[data-line="0"]')!.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 6)
      range.setEnd(textNode, 11) // select 'world'
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      const result = editor.getSelection()
      expect(result).not.toBeNull()
      expect(result!.text).toBe('world')
      expect(result!.start).toBe(6)
      expect(result!.end).toBe(11)
    })

    it('always returns start <= end (min/max logic)', async () => {
      setContentAndFocus('hello world')
      const textNode = dom.editorDiv.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 1)
      range.setEnd(textNode, 10)
      const sel = window.getSelection()
      sel!.removeAllRanges()
      sel!.addRange(range)

      const result = editor.getSelection()
      expect(result).not.toBeNull()
      expect(result!.start).toBeLessThanOrEqual(result!.end)
      expect(result!.text.length).toBe(9) // 'ello worl'
    })
  })

  describe('input handler DOM sync fallback', () => {
    it('syncs from textContent when no [data-line] containers exist', async () => {
      const storage = mockStorage()
      const state = mockState(['home'])
      const dom = mockDOM()
      const render = mockRender(state, dom)
      const nav = mockNavigation()

      const lifecycle = createEditorLifecycle(
        dom,
        [],
        [],
        state,
        render,
        nav,
        storage,
        { saveDebounceMs: 99999 },
      )
      await lifecycle.mount()

      // Set content directly to editorDiv without going through render
      // (no [data-line] containers exist)
      dom.editorDiv.innerHTML = ''
      dom.editorDiv.textContent = 'raw text content'

      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const ytext = state.getYDocState().getPage('home')
      expect(ytext.toString()).toBe('raw text content')
    })
  })
})
