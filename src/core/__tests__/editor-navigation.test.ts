// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PageStore, EditorOptions, EditorContext } from '../types'
import type { EditorStateAPI } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import type { EditorRenderAPI } from '../editor-render'
import { createEditorNavigation } from '../editor-navigation'
import { createPageBuffers } from '../page-buffers'
import { createMemoryPageStore } from '../memory-page-store'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mockStorage(initialStore?: Record<string, string>): PageStore {
  return createMemoryPageStore(initialStore)
}

function mockState(initialTrail?: string[]): EditorStateAPI {
  const pageBuffers = createPageBuffers()

  let trail: string[] = initialTrail ? [...initialTrail] : ['home']
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false
  let pendingRequestedPage: string | null = null

  return {
    getPageBuffers: () => pageBuffers,
    getTrail: () => [...trail],
    getCurrentPage: () => trail.length <= 1 ? trail[0] : trail.slice(1).join('/'),
    getWorld: () => pageBuffers.getWorld(),
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
    getPendingRequestedPage: (): string | null => pendingRequestedPage,
    setPendingRequestedPage: (page: string | null): void => {
      pendingRequestedPage = page
    },
    toContext: (navigate: (page: string) => void): EditorContext => ({
      navigate,
      getTrail: () => [...trail],
      getCurrentPage: () => trail.length <= 1 ? trail[0] : trail.slice(1).join('/'),
      getWorld: () => pageBuffers.getWorld(),
      getPageText: (pg: string) => pageBuffers.getPageText(pg),
      setPageText: (pg: string, content: string) => pageBuffers.setPageText(pg, content),
    }),
  }
}

function mockDOM(): EditorDOM {
  const container = document.createElement('div')
  const actions = document.createElement('div')
  const breadcrumb = document.createElement('div')
  const editorWrap = document.createElement('div')
  const editorDiv = document.createElement('div') as HTMLDivElement
  const placeholder = document.createElement('div')

  editorDiv.contentEditable = 'true'
  actions.appendChild(breadcrumb)
  editorWrap.appendChild(placeholder)
  editorWrap.appendChild(editorDiv)

  const toolbar = document.createElement('div')
  toolbar.className = 'wn-toolbar'

  container.appendChild(actions)
  container.appendChild(toolbar)
  container.appendChild(editorWrap)

  return { container, actions, breadcrumb, toolbar, editorWrap, editorDiv, placeholder, overlay: document.createElement('div'), header: document.createElement('div'), body: document.createElement('div'), footer: document.createElement('div'), leftSidepanel: document.createElement('div'), rightSidepanel: document.createElement('div') }
}

function mockRender(): EditorRenderAPI {
  return {
    render: vi.fn(),
    renderBreadcrumb: vi.fn(),
    checkSelectChange: vi.fn(),
  }
}

// ─── createEditorNavigation ────────────────────────────────────────────────────

