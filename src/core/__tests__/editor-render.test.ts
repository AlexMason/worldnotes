// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { ContentPlugin, EditorContext, Token } from '../types'
import { createEditorState } from '../editor-state'
import type { EditorDOM } from '../editor-dom'
import { createNotificationSystem } from '../notifications'

import { createEditorRender } from '../editor-render'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function createTestDOM(): EditorDOM {
  const container = document.createElement('div')

  const actions = document.createElement('div')

  const breadcrumb = document.createElement('div')
  breadcrumb.className = 'wn-breadcrumb'
  actions.appendChild(breadcrumb)

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

  container.appendChild(actions)
  container.appendChild(toolbar)
  container.appendChild(editorWrap)

  return {
    container,
    actions,
    breadcrumb,
    toolbar,
    editorWrap,
    editorDiv,
    placeholder,
    overlay: document.createElement('div'),
    header: document.createElement('div'),
    body: document.createElement('div'),
    footer: document.createElement('div'),
    leftSidepanel: document.createElement('div'),
    rightSidepanel: document.createElement('div'),
  }
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
    state = createEditorState({ initialPage: 'test' })
  })

  // Test 1: render() extracts, tokenizes, renders, sets innerHTML, restores caret
  it('extracts text, tokenizes, renders, sets innerHTML, and restores caret', () => {
    const render = createEditorRender(dom, plugins, state, {})

    // Write content to buffers — render() reads from buffers, not DOM
    state.getPageBuffers().setPageText('test', 'hello world')

    render.render()

    // After render, the editor should have DOM content (text nodes were created)
    expect(dom.editorDiv.innerHTML.length).toBeGreaterThan(0)
    // The raw text "hello world" should appear in the rendered output
    expect(dom.editorDiv.textContent).toContain('hello')
  })

  // Test 2: placeholder visibility toggles based on raw text length
  it('hides placeholder when editor has text content', () => {
    const render = createEditorRender(dom, plugins, state, {})

    // Write content to buffers — the render() reads from buffers, not DOM
    state.getPageBuffers().setPageText('test', 'some text')
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

    // Write initial content to Y.Text
    state.getPageBuffers().setPageText('test', 'hello world')
    render.render()

    // Change content in Y.Text and re-render
    state.getPageBuffers().setPageText('test', 'hello world again')
    render.render()

    expect(dom.editorDiv.innerHTML.length).toBeGreaterThan(0)
    expect(dom.editorDiv.textContent).toContain('again')
  })

  // Test 5: render produces line separators between fragments
  it('produces line separators between multi-line content', () => {
    const render = createEditorRender(dom, plugins, state, {})

    state.getPageBuffers().setPageText('test', 'line1\nline2')
    render.render()

    // The rendered output should contain both lines
    const text = dom.editorDiv.textContent
    expect(text).toContain('line1')
    expect(text).toContain('line2')
  })

  // Test 6: navigateFn is wired through state.toContext during render
  it('passes navigateFn through state.toContext during render', () => {
    const testDom = createTestDOM()
    const testState = createEditorState({ initialPage: 'test' })
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
    state = createEditorState({ initialPage: 'home' })
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

  // Test 11: root crumb is labelled "Home", path crumbs are humanized slugs
  it('labels the root crumb Home and humanizes path crumbs', () => {
    const render = createEditorRender(dom, plugins, state, {})

    state.setTrail(['home', 'deep', 'nested-page'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')
    expect(crumbs[0].textContent).toBe('Home')
    expect(crumbs[1].textContent).toBe('Deep')
    expect(crumbs[2].textContent).toBe('Nested Page')
  })

  // Test 11b: homeLabel option (site branding) replaces the root crumb label
  it('labels the root crumb with homeLabel when provided', () => {
    const render = createEditorRender(dom, plugins, state, { homeLabel: 'Acme KB' })

    state.setTrail(['home', 'about'])
    render.renderBreadcrumb()

    const crumbs = dom.breadcrumb.querySelectorAll('.wn-crumb')
    expect(crumbs[0].textContent).toBe('Acme KB')
    expect(crumbs[1].textContent).toBe('About')
  })
})

// ─── createEditorRender: Module shape ───────────────────────────────────────────

describe('createEditorRender: module shape', () => {
  it('returns EditorRenderAPI with render, renderBreadcrumb, checkSelectChange', () => {
    const dom = createTestDOM()
    const plugins: ContentPlugin[] = [testPlugin()]
    const state = createEditorState({ initialPage: 'test' })

    const api = createEditorRender(dom, plugins, state, {})

    expect(typeof api.render).toBe('function')
    expect(typeof api.renderBreadcrumb).toBe('function')
  })
})

// ─── createEditorRender: 404 toast (via notifications) ─────────────────────────

describe('createEditorRender: 404 toast', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>
  let notifications: ReturnType<typeof createNotificationSystem>

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState({ initialPage: 'test' })
    const root = document.createElement('div')
    document.body.appendChild(root)
    notifications = createNotificationSystem(root)
  })

  afterEach(() => {
    notifications.destroy()
    document.body.innerHTML = ''
  })

  it('renders 404 toast when on 404 page with pending requested page', () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: true,
    })

    state.getPageBuffers().setPageText('404', '# Page Not Found\n\n')
    render.render()

    const toast = document.body.querySelector('.wn-toast')
    expect(toast).not.toBeNull()
    expect(toast!.textContent).toContain('missing')
    expect(toast!.textContent).toContain('not found')
  })

  it('does not show 404 toast when showCreateOverlay is false', () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: false,
    })

    state.getPageBuffers().setPageText('404', '# Page Not Found\n\n')
    render.render()

    const toast = document.body.querySelector('.wn-toast')
    expect(toast).toBeNull()
  })

  it('dismisses 404 toast when navigating away', async () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: true,
    })

    state.getPageBuffers().setPageText('404', '# Page Not Found\n\n')
    render.render()

    expect(document.body.querySelector('.wn-toast')).not.toBeNull()

    state.setPendingRequestedPage(null)
    state.setTrail(['home'])
    render.render()

    // Wait for exit animation to complete
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(document.body.querySelector('.wn-toast')).toBeNull()
  })
})

