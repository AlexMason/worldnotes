// @vitest-environment happy-dom

// ─── Clipboard carries source markdown (issue #2) ───────────────────────────
// Real editor mount. The caret starts on line 0, so every other line renders
// its tokens (labels instead of wiki targets, bullet glyphs, hidden table
// pipes / image URLs) — exactly the surfaces the browser's own copy
// serializer gets wrong.

import { describe, it, expect, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { getSelectionOffsets, setSelectionOffsets } from '../caret-offset'

const DOC = [
  'caret here',
  '- item one',
  'see [[blog/post|Client Portal]] and [label](https://example.com/x)',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  '![alt](/media/7) ~~gone~~ **b** *i*',
].join('\n')

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

function clip(
  el: HTMLElement,
  type: 'copy' | 'cut' | 'paste',
  data: Record<string, string> = {},
): { event: ClipboardEvent; transfer: DataTransfer } {
  const transfer = new DataTransfer()
  for (const [k, v] of Object.entries(data)) transfer.setData(k, v)
  const event = new ClipboardEvent(type, {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer,
  })
  el.dispatchEvent(event)
  return { event, transfer }
}

const range = (needle: string): [number, number] => {
  const at = DOC.indexOf(needle)
  return [at, at + needle.length]
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('copy', () => {
  it.each([
    ['wiki link', '[[blog/post|Client Portal]]'],
    ['markdown link', '[label](https://example.com/x)'],
    ['list item', '- item one'],
    ['table row', '| 1 | 2 |'],
    ['table separator', '|---|---|'],
    ['image', '![alt](/media/7)'],
    ['strikethrough + emphasis', '~~gone~~ **b** *i*'],
  ])('a %s copies as its exact source', async (_name, source) => {
    const { editorDiv } = await mount()
    setSelectionOffsets(editorDiv, ...range(source))
    const { event, transfer } = clip(editorDiv, 'copy')
    expect(event.defaultPrevented).toBe(true)
    expect(transfer.getData('text/plain')).toBe(source)
  })

  it('a multi-line selection across every token type copies byte-exact', async () => {
    const { editorDiv } = await mount()
    setSelectionOffsets(editorDiv, DOC.indexOf('- item'), DOC.length)
    expect(clip(editorDiv, 'copy').transfer.getData('text/plain')).toBe(
      DOC.slice(DOC.indexOf('- item')),
    )
  })

  it('an empty selection copies the caret line with its line break', async () => {
    const { editorDiv, instance } = await mount()
    setSelectionOffsets(editorDiv, 13, 13) // inside '- item one'
    expect(clip(editorDiv, 'copy').transfer.getData('text/plain')).toBe('- item one\n')
    expect(instance.getContent()).toBe(DOC)
  })

  it('leaves a selection reaching outside the editor to the browser', async () => {
    const { editorDiv } = await mount()
    const outside = document.createElement('p')
    outside.textContent = 'chrome'
    document.body.prepend(outside)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    const r = document.createRange()
    r.setStart(outside.firstChild!, 0)
    r.setEnd(editorDiv.querySelector('[data-line="0"]')!.firstChild!, 3)
    sel.addRange(r)
    expect(clip(editorDiv, 'copy').event.defaultPrevented).toBe(false)
  })
})

describe('cut', () => {
  it('= copy + one model delete (one undo step)', async () => {
    const { editorDiv, instance } = await mount()
    const [start, end] = range('[[blog/post|Client Portal]] and ')
    setSelectionOffsets(editorDiv, start, end)
    const { event, transfer } = clip(editorDiv, 'cut')
    expect(event.defaultPrevented).toBe(true)
    expect(transfer.getData('text/plain')).toBe('[[blog/post|Client Portal]] and ')
    expect(instance.getContent()).toBe(DOC.slice(0, start) + DOC.slice(end))
    expect(getSelectionOffsets(editorDiv)).toEqual({ start, end: start })
    instance.undo()
    expect(instance.getContent()).toBe(DOC)
  })

  it('an empty selection cuts the whole line, including the last one', async () => {
    const { editorDiv, instance } = await mount('one\ntwo\nthree')
    setSelectionOffsets(editorDiv, 5, 5)
    expect(clip(editorDiv, 'cut').transfer.getData('text/plain')).toBe('two\n')
    expect(instance.getContent()).toBe('one\nthree')
    setSelectionOffsets(editorDiv, 6, 6) // on 'three', the last line
    expect(clip(editorDiv, 'cut').transfer.getData('text/plain')).toBe('three\n')
    expect(instance.getContent()).toBe('one')
  })
})

describe('paste', () => {
  it('normalizes CRLF / CR to LF', async () => {
    const { editorDiv, instance } = await mount('ab')
    setSelectionOffsets(editorDiv, 1, 1)
    clip(editorDiv, 'paste', { 'text/plain': 'x\r\ny\rz' })
    expect(instance.getContent()).toBe('ax\ny\nzb')
  })

  it('falls back to text/uri-list, skipping comment lines', async () => {
    const { editorDiv, instance } = await mount('')
    clip(editorDiv, 'paste', {
      'text/uri-list': '# from a file manager\r\nfile:///tmp/a.png\r\nhttps://example.com/b',
    })
    expect(instance.getContent()).toBe('file:///tmp/a.png\nhttps://example.com/b')
  })

  it('replaces a multi-line selection exactly, one undo step', async () => {
    const { editorDiv, instance } = await mount()
    const [start, end] = [DOC.indexOf('item'), DOC.indexOf('| 2 |')]
    setSelectionOffsets(editorDiv, start, end)
    clip(editorDiv, 'paste', { 'text/plain': 'NEW' })
    expect(instance.getContent()).toBe(DOC.slice(0, start) + 'NEW' + DOC.slice(end))
    instance.undo()
    expect(instance.getContent()).toBe(DOC)
  })

  it('never loses text pasted with the caret inside a rendered token span', async () => {
    const { editorDiv, instance } = await mount()
    setSelectionOffsets(editorDiv, ...range('Client'))
    const at = getSelectionOffsets(editorDiv)!.end // caret inside the span
    setSelectionOffsets(editorDiv, at, at)
    clip(editorDiv, 'paste', { 'text/plain': 'PASTED' })
    expect(instance.getContent()).toBe(DOC.slice(0, at) + 'PASTED' + DOC.slice(at))
  })

  it('round-trips a copy of every token type losslessly', async () => {
    const { editorDiv, instance } = await mount()
    setSelectionOffsets(editorDiv, 0, DOC.length)
    const copied = clip(editorDiv, 'cut').transfer.getData('text/plain')
    expect(instance.getContent()).toBe('')
    clip(editorDiv, 'paste', { 'text/plain': copied })
    expect(instance.getContent()).toBe(DOC)
  })

  it('an empty-selection copy pasted back duplicates the line above the caret', async () => {
    const { editorDiv, instance } = await mount('one\ntwo')
    setSelectionOffsets(editorDiv, 1, 1)
    const copied = clip(editorDiv, 'copy').transfer.getData('text/plain')
    setSelectionOffsets(editorDiv, 6, 6) // 'tw|o'
    clip(editorDiv, 'paste', { 'text/plain': copied })
    expect(instance.getContent()).toBe('one\none\ntwo')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 10, end: 10 }) // still 'tw|o'
  })

  it('other text equal to nothing copied pastes at the caret, not line-wise', async () => {
    const { editorDiv, instance } = await mount('one\ntwo')
    setSelectionOffsets(editorDiv, 6, 6)
    clip(editorDiv, 'paste', { 'text/plain': 'one\n' })
    expect(instance.getContent()).toBe('one\ntwone\no')
  })
})
