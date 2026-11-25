// @vitest-environment happy-dom

// ─── Range selections (issue #3) through the real pipeline ──────────────────
// Mounts the actual editor and drives it like a user: selections placed via
// setSelectionOffsets / setBaseAndExtent, keys and beforeinput dispatched on
// the editor root. happy-dom has no layout, so drag geometry and the
// vertical goal column are verified in a real browser, not here.

import { describe, it, expect, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { getSelectionFocusEnd, getSelectionOffsets, setSelectionOffsets } from '../caret-offset'

// line0 'alpha one' 0..9 · line1 'beta two' 10..18 · line2 'gamma three' 19..30
const DOC = 'alpha one\nbeta two\ngamma three'

async function mount(content = DOC) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = await createEditor(container, {
    pageStore: createMemoryPageStore({ home: content }),
    saveDebounceMs: 60_000,
    initialPage: 'home',
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { instance, editorDiv }
}

function beforeInput(el: HTMLElement, init: InputEventInit): InputEvent {
  const e = new InputEvent('beforeinput', { bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(e)
  return e
}

function key(el: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(e)
  return e
}

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('range selection survives re-renders', () => {
  it('a forced render without a caret target keeps the range', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 22) // 'one\nbeta two\nga'
    instance.setContent(DOC)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 22 })
  })

  it('keeps a backward (focus-at-start) selection backward', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 22, 'start')
    expect(getSelectionFocusEnd(editorDiv)).toBe('start')
    instance.setContent(DOC)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 22 })
    expect(getSelectionFocusEnd(editorDiv)).toBe('start')
  })

  it('clamps the kept range to shorter text after undo', async () => {
    const { instance, editorDiv } = await mount('ab')
    instance.setContent('ab\ncdef')
    setSelectionOffsets(editorDiv, 1, 7)
    instance.undo()
    expect(instance.getContent()).toBe('ab')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 1, end: 2 })
  })
})

describe('edits over a range selection go through the model', () => {
  it('Backspace deletes exactly the selected source, one undo step', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 22)
    key(editorDiv, { key: 'Backspace' })
    expect(instance.getContent()).toBe('alpha ma three')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 6 })
    instance.undo()
    expect(instance.getContent()).toBe(DOC)
  })

  it.each([
    ['insertText', 'X', 'alpha Xma three'],
    ['insertParagraph', null, 'alpha \nma three'],
    ['deleteContentForward', null, 'alpha ma three'],
    ['deleteWordBackward', null, 'alpha ma three'],
    ['deleteByCut', null, 'alpha ma three'],
  ])('beforeinput %s replaces the range', async (inputType, data, expected) => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 22)
    const e = beforeInput(editorDiv, { inputType, data })
    expect(e.defaultPrevented).toBe(true)
    expect(instance.getContent()).toBe(expected)
    instance.undo()
    expect(instance.getContent()).toBe(DOC)
  })

  it('Enter over a range replaces it with one line break', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 22)
    key(editorDiv, { key: 'Enter' })
    expect(instance.getContent()).toBe('alpha \nma three')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 7, end: 7 })
  })

  it('a range ending inside a rendered token span loses nothing', async () => {
    // line1 holds a wiki link rendered as a data-raw span (caret on line0).
    const doc = 'top\nsee [[Some Page|Label]] end'
    const { instance, editorDiv } = await mount(doc)
    const end = doc.indexOf('Label') + 2 // inside the span's visible label
    setSelectionOffsets(editorDiv, 1, end)
    const mapped = getSelectionOffsets(editorDiv)!
    beforeInput(editorDiv, { inputType: 'insertText', data: 'Z' })
    expect(instance.getContent()).toBe(doc.slice(0, 1) + 'Z' + doc.slice(mapped.end))
  })

  it('leaves collapsed-caret and composition input on the native path', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 3, 3)
    expect(beforeInput(editorDiv, { inputType: 'insertText', data: 'x' }).defaultPrevented).toBe(
      false,
    )
    setSelectionOffsets(editorDiv, 6, 22)
    const composing = beforeInput(editorDiv, {
      inputType: 'insertCompositionText',
      data: 'x',
      isComposing: true,
    })
    expect(composing.defaultPrevented).toBe(false)
    expect(instance.getContent()).toBe(DOC)
  })

  it('a selection reaching outside the editor changes nothing', async () => {
    const { instance, editorDiv } = await mount()
    const outside = document.createElement('p')
    outside.textContent = 'chrome'
    document.body.prepend(outside) // before the editor: a forward range into it
    const sel = window.getSelection()!
    sel.removeAllRanges()
    const range = document.createRange()
    range.setStart(outside.firstChild!, 0)
    range.setEnd(editorDiv.querySelector('[data-line="1"]')!.firstChild!, 2)
    sel.addRange(range)
    key(editorDiv, { key: 'Enter' })
    key(editorDiv, { key: 'Backspace' })
    expect(beforeInput(editorDiv, { inputType: 'insertText', data: 'x' }).defaultPrevented).toBe(
      true,
    )
    expect(instance.getContent()).toBe(DOC)
  })

  it('Backspace removes a surrogate pair as one character', async () => {
    const { instance, editorDiv } = await mount('a😀b')
    setSelectionOffsets(editorDiv, 3, 3) // after the emoji
    key(editorDiv, { key: 'Backspace' })
    expect(instance.getContent()).toBe('ab')
    instance.setContent('a😀b')
    setSelectionOffsets(editorDiv, 1, 1)
    instance.deleteForward()
    expect(instance.getContent()).toBe('ab')
  })
})

describe('Ctrl/Cmd+A', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'selects only the page body (%o)',
    async (mod) => {
      const { editorDiv } = await mount()
      setSelectionOffsets(editorDiv, 12, 12)
      expect(key(editorDiv, { key: 'a', ...mod }).defaultPrevented).toBe(true)
      expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: DOC.length })
    },
  )
})

describe('mouse-freeze guard', () => {
  const lineText = (el: HTMLElement, n: number): string =>
    el.querySelector(`[data-line="${n}"]`)!.innerHTML

  it('defers line activation until mouseup', async () => {
    const doc = 'top\n**bold** line'
    const { editorDiv } = await mount(doc)
    const rendered = lineText(editorDiv, 1)
    expect(rendered).not.toBe('**bold** line') // inactive line renders tokens

    editorDiv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    setSelectionOffsets(editorDiv, 6, 6) // caret moved onto line 1 mid-press
    document.dispatchEvent(new Event('selectionchange'))
    await nextFrame()
    expect(lineText(editorDiv, 1)).toBe(rendered) // DOM untouched during the drag

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))
    await nextFrame()
    expect(lineText(editorDiv, 1)).toBe('**bold** line') // activated once released
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 6 })
  })
})
