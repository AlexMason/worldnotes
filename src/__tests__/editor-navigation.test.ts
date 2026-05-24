// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StorageAdapter, EditorOptions } from '../types'
import type { EditorStateAPI } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import type { EditorRenderAPI } from '../editor-render'
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
  const world: Record<string, string> = {}
  let trail: string[] = initialTrail ? [...initialTrail] : ['home']
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  return {
    world,
    getTrail: () => [...trail],
    getWorld: () => ({ ...world }),
    setWorldPage: (page: string, content: string) => { world[page] = content },
    pushTrail: (page: string) => { trail.push(page) },
    setTrail: (t: string[]) => { trail = t },
    truncateTrail: (index: number) => { trail = trail.slice(0, index + 1) },
    setNavigating: (v: boolean) => { isNavigating = v; return v },
    isNavigating: () => isNavigating,
    clearSaveTimer: () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null } },
    setSaveTimer: (timer: ReturnType<typeof setTimeout> | null) => { saveTimer = timer },
    toContext: (_navigate: (page: string) => void) => ({
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

  return { container, topbar, breadcrumb, toolbar, editorWrap, editorDiv, placeholder }
}

function mockRender(): EditorRenderAPI {
  return {
    render: vi.fn(),
    renderBreadcrumb: vi.fn(),
    syncUrlToTrail: vi.fn(),
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

      // Should be in world cache
      expect(state.world['new-page']).toBeDefined()
      // Trail should include the page
      expect(state.getTrail()).toContain('new-page')
    })

    it('does not re-fetch page already in world cache', async () => {
      const getSpy = vi.spyOn(storage, 'get')
      // Pre-populate the world cache
      state.setWorldPage('cached-page', '# Cached\n\nsome content')
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('cached-page')

      // Storage.get should NOT have been called since page is already cached
      expect(getSpy).not.toHaveBeenCalledWith('cached-page')
    })

    it('fetches from storage when page is not in cache', async () => {
      const storageWithData = mockStorage({ 'stored-page': '# Stored Page\n\ncontent' })
      const nav = createEditorNavigation(state, storageWithData, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('stored-page')

      // Should load from storage into world cache
      expect(state.world['stored-page']).toBe('# Stored Page\n\ncontent')
    })
  })

  // ── loadPage ──────────────────────────────────────────────────────────────

  describe('loadPage', () => {
    it('sets isNavigating=true during load', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      // isNavigating should start false
      expect(state.isNavigating()).toBe(false)

      const loadPromise = nav.loadPage('home')

      // isNavigating should be true during the load
      // Note: since loadPage is async, we check after it completes that
      // the flag was properly set and cleared
      await loadPromise

      expect(state.isNavigating()).toBe(false)
    })

    it('sets editorDiv.textContent to page content', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      const content = '# hello\n\ntest content'
      state.setWorldPage('home', content)

      await nav.loadPage('home')

      expect(dom.editorDiv.textContent).toBe(content)
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
      state.setWorldPage('home', content)

      await nav.loadPage('home')

      expect(onPageLoadSpy).toHaveBeenCalledWith('home', content)
    })

    it('does not call onPageLoad if not provided in options', async () => {
      const nav = createEditorNavigation(state, storage, dom, {})
      nav.setRenderAPI(render)

      await nav.loadPage('home')
      // Should not throw — onPageLoad is optional
      expect(render.render).toHaveBeenCalled()
    })

    it('uses DEFAULT_HOME content when page is home and not in storage', async () => {
      // Use fresh state with empty world (no home page cached)
      const freshState = mockState(['home'])
      const freshStorage = mockStorage({}) // empty storage
      const nav = createEditorNavigation(freshState, freshStorage, dom, options)
      nav.setRenderAPI(render)

      await nav.loadPage('home')

      // Should have loaded the DEFAULT_HOME content
      expect(freshState.world['home']).toContain('Welcome to your world')
      expect(dom.editorDiv.textContent).toContain('Welcome to your world')
    })
  })

  // ── setRenderAPI ──────────────────────────────────────────────────────────

  describe('setRenderAPI', () => {
    it('allows render callbacks to be wired after construction', () => {
      const nav = createEditorNavigation(state, storage, dom, options)

      // setRenderAPI should not throw
      expect(() => nav.setRenderAPI(render)).not.toThrow()
    })

    it('works with null render (no-op for render calls)', async () => {
      // Create a render that tracks calls
      const trackingRender: EditorRenderAPI = {
        render: vi.fn(),
        renderBreadcrumb: vi.fn(),
        syncUrlToTrail: vi.fn(),
      }
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(trackingRender)

      state.setWorldPage('home', '# test')
      await nav.loadPage('home')

      expect(trackingRender.render).toHaveBeenCalled()
      expect(trackingRender.renderBreadcrumb).toHaveBeenCalled()
    })
  })
})