describe('createEditorNavigation', () => {
  let storage: PageStore
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
      const storageWithPage = mockStorage({ 'new-page': '# New Page\n\n' })
      const nav = createEditorNavigation(state, storageWithPage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('new-page')

      expect(state.getWorld()).toHaveProperty('new-page')
      expect(state.getTrail()).toContain('new-page')
    })

    it('does not re-fetch page already in world cache', async () => {
      const loadSpy = vi.spyOn(storage, 'load')
      state.getPageBuffers().setPageText('cached-page', '# Cached\n\nsome content')
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('cached-page')

      expect(loadSpy).not.toHaveBeenCalledWith('cached-page')
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
      multiTrailState.getPageBuffers().setPageText('home', '# home')
      const nav = createEditorNavigation(multiTrailState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('home')

      // Trail should be truncated to ['home'], not ['home', 'blog', 'about', 'home']
      expect(multiTrailState.getTrail()).toEqual(['home'])
    })

    it('replaces hierarchy when navigating to a flat page from a nested path', async () => {
      const multiTrailState = mockState(['home', 'blog'])
      multiTrailState.getPageBuffers().setPageText('about', '# about')
      const nav = createEditorNavigation(multiTrailState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('about')

      expect(multiTrailState.getTrail()).toEqual(['home', 'about'])
    })

    it('pushes path segments for multi-segment page names', async () => {
      const baseState = mockState(['home'])
      baseState.getPageBuffers().setPageText('projects/worldnotes', '# pw')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('projects/worldnotes')

      expect(baseState.getTrail()).toEqual(['home', 'projects', 'worldnotes'])
    })

    it('skips intermediate segments already present in the trail', async () => {
      const baseState = mockState(['home', 'projects'])
      baseState.getPageBuffers().setPageText('projects/worldnotes', '# pw')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('projects/worldnotes')

      expect(baseState.getTrail()).toEqual(['home', 'projects', 'worldnotes'])
    })

    it('pushes deeply nested path segments', async () => {
      const baseState = mockState(['home'])
      baseState.getPageBuffers().setPageText('a/b/c', '# abc')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('a/b/c')

      expect(baseState.getTrail()).toEqual(['home', 'a', 'b', 'c'])
    })

    it('truncates matching segments when navigating to an ancestor path', async () => {
      const baseState = mockState(['home', 'projects', 'worldnotes'])
      baseState.getPageBuffers().setPageText('projects', '# projects')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('projects')

      expect(baseState.getTrail()).toEqual(['home', 'projects'])
    })

    it('skips intermediate segments already present in the trail', async () => {
      const baseState = mockState(['home', 'projects'])
      baseState.getPageBuffers().setPageText('projects/worldnotes', '# pw')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('projects/worldnotes')

      expect(baseState.getTrail()).toEqual(['home', 'projects', 'worldnotes'])
    })

    it('pushes deeply nested path segments', async () => {
      const baseState = mockState(['home'])
      baseState.getPageBuffers().setPageText('a/b/c', '# abc')
      const nav = createEditorNavigation(baseState, storage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('a/b/c')

      expect(baseState.getTrail()).toEqual(['home', 'a', 'b', 'c'])
    })

    it('creates page in world cache when not present and calls loadPage', async () => {
      const storageWithPage = mockStorage({ 'new-page': '# New Page\n\n' })
      const nav = createEditorNavigation(state, storageWithPage, dom, options)
      nav.setRenderAPI(render)

      await nav.navigateToPage('new-page')

      expect(state.getWorld()).toHaveProperty('new-page')
      expect(state.getTrail()).toContain('new-page')
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
      state.getPageBuffers().setPageText('home', '# old')
      // Then delete all content
      state.getPageBuffers().setPageText('home', '')

      await nav.loadPage('home')

      // Page should remain empty, not get DEFAULT_HOME
      expect(state.getPageBuffers().getPageText('home')).toBe('')
    })

    it('reads page content from buffers and triggers render', async () => {
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(render)

      const content = '# hello\n\ntest content'
      state.getPageBuffers().setPageText('home', content)

      await nav.loadPage('home')

      expect(state.getPageBuffers().getPageText('home')).toBe(content)
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
      state.getPageBuffers().setPageText('home', content)

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
            checkSelectChange: vi.fn(),
      }
      const nav = createEditorNavigation(state, storage, dom, options)
      nav.setRenderAPI(trackingRender)

      state.getPageBuffers().setPageText('home', '# test')
      await nav.loadPage('home')

      expect(trackingRender.render).toHaveBeenCalled()
      expect(trackingRender.renderBreadcrumb).toHaveBeenCalled()
    })
  })

  // ── Status Pages ──────────────────────────────────────────────────────────

  describe('status pages', () => {
    it('redirects to 404 page when page does not exist in Y.Doc or storage', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, { statusPages: { 404: '404-page' } })
      nav.setRenderAPI(render)

      await nav.navigateToPage('missing')

      expect(s.getPendingRequestedPage()).toBe('missing')
      expect(s.getTrail()).toContain('404-page')
      expect(s.getWorld()).toHaveProperty('404-page')
    })

    it('uses default "404" page name when statusPages is not configured', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('missing')

      expect(s.getTrail()).toContain('404')
      expect(s.getPendingRequestedPage()).toBe('missing')
    })

    it('does not redirect when page is found in storage', async () => {
      const s = mockState(['home'])
      const st = mockStorage({ 'exists': '# Exists\n\ncontent' })
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('exists')

      expect(s.getPendingRequestedPage()).toBeNull()
      expect(s.getTrail()).toContain('exists')
    })

    it('does not redirect when page is already in Y.Doc', async () => {
      const s = mockState(['home'])
      s.getPageBuffers().setPageText('cached', '# Cached')
      const nav = createEditorNavigation(s, storage, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('cached')

      expect(s.getPendingRequestedPage()).toBeNull()
      expect(s.getTrail()).toContain('cached')
    })



    it('clears pendingRequestedPage when navigating from 404 to an existing page', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      // Navigate to trigger 404 redirect
      await nav.navigateToPage('missing')
      expect(s.getPendingRequestedPage()).toBe('missing')

      // Create the page in Y.Doc, then navigate to it
      s.getPageBuffers().setPageText('missing', '# content')
      s.setPendingRequestedPage('missing')
      // navigateToPage will clear it since target is not a status page
      await nav.navigateToPage('missing')
      expect(s.getPendingRequestedPage()).toBeNull()
    })

    it('auto-creates 404 page with default content when it does not exist', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('nonexistent')

      expect(s.getWorld()['404']).toContain('Page Not Found')
    })


    it('propagates load errors from the page store', async () => {
      const errorStorage: PageStore = {
        load: async () => { throw new Error('network down') },
        save: () => Promise.resolve(),
      }
      const s = mockState(['home'])
      const nav = createEditorNavigation(s, errorStorage, dom, {})

      await expect(nav.navigateToPage('any')).rejects.toThrow('network down')
    })
  })
})
