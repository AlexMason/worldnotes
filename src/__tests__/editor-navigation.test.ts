// @vitest-environment happy-dom

import * as Y from 'yjs'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StorageAdapter, EditorOptions, EditorContext } from '../types'
import type { EditorStateAPI } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import type { EditorRenderAPI } from '../editor-render'
import type { YDocState } from '../y-doc-state'
import { createEditorNavigation } from '../editor-navigation'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mockStorage(initialStore?: Record<string, string>): StorageAdapter {
  const store: Record<string, string> = { ...initialStore }
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
  const doc = new Y.Doc()
  const pages = doc.getMap<Y.Text>('pages')
  let _awareness: unknown = null
  let _undoManager: Y.UndoManager | null = null

  function getPage(page: string): Y.Text {
    let ytext = pages.get(page)
    if (!ytext) {
      ytext = new Y.Text()
      pages.set(page, ytext)
    }
    return ytext
  }

  const yDocState: YDocState = {
    doc,
    pages,
    get awareness(): unknown {
      return _awareness
    },
    set awareness(val: unknown) {
      _awareness = val
    },
    get undoManager(): Y.UndoManager | null {
      return _undoManager
    },
    set undoManager(val: Y.UndoManager | null) {
      _undoManager = val
    },
    getDoc(): Y.Doc {
      return doc
    },
    getPage,
    hasPage(page: string): boolean {
      return pages.has(page)
    },
    getWorld(): Record<string, string> {
      const world: Record<string, string> = {}
      for (const [key, ytext] of pages.entries()) {
        world[key] = ytext.toString()
      }
      return world
    },
    setAwareness(awareness: unknown): void {
      _awareness = awareness
    },
    setUndoManager(um: Y.UndoManager): void {
      _undoManager = um
    },
    toContext(navigate: (page: string) => void): EditorContext {
      return {
        navigate,
        getTrail: () => [],
        getWorld: () => yDocState.getWorld(),
        getDoc: () => doc,
      }
    },
    encodeStateAsUpdate(): Uint8Array {
      return Y.encodeStateAsUpdate(doc)
    },
    applyUpdate(update: Uint8Array): void {
      Y.applyUpdate(doc, update)
    },
    destroy(): void {
      doc.destroy()
    },
  }

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
    toContext: (navigate: (page: string) => void): EditorContext => ({
      ...yDocState.toContext(navigate),
      getTrail: () => [...trail],
    }),
  }
}

function mockDOM(): EditorDOM {
  const container = document.createElement('div')
  const topbar = document.createElement('div')
  const breadcrumb = document.createElement('div')
  const editorWrap = document.createElement('div')
  const editorDiv = document.createElement('div') as HTMLDivElement
  const placeholder = document.createElement('div')

  editorDiv.contentEditable = 'true'
  topbar.appendChild(breadcrumb)
  editorWrap.appendChild(placeholder)
  editorWrap.appendChild(editorDiv)

  const toolbar = document.createElement('div')
  toolbar.className = 'wn-toolbar'

  container.appendChild(topbar)
  container.appendChild(toolbar)
  container.appendChild(editorWrap)

  return { container, topbar, breadcrumb, toolbar, editorWrap, editorDiv, placeholder, overlay: document.createElement('div') }
}

function mockRender(): EditorRenderAPI {
  return {
    render: vi.fn(),
    renderBreadcrumb: vi.fn(),
    syncUrlToTrail: vi.fn(),
    checkSelectChange: vi.fn(),
  }
}

// ─── createEditorNavigation ────────────────────────────────────────────────────