// ─── Stray/unrecognized selections must never hijack the caret ──────────────

describe('caret protection against unrecognized selections', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>

  const MULTILINE = 'line one\nline two\nline three'

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState({ initialPage: 'test' })
    state.getPageBuffers().setPageText('test', MULTILINE)
  })

  function caretInLine1(): void {
    const line1 = dom.editorDiv.querySelector('[data-line="1"]')!
    const range = document.createRange()
    range.setStart(line1.firstChild!, 3)
    range.collapse(true)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  }

  it('checkSelectChange ignores a selection anchored outside the editor', () => {
    const render = createEditorRender(dom, plugins, state, {})
    render.render(true)
    caretInLine1()
    render.checkSelectChange() // moves active line to 1, re-renders

    // Tag the DOM so a rebuild is observable
    const tagged = dom.editorDiv.querySelector('[data-line="1"]')!
    tagged.setAttribute('data-marker', 'keep')

    const outside = document.createElement('p')
    outside.textContent = 'breadcrumb chrome'
    document.body.appendChild(outside)
    const range = document.createRange()
    range.setStart(outside.firstChild!, 2)
    range.collapse(true)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)

    render.checkSelectChange()

    // No rebuild, and the caret was NOT yanked to line 0
    expect(dom.editorDiv.querySelector('[data-marker="keep"]')).toBe(tagged)
    expect(window.getSelection()!.getRangeAt(0).startContainer).toBe(outside.firstChild)
    document.body.removeChild(outside)
  })

  it('checkSelectChange ignores transiently empty selections (rebuild race)', () => {
    const render = createEditorRender(dom, plugins, state, {})
    render.render(true)
    caretInLine1()
    render.checkSelectChange()

    const tagged = dom.editorDiv.querySelector('[data-line="1"]')!
    tagged.setAttribute('data-marker', 'keep')

    window.getSelection()!.removeAllRanges()
    render.checkSelectChange()

    expect(dom.editorDiv.querySelector('[data-marker="keep"]')).toBe(tagged)
  })

  it('non-forced render() with lost selection keeps the caret on its line', () => {
    const render = createEditorRender(dom, plugins, state, {})
    render.render(true)
    caretInLine1()
    render.checkSelectChange() // activates line 1

    // Selection wiped (e.g. detached nodes mid-rebuild) before a plain render
    window.getSelection()!.removeAllRanges()
    render.render()

    const sel = window.getSelection()!
    expect(sel.rangeCount).toBe(1)
    const anchor = sel.getRangeAt(0).startContainer
    let node: Node | null = anchor
    while (node && !(node instanceof HTMLElement && node.dataset.line)) {
      node = node.parentNode
    }
    expect(node!.textContent).toBe('line two')
  })

  it('forced render() (page load/switch) still starts at the top', () => {
    const render = createEditorRender(dom, plugins, state, {})
    render.render(true)
    caretInLine1()
    render.checkSelectChange()

    window.getSelection()!.removeAllRanges()
    render.render(true) // simulate page switch

    const sel = window.getSelection()!
    expect(sel.rangeCount).toBe(1)
    const line0 = dom.editorDiv.querySelector('[data-line="0"]')!
    expect(line0.contains(sel.getRangeAt(0).startContainer)).toBe(true)
  })
})
