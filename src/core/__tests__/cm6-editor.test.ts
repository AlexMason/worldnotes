// @vitest-environment happy-dom

// Behaviour of the CM6 spike surface: per-line activation (collapse/expand),
// block-expand, source fidelity, list continuation, navigation gating.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { undo } from '@codemirror/commands'
import { createCm6Editor } from '../cm6/editor'
import type { Cm6Editor } from '../cm6/editor'
import { defaultPlugins } from '../plugins/defaults'

let editor: Cm6Editor | null = null
let host: HTMLElement | null = null

function mount(doc: string, extra: Partial<Parameters<typeof createCm6Editor>[1]> = {}): Cm6Editor {
  host = document.createElement('div')
  document.body.appendChild(host)
  editor = createCm6Editor(host, { doc, plugins: defaultPlugins, ...extra })
  return editor
}

function lines(): HTMLElement[] {
  return Array.from(host!.querySelectorAll<HTMLElement>('.cm-line'))
}

afterEach(() => {
  editor?.destroy()
  host?.remove()
  editor = null
  host = null
})

describe('live preview activation', () => {
  it('collapses marks on inactive lines, expands (dimmed) on the caret line', () => {
    const e = mount('**bold**\nplain')
    e.view.dispatch({ selection: { anchor: 12 } }) // inside line 1 ("plain")
    // line 0 inactive: markers replaced → visible text has no asterisks
    expect(lines()[0]!.textContent).toBe('bold')
    e.view.dispatch({ selection: { anchor: 3 } }) // inside line 0
    expect(lines()[0]!.textContent).toBe('**bold**')
    expect(lines()[0]!.querySelectorAll('.wn-punct').length).toBe(2)
    // The document is untouched by any of this.
    expect(e.getText()).toBe('**bold**\nplain')
  })

  it('expands EVERY line of a fence when the caret is on any of them', () => {
    const e = mount('```\ncode\n```\nafter')
    e.view.dispatch({ selection: { anchor: 6 } }) // inside "code"
    const active = lines().map((l) => l.classList.contains('wn-line-active'))
    expect(active).toEqual([true, true, true, false])
  })

  it('a multi-line selection activates every touched line', () => {
    const e = mount('# a\n# b\n# c')
    e.view.dispatch({ selection: { anchor: 0, head: 5 } })
    const active = lines().map((l) => l.classList.contains('wn-line-active'))
    expect(active).toEqual([true, true, false])
  })
})

describe('onChange / setText', () => {
  it('fires onChange with exact source for user edits, not for setText', () => {
    const onChange = vi.fn()
    const e = mount('a', { onChange })
    e.view.dispatch({ changes: { from: 1, insert: 'b' }, userEvent: 'input' })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('ab')
    e.setText('server')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(e.getText()).toBe('server')
  })
})

describe('list continuation', () => {
  function press(e: Cm6Editor, key: string, shift = false): void {
    e.view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true, cancelable: true }),
    )
  }

  it('Enter continues a bullet, numbers ordered items, and ends the list on an empty item', () => {
    const e = mount('- one')
    e.view.dispatch({ selection: { anchor: 5 } })
    press(e, 'Enter')
    expect(e.getText()).toBe('- one\n- ')
    e.view.dispatch({ selection: { anchor: e.getText().length } })
    press(e, 'Enter') // empty item → ends list
    expect(e.getText()).toBe('- one\n')

    const o = mount('1. a')
    o.view.dispatch({ selection: { anchor: 4 } })
    press(o, 'Enter')
    expect(o.getText()).toBe('1. a\n2. ')
  })

  it('Tab / Shift-Tab indent and dedent, keeping the caret on the same text', () => {
    const e = mount('- x')
    e.view.dispatch({ selection: { anchor: 3 } })
    press(e, 'Tab')
    expect(e.getText()).toBe('  - x')
    expect(e.view.state.selection.main.head).toBe(5)
    press(e, 'Tab', true)
    expect(e.getText()).toBe('- x')
    expect(e.view.state.selection.main.head).toBe(3)
  })

  it('does NOT treat a fenced "1. step" as a list item', () => {
    const e = mount('```\n1. step\n```')
    e.view.dispatch({ selection: { anchor: 10 } })
    press(e, 'Enter')
    // list handler bailed; default keymap inserted a plain newline (no "2. ")
    expect(e.getText()).not.toContain('2. ')
  })
})

describe('navigation', () => {
  function click(el: Element, mods: MouseEventInit = {}): MouseEvent {
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...mods })
    el.dispatchEvent(ev)
    return ev
  }

  it('navigates on a collapsed line, but not while the caret is on the link line (unless Ctrl)', () => {
    const onNavigate = vi.fn()
    const e = mount('go [[Some Page]]\nother', { onNavigate })
    e.view.dispatch({ selection: { anchor: 20 } }) // line 1 → link line collapsed
    const link = host!.querySelector('.wn-wiki-link')!
    const ev = click(link)
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('Some Page')
    expect(ev.defaultPrevented).toBe(true)

    onNavigate.mockClear()
    e.view.dispatch({ selection: { anchor: 3 } }) // caret on the link line
    click(host!.querySelector('.wn-wiki-link')!)
    expect(onNavigate).not.toHaveBeenCalled()
    click(host!.querySelector('.wn-wiki-link')!, { ctrlKey: true })
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('Some Page')
  })
})

describe('page switch (setText)', () => {
  it('resets undo history so Ctrl+Z cannot splice the previous page into the new one', () => {
    const e = mount('page one')
    e.view.dispatch({ changes: { from: 8, insert: '!' }, userEvent: 'input' })
    e.setText('page two')
    undo(e.view)
    expect(e.getText()).toBe('page two')
  })
})

describe('images', () => {
  it('collapsed line shows a safe <img> widget; active line shows the source instead', () => {
    const e = mount('![alt](https://x.test/a.png)\nother')
    e.view.dispatch({ selection: { anchor: 30 } })
    const img = host!.querySelector('img.wn-image-img')!
    expect(img.getAttribute('src')).toBe('https://x.test/a.png')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(lines()[0]!.textContent).toBe('')
    e.view.dispatch({ selection: { anchor: 2 } })
    expect(host!.querySelector('img')).toBeNull()
    expect(lines()[0]!.textContent).toBe('![alt](https://x.test/a.png)')
  })
})
