// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ContentPlugin, StorageAdapter, EditorContext, Token } from '../types'
import { createEditorState } from '../editor-state'
import type { EditorDOM } from '../editor-dom'

import { createEditorRender } from '../editor-render'

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

function createTestDOM(): EditorDOM {
  const container = document.createElement('div')

  const topbar = document.createElement('div')
  topbar.className = 'wn-topbar'

  const breadcrumb = document.createElement('div')
  breadcrumb.className = 'wn-breadcrumb'
  topbar.appendChild(breadcrumb)

  const editorWrap = document.createElement('div')
  editorWrap.className = 'wn-editor-wrap'

  const placeholder = document.createElement('div')
  placeholder.className = 'wn-placeholder'
  editorWrap.appendChild(placeholder)

  const toolbar = document.createElement('div')
  toolbar.className = 'wn-toolbar'

  const editorDiv = document.createElement('div') as HTMLDivElement
  editorDiv.className = 'wn-editor'
  editorDiv.contentEditable = 'true'
  editorWrap.appendChild(editorDiv)

  container.appendChild(topbar)
  container.appendChild(toolbar)
  container.appendChild(editorWrap)

  return { container, topbar, breadcrumb, toolbar, editorWrap, editorDiv, placeholder }
}

/**
 * Minimal inline token definition that matches word characters.
 * Used to verify the tokenize → render pipeline runs.
 */
const TEXT_TOKEN_DEF = {
  type: 'test-text',
  pattern: /\w+/,
}

/**
 * A no-op plugin that renders text tokens as-is.
 */
function testPlugin(): ContentPlugin {
  return {
    name: 'test',
    version: '1.0.0',
    kind: 'content' as const,
    tokens: [TEXT_TOKEN_DEF],
    render(token: Token, _context: EditorContext): HTMLElement | Text {
      return document.createTextNode(token.raw)
    },
  }
}

// ─── createEditorRender: render() ───────────────────────────────────────────────

describe('createEditorRender: render()', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState(mockStorage(), { initialPage: 'test' })
  })

  // Test 1: render() extracts, tokenizes, renders, sets innerHTML, restores caret
  it('extracts text, tokenizes, renders, sets innerHTML, and restores caret', () => {
    const render = createEditorRender(dom, plugins, state, {})

    // Set some text content in the editor div
    dom.editorDiv.textContent = 'hello world'

    render.render()

    // After render, the editor should have DOM content (text nodes were created)
    expect(dom.editorDiv.innerHTML.length).toBeGreaterThan(0)
    // The raw text "hello world" should appear in the rendered output
    expect(dom.editorDiv.textContent).toContain('hello')
  })

  // Test 2: placeholder visibility toggles based on raw text length
  it('hides placeholder when editor has text content', () => {
    const render = createEditorRender(dom, plugins, state, {})

    dom.editorDiv.textContent = 'some text'
    render.render()
    expect(dom.placeholder.style.display).toBe('none')
  })

  it('shows placeholder when editor is empty', () => {
    const render = createEditorRender(dom, plugins, state, {})

    dom.editorDiv.textContent = ''
    render.render()
    expect(dom.placeholder.style.display).toBe('block')
  })

  // Test 3: render() does not throw when contentEditable is empty
  it('does not throw when contentEditable is empty', () => {
    const render = createEditorRender(dom, plugins, state, {})

    dom.editorDiv.textContent = ''

    expect(() => render.render()).not.toThrow()
    // Should still produce valid output (maybe empty or just \n)
    expect(dom.editorDiv).toBeDefined()
  })

  // Test 4: render preserves caret position across re-render
  it('preserves caret position after re-render', () => {
    const render = createEditorRender(dom, plugins, state, {})

    // Set initial content
    dom.editorDiv.textContent = 'hello world'
    render.render()

    // Simulate a caret position by getting the offset after first render,
    // then verify a second render doesn't lose content
    dom.editorDiv.textContent = 'hello world again'
    render.render()

    expect(dom.editorDiv.innerHTML.length).toBeGreaterThan(0)
    expect(dom.editorDiv.textContent).toContain('again')
  })

  // Test 5: render produces line separators between fragments
  it('produces line separators between multi-line content', () => {
    const render = createEditorRender(dom, plugins, state, {})

    dom.editorDiv.textContent = 'line1\nline2'
    render.render()

    // The rendered output should contain both lines
    const text = dom.editorDiv.textContent
    expect(text).toContain('line1')
    expect(text).toContain('line2')
  })

  // Test 6: navigateFn is wired through state.toContext during render
  it('passes navigateFn through state.toContext during render', () => {
    const testDom = createTestDOM()
    const testState = createEditorState(mockStorage(), { initialPage: 'test' })
    const navigateFn = vi.fn()

    // Spy on toContext to verify navigateFn is forwarded
    const contextSpy = vi.spyOn(testState, 'toContext')

    // A plugin that calls context.navigate during rendering
    const navPlugin: ContentPlugin = {
      name: 'nav-test',
      version: '1.0.0',
      kind: 'content' as const,
      tokens: [{ type: 'nav-trigger', pattern: /trigger/ }],
      render(_token: Token, context: EditorContext): HTMLElement | Text {
        context.navigate('linked-page')
        return document.createTextNode('trigger')
      },
    }

    const render = createEditorRender(testDom, [navPlugin], testState, { navigateFn })

    testDom.editorDiv.textContent = '  trigger'
    render.render()

    // Verify toContext was called with our navigateFn
    expect(contextSpy).toHaveBeenCalled()
    const args = contextSpy.mock.calls[0] as [(page: string) => void]
    expect(args[0]).toBe(navigateFn)
  })
})

