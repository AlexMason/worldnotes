// @vitest-environment happy-dom

// ─── Formatting toolbar: end-to-end through the real editor ─────────────────
// Mounts the actual editor and drives the toolbar buttons like a user. The
// real-browser parts (focus/selection retention on press, touch) are NOT
// modelled by happy-dom; see the plan's manual test steps.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { getSelectionOffsets, setSelectionOffsets } from '../caret-offset'

const DOC = 'alpha one\nbeta two\ngamma three'

async function mount(home: string, saveDebounceMs = 5) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const saves: string[] = []
  const instance = await createEditor(container, {
    pageStore: createMemoryPageStore({ home }),
    saveDebounceMs,
    initialPage: 'home',
    onSave: (_page, content) => saves.push(content),
  }).mount()
  // Fake timers drive the autosave debounce and the toolbar's rAF refresh.
  vi.useFakeTimers()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  const button = (action: string) =>
    container.querySelector(`.wn-toolbar-btn[data-action="${action}"]`) as HTMLButtonElement
  return { container, instance, editorDiv, saves, button }
}

/** Place the selection and let the toolbar's rAF-coalesced refresh run. */
async function select(editorDiv: HTMLElement, start: number, end = start): Promise<void> {
  setSelectionOffsets(editorDiv, start, end)
  document.dispatchEvent(new Event('selectionchange'))
  await vi.advanceTimersByTimeAsync(40)
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('editor toolbar', () => {
  it('renders an accessible formatting toolbar, first in the wn-toolbar row', async () => {
    const { container, button } = await mount(DOC)
    const group = container.querySelector('.wn-toolbar > .wn-toolbar-group')!
    expect(group.getAttribute('role')).toBe('toolbar')
    expect(group.getAttribute('aria-label')).toBe('Formatting')
    expect(group.previousElementSibling).toBeNull()
    expect(button('bold').getAttribute('aria-label')).toBe('Bold')
    expect(button('bold').title).toBe('Bold (Ctrl+B)')
    expect(['bold', 'italic', 'underline', 'list'].every((a) => button(a) !== null)).toBe(true)
  })

  it('buttons are disabled until the selection is inside the editor, and again when it leaves', async () => {
    const { editorDiv, button } = await mount(DOC)
    expect(button('bold').disabled).toBe(true)
    await select(editorDiv, 0, 5)
    expect(button('bold').disabled).toBe(false)
    window.getSelection()!.removeAllRanges()
    document.dispatchEvent(new Event('selectionchange'))
    await vi.advanceTimersByTimeAsync(40)
    expect(button('bold').disabled).toBe(true)
  })

  it('mousedown on a button is cancelled so the editor keeps its selection', async () => {
    const { editorDiv, button } = await mount(DOC)
    await select(editorDiv, 0, 5)
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    button('bold').dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: 5 })
  })

  it.each([
    ['bold', '**alpha** one'],
    ['italic', '*alpha* one'],
    ['underline', '<u>alpha</u> one'],
    ['list', '- alpha one'],
  ])(
    '%s applies the same edit as its chord, as one undo step, and autosaves',
    async (action, firstLine) => {
      const { instance, editorDiv, button, saves } = await mount(DOC)
      await select(editorDiv, 0, 5)
      button(action).click()
      expect(instance.getContent()).toBe(`${firstLine}\nbeta two\ngamma three`)

      await vi.advanceTimersByTimeAsync(40)
      expect(saves.at(-1)).toBe(instance.getContent())

      expect(instance.undo()).toBe(true)
      expect(instance.getContent()).toBe(DOC)
    },
  )

  it('a second press toggles the format off and the button reflects the caret', async () => {
    const { instance, editorDiv, button } = await mount(DOC)
    await select(editorDiv, 0, 5)
    button('bold').click() // the inner text stays selected
    expect(button('bold').getAttribute('aria-pressed')).toBe('true')
    button('bold').click()
    expect(instance.getContent()).toBe(DOC)
    expect(button('bold').getAttribute('aria-pressed')).toBe('false')
  })

  it('pressed state follows the caret across formats', async () => {
    const { editorDiv, button } = await mount('a **b** <u>c</u> *d*\n- item')
    await select(editorDiv, 4)
    expect(button('bold').getAttribute('aria-pressed')).toBe('true')
    expect(button('underline').getAttribute('aria-pressed')).toBe('false')
    await select(editorDiv, 11)
    expect(button('underline').getAttribute('aria-pressed')).toBe('true')
    expect(button('bold').getAttribute('aria-pressed')).toBe('false')
    await select(editorDiv, 24)
    expect(button('list').getAttribute('aria-pressed')).toBe('true')
  })

  it('the list button toggles a multi-line selection and skips fenced lines', async () => {
    const text = 'one\ntwo\n```\ncode\n```'
    const { instance, editorDiv, button } = await mount(text)
    await select(editorDiv, 0, text.length)
    button('list').click()
    expect(instance.getContent()).toBe('- one\n- two\n```\ncode\n```')
  })

  it('is disabled and inert inside fenced code', async () => {
    const text = '```\ncode line\n```'
    const { instance, editorDiv, button } = await mount(text)
    await select(editorDiv, 8)
    for (const action of ['bold', 'italic', 'underline', 'list']) {
      expect(button(action).disabled).toBe(true)
      button(action).click()
    }
    expect(instance.getContent()).toBe(text)
  })

  it('is removed with the editor', async () => {
    const { container, instance } = await mount(DOC)
    instance.destroy()
    expect(container.querySelector('.wn-toolbar-group')).toBeNull()
  })

  it('the list button is pressed only when its press would remove (fenced lines ignored)', async () => {
    const text = '- one\n- two\n```\ncode\n```'
    const { editorDiv, button } = await mount(text)
    await select(editorDiv, 0, text.length)
    expect(button('list').getAttribute('aria-pressed')).toBe('true')
  })

  it('does no work for selection changes while hidden, and catches up when shown again', async () => {
    const { instance, editorDiv, button } = await mount(DOC)
    await select(editorDiv, 0, 5)
    expect(button('bold').disabled).toBe(false)
    const toolbarEl = button('bold').closest('.wn-toolbar-group') as HTMLElement
    toolbarEl.hidden = true
    window.getSelection()!.removeAllRanges()
    document.dispatchEvent(new Event('selectionchange'))
    await vi.advanceTimersByTimeAsync(40)
    expect(button('bold').disabled).toBe(false) // not recomputed while hidden
    toolbarEl.hidden = false
    document.dispatchEvent(new Event('selectionchange'))
    await vi.advanceTimersByTimeAsync(40)
    expect(button('bold').disabled).toBe(true)
    expect(instance.getContent()).toBe(DOC)
  })
})