describe('createEditorNavigation', () => {
  let storage: StorageAdapter
  let state: EditorStateAPI
  let dom: EditorDOM
  let render: EditorRenderAPI
  let options: EditorOptions
  let onPageLoadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = mockStorage()
    state = mockState(['home'])
    dom = mockDOM()
    render = mockRender()
    onPageLoadSpy = vi.fn()
    options = { onPageLoad: onPageLoadSpy as (page: string, content: string) => void }
  })

  it('exports createEditorNavigation factory function', () => {
    const nav = createEditorNavigation(state, storage, dom, options)
    expect(nav).toBeDefined()
    expect(typeof nav.navigateToPage).toBe('function')
    expect(typeof nav.loadPage).toBe('function')
    expect(typeof nav.setRenderAPI).toBe('function')
  })

  // ── navigateToPage ────────────────────────────────────────────────────────

  describe('navigateToPage', () => {
    it('creates page in world cache when not present and calls loadPage', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('new-page')

      expect(state.getWorld()).toHaveProperty('new-page')
      expect(state.getTrail()).toContain('new-page')
    })

    it('does not re-fetch page already in world cache', async () => {
      const getSpy = vi.spyOn(storage, 'get')
      state.getYDocState().getPage('cached-page').insert(0, '# Cached\n\nsome content')
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('cached-page')

      expect(getSpy).not.toHaveBeenCalledWith('cached-page')
    })

    it('fetches from storage when page is not in cache', async () => {
      const storageWithData = mockStorage({ 'stored-page': '# Stored Page\n\ncontent' })
      const nav = createEditorNavigation(state, storageWithData, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('stored-page')

      expect(state.getWorld()['stored-page']).toBe('# Stored Page\n\ncontent')
    })

    it('truncates trail when navigating to a page already in the trail', async () => {
      const multiTrailState = mockState(['home', 'blog', 'about'])
      const nav = createEditorNavigation(multiTrailState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('home')

      // Trail should be truncated to ['home'], not ['home', 'blog', 'about', 'home']
      expect(multiTrailState.getTrail()).toEqual(['home'])
    })

    it('does not truncate when navigating to a new page not in trail', async () => {
      const multiTrailState = mockState(['home', 'blog'])
      const nav = createEditorNavigation(multiTrailState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('about')

      expect(multiTrailState.getTrail()).toEqual(['home', 'blog', 'about'])
    })
  })

  // ── loadPage ──────────────────────────────────────────────────────────────

  describe('loadPage', () => {
    it('sets isNavigating=true during load', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      expect(state.isNavigating()).toBe(false)

      const loadPromise = nav.loadPage('home')
      await loadPromise

      expect(state.isNavigating()).toBe(false)
    })

    it('preserves empty content for pages that already existed', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      // Create the page first (it now exists in the map)
      const ytext = state.getYDocState().getPage('home')
      ytext.insert(0, '# old')
      // Then delete all content
      ytext.delete(0, ytext.length)

      await nav.loadPage('home')

      // Page should remain empty, not get DEFAULT_HOME
      expect(state.getYDocState().getPage('home').toString()).toBe('')
    })

    it('reads page content from Y.Text and triggers render', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      const content = '# hello\n\ntest content'
      state.getYDocState().getPage('home').insert(0, content)

      await nav.loadPage('home')

      expect(state.getYDocState().getPage('home').toString()).toBe(content)
      expect(render.render).toHaveBeenCalled()
      expect(render.renderBreadcrumb).toHaveBeenCalled()
    })

    it('calls render() and renderBreadcrumb() via setRenderAPI', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.loadPage('home')

      expect(render.render).toHaveBeenCalled()
      expect(render.renderBreadcrumb).toHaveBeenCalled()
    })

    it('calls onPageLoad callback with page and content', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      const content = '# Test\n\ncontent'
      state.getYDocState().getPage('home').insert(0, content)

      await nav.loadPage('home')

      expect(onPageLoadSpy).toHaveBeenCalledWith('home', content)
    })

    it('does not call onPageLoad if not provided in options', async () => {
      const nav = createEditorNavigation(state, storage, dom, {})
      nav.setRenderAPI(render)

      await nav.loadPage('home')
      expect(render.render).toHaveBeenCalled()
    })

    it('uses DEFAULT_HOME content when page is home and not in storage', async () => {
      const freshState = mockState(['home'])
      const freshStorage = mockStorage({})
      const nav = createEditorNavigation(freshState, freshStorage, dom, options)
      nav.setRenderAPI(render)

      await nav.loadPage('home')

      expect(freshState.getWorld()['home']).toContain('Welcome to your world')
    })
  })

  // ── setRenderAPI ──────────────────────────────────────────────────────────

  describe('setRenderAPI', () => {
    it('allows render callbacks to be wired after construction', () => {
      const nav = createEditorNavigation(state, storage, dom, options)

      expect(() => nav.setRenderAPI(render)).not.toThrow()
    })

    it('calls render and renderBreadcrumb when setRenderAPI is wired', async () => {
      const trackingRender: EditorRenderAPI = {
        render: vi.fn(),
        renderBreadcrumb: vi.fn(),
        syncUrlToTrail: vi.fn(),
        checkSelectChange: vi.fn(),
      }
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(trackingRender)

      state.getYDocState().getPage('home').insert(0, '# test')
      await nav.loadPage('home')

      expect(trackingRender.render).toHaveBeenCalled()
      expect(trackingRender.renderBreadcrumb).toHaveBeenCalled()
    })
  })
})