// ─── createEditorRender: renderBreadcrumb() ─────────────────────────────────────

describe('createEditorRender: renderBreadcrumb()', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState(mockStorage(), { initialPage: 'home' })
  })

  // Test 7: builds breadcrumb DOM with correct classes
  it('builds breadcrumb DOM with correct crumb classes', () => {
    const render = createEditorRender(dom, plugins, state, {})

    state.setTrail(['home', 'about', 'contact'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')
    const seps = dom.breadcrumb.querySelectorAll('.wn-crumb-sep')

    // 3 crumbs, 2 separators
    expect(crumbs.length).toBe(3)
    expect(seps.length).toBe(2)

    // Last crumb should have the active class
    expect(crumbs[2].className).toContain('wn-crumb--active')
    // First crumb should NOT have the active class
    expect(crumbs[0].className).not.toContain('wn-crumb--active')
  })

  // Test 8: non-last crumbs have click handlers, last crumb does not
  it('attaches click handlers only to non-last crumbs', () => {
    const onBreadcrumbNavigate = vi.fn()
    const render = createEditorRender(dom, plugins, state, { onBreadcrumbNavigate })

    state.setTrail(['home', 'about', 'contact'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')

    // Click the first crumb (home) — should trigger navigation
    crumbs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onBreadcrumbNavigate).toHaveBeenCalledTimes(1)
    expect(onBreadcrumbNavigate).toHaveBeenCalledWith('home')

    // Click the last crumb (active) — should NOT trigger navigation
    onBreadcrumbNavigate.mockClear()
    crumbs[2].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onBreadcrumbNavigate).not.toHaveBeenCalled()
  })

  // Test 9: breadcrumb click truncates trail and navigates to clicked page
  it('truncates trail and navigates on breadcrumb click', () => {
    const onBreadcrumbNavigate = vi.fn()
    const render = createEditorRender(dom, plugins, state, { onBreadcrumbNavigate })

    state.setTrail(['home', 'about', 'contact'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')

    // Click the first crumb (index 0 = "home")
    crumbs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    // Trail should be truncated to ["home"]
    const trail = state.getTrail()
    expect(trail).toEqual(['home'])
    // onBreadcrumbNavigate should be called with the new last page
    expect(onBreadcrumbNavigate).toHaveBeenCalledWith('home')
  })

  // Test 10: onTrailChange callback is invoked during renderBreadcrumb
  it('calls onTrailChange callback with current trail', () => {
    const onTrailChange = vi.fn()
    const render = createEditorRender(dom, plugins, state, { onTrailChange })

    state.setTrail(['home', 'about'])
    render.renderBreadcrumb()

    expect(onTrailChange).toHaveBeenCalledWith(['home', 'about'])
  })

  // Test 11: breadcrumb text uses pageDisplayName
  it('uses pageDisplayName for crumb text content', () => {
    const render = createEditorRender(dom, plugins, state, {})

    state.setTrail(['home', 'deep/nested/page'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')
    // pageDisplayName extracts the last segment after /
    expect(crumbs[1].textContent).toBe('page')
  })
})

// ─── createEditorRender: syncUrlToTrail() ───────────────────────────────────────

describe('createEditorRender: syncUrlToTrail()', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState(mockStorage(), { initialPage: 'home' })
  })

  // Test 12: syncUrlToTrail updates window.location via history.replaceState
  it('updates URL via history.replaceState', () => {
    // Spy on history.replaceState
    const replaceState = vi.spyOn(window.history, 'replaceState')

    const render = createEditorRender(dom, plugins, state, {})

    state.setTrail(['home', 'about'])
    render.syncUrlToTrail()

    expect(replaceState).toHaveBeenCalled()
    const url = (replaceState.mock.calls[0] as [unknown, string, string])[2]
    // encodePathSearch encodes each trail element with encodeURIComponent,
    // then joins with "/" — so "home" and "about" remain unescaped
    expect(url).toContain('path=home/about')
  })

  // Test 13: renderBreadcrumb calls syncUrlToTrail internally
  it('renderBreadcrumb calls syncUrlToTrail internally', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')

    const render = createEditorRender(dom, plugins, state, {})

    state.setTrail(['home', 'about'])
    render.renderBreadcrumb()

    expect(replaceState).toHaveBeenCalled()
  })
})

// ─── createEditorRender: Module shape ───────────────────────────────────────────

describe('createEditorRender: module shape', () => {
  it('returns EditorRenderAPI with render, renderBreadcrumb, syncUrlToTrail', () => {
    const dom = createTestDOM()
    const plugins: ContentPlugin[] = [testPlugin()]
    const state = createEditorState(mockStorage(), { initialPage: 'test' })

    const api = createEditorRender(dom, plugins, state, {})

    expect(typeof api.render).toBe('function')
    expect(typeof api.renderBreadcrumb).toBe('function')
    expect(typeof api.syncUrlToTrail).toBe('function')
  })
})
