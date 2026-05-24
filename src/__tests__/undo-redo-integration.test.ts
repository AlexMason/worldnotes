// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  ContentPlugin,
  UIPlugin,
  StorageAdapter,
  EditorOptions,
  EditorContext,
  Token,
} from '../types'
import type { EditorStateAPI } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import type { EditorRenderAPI } from '../editor-render'
import type { EditorNavigationAPI } from '../editor-navigation'
import { createEditorLifecycle } from '../editor-lifecycle'
import { EditorHistory } from '../editor-history'
import { extractText } from '../cursor'

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
  const world: Record<string, string> = {}
  let trail: string[] = initialTrail ? [...initialTrail] : ['home']
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false
  const history = new EditorHistory()

  return {
    world,
    history,
    getTrail: () => [...trail],
    getWorld: () => ({ ...world }),
    setWorldPage: (page: string, content: string) => {
      world[page] = content
    },
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
      getWorld: () => ({ ...world }),
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

  return { container, topbar, breadcrumb, toolbar, editorWrap, editorDiv, placeholder }
}

function mockRender(): EditorRenderAPI {
  return {
    render: vi.fn(),
    renderBreadcrumb: vi.fn(),
    syncUrlToTrail: vi.fn(),
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

// ─── Undo/Redo Integration Tests ───────────────────────────────────────────────

describe('undo/redo in editor lifecycle', () => {
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
    render = mockRender()
    navigation = mockNavigation()
    plugins = mockPlugins()
    options = {}
  })

  describe('EditorInstance undo/redo methods', () => {
    it('returns EditorInstance with undo, redo, canUndo, canRedo methods', () => {
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
      const instance = lifecycle.mount()

      expect(typeof instance.undo).toBe('function')
      expect(typeof instance.redo).toBe('function')
      expect(typeof instance.canUndo).toBe('function')
      expect(typeof instance.canRedo).toBe('function')
    })

    it('canUndo returns false immediately after mount', () => {
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
      const instance = lifecycle.mount()

      expect(instance.canUndo()).toBe(false)
    })

    it('undo returns false when nothing to undo', () => {
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
      const instance = lifecycle.mount()

      expect(instance.undo()).toBe(false)
    })
  })

  describe('input handler pushes to history', () => {
    it('calls history.push with current content when input event fires', () => {
      const pushSpy = vi.spyOn(state.history, 'push')

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
      lifecycle.mount()

      pushSpy.mockClear()

      dom.editorDiv.textContent = 'initial content'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      expect(pushSpy).toHaveBeenCalledWith('initial content')
    })
  })

  describe('Ctrl+Z undo via keydown', () => {
    it('restores previous content on Ctrl+Z', () => {
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
      lifecycle.mount()

      dom.editorDiv.textContent = 'first version'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      dom.editorDiv.textContent = 'second version'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const ctrlz = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlz)

      expect(dom.editorDiv.textContent).toBe('first version')
      expect(render.render).toHaveBeenCalled()
    })

    it('does nothing when undo stack is empty', () => {
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
      lifecycle.mount()

      const before = 'only content'
      dom.editorDiv.textContent = before

      const ctrlz = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlz)

      expect(dom.editorDiv.textContent).toBe(before)
    })
  })

  describe('Ctrl+Shift+Z redo via keydown', () => {
    it('restores undone content on Ctrl+Shift+Z', () => {
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
      lifecycle.mount()

      dom.editorDiv.textContent = 'state A'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      dom.editorDiv.textContent = 'state B'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const ctrlz = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlz)

      expect(dom.editorDiv.textContent).toBe('state A')

      const ctrlShiftZ = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlShiftZ)

      expect(dom.editorDiv.textContent).toBe('state B')
    })
  })

  describe('Ctrl+Y redo', () => {
    it('restores undone content on Ctrl+Y', () => {
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
      lifecycle.mount()

      dom.editorDiv.textContent = 'alpha'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      dom.editorDiv.textContent = 'beta'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const ctrlz = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlz)

      expect(dom.editorDiv.textContent).toBe('alpha')

      const ctrlY = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlY)

      expect(dom.editorDiv.textContent).toBe('beta')
    })
  })

  describe('setContent is undoable', () => {
    it('pushes current content to history before replacing', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'before'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      instance.setContent('after')

      // World cache should be updated
      expect(state.world['home']).toBe('after')

      // Undo should restore 'before'
      const ctrlz = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(ctrlz)

      expect(dom.editorDiv.textContent).toBe('before')
    })
  })

  describe('programmatic undo/redo via EditorInstance', () => {
    it('undo() restores previous content and updates world cache', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'first'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      dom.editorDiv.textContent = 'second'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      expect(instance.undo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('first')
      expect(state.world['home']).toBe('first')

      expect(instance.redo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('second')
      expect(state.world['home']).toBe('second')
    })
  })

  describe('canUndo / canRedo reflect stack state', () => {
    it('reflects empty stacks after mount', () => {
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
      const instance = lifecycle.mount()

      expect(instance.canUndo()).toBe(false)
      expect(instance.canRedo()).toBe(false)
    })

    it('canUndo is true after two edits', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'edit 1'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'edit 2'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      expect(instance.canUndo()).toBe(true)
    })

    it('canRedo is true after undo', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'v1'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'v2'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      instance.undo()

      expect(instance.canRedo()).toBe(true)
      expect(instance.canUndo()).toBe(false)
    })
  })

  describe('Cmd key support (macOS)', () => {
    it('undo works with Cmd+Z', () => {
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
      lifecycle.mount()

      dom.editorDiv.textContent = 'first'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      dom.editorDiv.textContent = 'second'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const cmdZ = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(cmdZ)

      expect(dom.editorDiv.textContent).toBe('first')
    })

    it('redo works with Cmd+Shift+Z', () => {
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
      lifecycle.mount()

      dom.editorDiv.textContent = 'A'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'B'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      const cmdZ = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(cmdZ)

      const cmdShiftZ = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      })
      dom.editorDiv.dispatchEvent(cmdShiftZ)

      expect(dom.editorDiv.textContent).toBe('B')
    })
  })

  describe('multi-step undo redo sequence', () => {
    it('handles alternating undo and redo', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'one'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'two'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'three'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      // Undo to 'two'
      expect(instance.undo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('two')

      // Undo to 'one'
      expect(instance.undo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('one')

      // Redo to 'two'
      expect(instance.redo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('two')

      // Redo to 'three'
      expect(instance.redo()).toBe(true)
      expect(dom.editorDiv.textContent).toBe('three')
    })

    it('editing after undo clears redo stack', () => {
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
      const instance = lifecycle.mount()

      dom.editorDiv.textContent = 'x'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      dom.editorDiv.textContent = 'y'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      // Undo to 'x'
      instance.undo()
      expect(dom.editorDiv.textContent).toBe('x')

      // New edit after undo clears redo stack
      dom.editorDiv.textContent = 'z'
      dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

      expect(instance.canRedo()).toBe(false)
    })
  })
})
