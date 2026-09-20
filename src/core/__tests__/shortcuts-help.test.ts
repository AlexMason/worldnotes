// @vitest-environment happy-dom

// ─── Shortcuts help overlay: self-owned Ctrl+/ toggle, table from bindings ──

import { describe, it, expect, afterEach } from 'vitest'
import { createShortcutsHelpPlugin } from '../plugins/shortcuts-help'
import { SHORTCUT_BINDINGS } from '../editor-keymap'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'

function press(init: KeyboardEventInit): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  document.dispatchEvent(e)
  return e
}

function mountPlugin(): {
  plugin: ReturnType<typeof createShortcutsHelpPlugin>
  slot: HTMLElement
} {
  const plugin = createShortcutsHelpPlugin()
  const slot = document.createElement('div')
  slot.className = 'wn-overlay'
  document.body.appendChild(slot)
  plugin.onMount(slot)
  return { plugin, slot }
}

function panel(slot: HTMLElement): HTMLElement {
  return slot.querySelector('.wn-shortcuts') as HTMLElement
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('shortcuts-help plugin', () => {
  it('mounts a hidden panel listing every binding from SHORTCUT_BINDINGS', () => {
    const { plugin, slot } = mountPlugin()
    const p = panel(slot)
    expect(p).not.toBeNull()
    expect(p.style.display).toBe('none')
    expect(p.getAttribute('role')).toBe('dialog')
    expect(p.querySelectorAll('.wn-shortcuts-row')).toHaveLength(SHORTCUT_BINDINGS.length)
    // table is sourced from the keymap data — spot-check one row
    expect(p.textContent).toContain('Move selected line(s) up / down')
    plugin.onDestroy?.()
  })

  it('Ctrl+/ toggles open then closed; Cmd+/ works too', () => {
    const { plugin, slot } = mountPlugin()
    const p = panel(slot)

    press({ key: '/', ctrlKey: true })
    expect(p.style.display).toBe('block')

    press({ key: '/', ctrlKey: true })
    expect(p.style.display).toBe('none')

    press({ key: '/', metaKey: true })
    expect(p.style.display).toBe('block')
    plugin.onDestroy?.()
  })

  it('the toggle chord is consumed (preventDefault + stopPropagation)', () => {
    const { plugin } = mountPlugin()
    const e = press({ key: '/', ctrlKey: true })
    expect(e.defaultPrevented).toBe(true)
    plugin.onDestroy?.()
  })

  it('Escape closes only while open', () => {
    const { plugin, slot } = mountPlugin()
    const p = panel(slot)

    const closed = press({ key: 'Escape' })
    expect(closed.defaultPrevented).toBe(false)
    expect(p.style.display).toBe('none')

    press({ key: '/', ctrlKey: true })
    const opened = press({ key: 'Escape' })
    expect(opened.defaultPrevented).toBe(true)
    expect(p.style.display).toBe('none')
    plugin.onDestroy?.()
  })

  it('onDestroy detaches the listener and removes the panel', () => {
    const { plugin, slot } = mountPlugin()
    plugin.onDestroy?.()
    expect(slot.querySelector('.wn-shortcuts')).toBeNull()
    press({ key: '/', ctrlKey: true }) // must not throw or resurrect
    expect(slot.querySelector('.wn-shortcuts')).toBeNull()
  })
})

describe('shortcuts-help in the mounted editor', () => {
  it('is registered as a default UI plugin and lands in the overlay slot', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const instance = await createEditor(container, {
      pageStore: createMemoryPageStore({ home: 'x' }),
      initialPage: 'home',
    }).mount()

    const p = container.querySelector('.wn-overlay .wn-shortcuts') as HTMLElement
    expect(p).not.toBeNull()
    expect(p.style.display).toBe('none')

    press({ key: '/', ctrlKey: true })
    expect(p.style.display).toBe('block')

    instance.destroy()
    press({ key: '/', ctrlKey: true }) // detached: no leak, no throw
  })
})
