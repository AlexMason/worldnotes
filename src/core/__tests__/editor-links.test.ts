// @vitest-environment happy-dom

// ─── Ctrl/Cmd+Click on external links (issue #1) ────────────────────────────
// Real editor mount; the link line is NOT the caret line, so links render as
// anchors. happy-dom does not place carets from mouse events, so "enters edit
// mode" is asserted as "mousedown is not cancelled" (caret placement is the
// browser default the handler must leave alone).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'

const DOC =
  'first line\n' +
  'see [ext](https://example.com/a) and [mail](mailto:a@example.com) and [int](other-page)'

async function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  await createEditor(container, {
    pageStore: createMemoryPageStore({ home: DOC }),
    saveDebounceMs: 5000,
    initialPage: 'home',
  }).mount()
  return container.querySelector('.wn-editor') as HTMLElement
}

function mouse(target: Element, type: 'mousedown' | 'click', init: MouseEventInit = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init })
  target.dispatchEvent(event)
  return event
}

function anchor(editorDiv: HTMLElement, href: string): HTMLAnchorElement {
  const a = editorDiv.querySelector(`a[href="${href}"]`)
  if (!(a instanceof HTMLAnchorElement)) throw new Error(`no anchor for ${href}`)
  return a
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('modifier-click on external links', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'opens the link in a new tab without entering edit mode (%o)',
    async (mods) => {
      const editorDiv = await mount()
      const open = vi.spyOn(window, 'open').mockReturnValue(null)
      const a = anchor(editorDiv, 'https://example.com/a')

      expect(mouse(a, 'mousedown', mods).defaultPrevented).toBe(true)
      expect(mouse(a, 'click', mods).defaultPrevented).toBe(true)

      expect(open).toHaveBeenCalledTimes(1)
      expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer')
      // Line stayed rendered (no edit-mode re-render swapped the anchor out).
      expect(editorDiv.contains(a)).toBe(true)
    },
  )

  it('opens safe non-http schemes (mailto:)', async () => {
    const editorDiv = await mount()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    mouse(anchor(editorDiv, 'mailto:a@example.com'), 'click', { ctrlKey: true })
    expect(open).toHaveBeenCalledWith('mailto:a@example.com', '_blank', 'noopener,noreferrer')
  })

  it('plain click keeps the default caret placement and opens nothing', async () => {
    const editorDiv = await mount()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const a = anchor(editorDiv, 'https://example.com/a')
    expect(mouse(a, 'mousedown').defaultPrevented).toBe(false)
    mouse(a, 'click')
    expect(open).not.toHaveBeenCalled()
  })

  it('ignores non-primary buttons', async () => {
    const editorDiv = await mount()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const a = anchor(editorDiv, 'https://example.com/a')
    expect(mouse(a, 'mousedown', { ctrlKey: true, button: 2 }).defaultPrevented).toBe(false)
    mouse(a, 'click', { ctrlKey: true, button: 1 })
    expect(open).not.toHaveBeenCalled()
  })

  it('never opens internal links (they keep in-app navigation)', async () => {
    const editorDiv = await mount()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const internal = editorDiv.querySelector('[data-page="other-page"]')
    expect(internal).not.toBeNull()
    mouse(internal!, 'click', { ctrlKey: true })
    expect(open).not.toHaveBeenCalled()
  })

  it('never opens an unsafe href, even if such an anchor reaches the DOM', async () => {
    const editorDiv = await mount()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const line = editorDiv.querySelector('[data-line="1"]')!
    for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/x']) {
      const a = document.createElement('a')
      a.setAttribute('href', href)
      a.textContent = 'x'
      line.appendChild(a)
      expect(mouse(a, 'mousedown', { ctrlKey: true }).defaultPrevented).toBe(false)
      mouse(a, 'click', { ctrlKey: true })
    }
    expect(open).not.toHaveBeenCalled()
  })
})
