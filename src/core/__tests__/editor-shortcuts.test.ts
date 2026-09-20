// @vitest-environment happy-dom

// ─── Editing shortcuts: end-to-end through the real pipeline ────────────────
// Mounts the actual editor (real builder, real render pipeline, real keydown
// handlers) and dispatches modifier chords like a user. Selection is placed
// through setSelectionOffsets (the same API the keymap restores with), so
// these tests double as round-trip coverage of caret ↔ raw-offset mapping
// under render+restore. happy-dom rules respected: removeAllRanges before
// addRange (ignored otherwise); no Selection.modify anywhere.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { getSelectionOffsets, setSelectionOffsets } from '../caret-offset'
import type { EditorInstance } from '../types'

async function mount(seed: Record<string, string>, saveDebounceMs = 5000) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const store = createMemoryPageStore(seed)
  const saves: { page: string; content: string }[] = []
  const instance: EditorInstance = await createEditor(container, {
    pageStore: store,
    saveDebounceMs,
    initialPage: 'home',
    onSave: (page, content) => saves.push({ page, content }),
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { container, store, saves, instance, editorDiv }
}

function key(editorDiv: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  editorDiv.dispatchEvent(event)
  return event
}

function select(editorDiv: HTMLElement, start: number, end = start): void {
  setSelectionOffsets(editorDiv, start, end)
}

// "alpha one\nbeta two\ngamma three"
// line0 0..8 (alpha=0-4, sp=5, one=6-8) sep 9
// line1 10..17 (beta=10-13, sp=14, two=15-17) sep 18
// line2 19..29 (gamma=19-23, sp=24, three=25-29)  length 30
const DOC = 'alpha one\nbeta two\ngamma three'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Alt+Up/Down — move lines', () => {
  it('moves the caret line down, caret follows', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 12) // inside "beta two", col 2
    key(editorDiv, { key: 'ArrowDown', altKey: true })
    expect(instance.getContent()).toBe('alpha one\ngamma three\nbeta two')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 24, end: 24 }) // line2 start 22 + col 2
  })

  it('moves the caret line up', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 12)
    key(editorDiv, { key: 'ArrowUp', altKey: true })
    expect(instance.getContent()).toBe('beta two\nalpha one\ngamma three')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 2, end: 2 })
  })

  it('multi-line selection moves whole touched block, selection preserved', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 6, 17) // 'one\nbeta tw' — lines 0..1
    key(editorDiv, { key: 'ArrowDown', altKey: true })
    const after = 'gamma three\nalpha one\nbeta two'
    expect(instance.getContent()).toBe(after)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 18, end: 29 })
    expect(after.slice(18, 29)).toBe('one\nbeta tw')
  })

  it('no-op at document edges consumes the event and changes nothing', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 3)
    const e = key(editorDiv, { key: 'ArrowUp', altKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(instance.getContent()).toBe(DOC)
    select(editorDiv, 25)
    key(editorDiv, { key: 'ArrowDown', altKey: true })
    expect(instance.getContent()).toBe(DOC)
  })

  it('one move = exactly one undo step', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 12)
    key(editorDiv, { key: 'ArrowDown', altKey: true })
    expect(instance.undo()).toBe(true)
    expect(instance.getContent()).toBe(DOC)
    expect(instance.redo()).toBe(true)
    expect(instance.getContent()).toBe('alpha one\ngamma three\nbeta two')
    expect(instance.redo()).toBe(false) // no double history entries
  })
})

describe('Ctrl+Shift+D / Ctrl+Shift+K — duplicate & delete lines', () => {
  it('duplicates the caret line and selects the copy', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 12)
    key(editorDiv, { key: 'D', ctrlKey: true, shiftKey: true })
    const after = 'alpha one\nbeta two\nbeta two\ngamma three'
    expect(instance.getContent()).toBe(after)
    // copy is line 2 (starts 19): col 2 → caret 21
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 21, end: 21 })
  })

  it('duplicates a multi-line block with the selection on the copy', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 6, 17)
    key(editorDiv, { key: 'D', ctrlKey: true, shiftKey: true })
    const after = 'alpha one\nbeta two\nalpha one\nbeta two\ngamma three'
    expect(instance.getContent()).toBe(after)
    const sel = getSelectionOffsets(editorDiv)!
    expect(sel).toEqual({ start: 25, end: 36 })
    expect(after.slice(sel.start, sel.end)).toBe('one\nbeta tw')
  })

  it('deletes the caret line, caret lands on the replacing line', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 12)
    key(editorDiv, { key: 'K', ctrlKey: true, shiftKey: true })
    expect(instance.getContent()).toBe('alpha one\ngamma three')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 10, end: 10 })
  })

  it('deletes every touched line of a selection; emptying lands at 0', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0, DOC.length)
    key(editorDiv, { key: 'K', ctrlKey: true, shiftKey: true })
    expect(instance.getContent()).toBe('')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: 0 })
  })
})

describe('Ctrl+Backspace — delete word', () => {
  it('deletes a whitespace run leftward (stops at line content)', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 15) // the space in "beta |two" — wait, 15 is 't'; 14 is the space
    key(editorDiv, { key: 'Backspace', ctrlKey: true })
    // caret AFTER 'two'? no: 15 = start of 'two' (t at 15). Delete back over
    // the whitespace run left: the ' ' at 14 → 'beta two' loses the space.
    expect(instance.getContent()).toBe('alpha one\nbetatwo\ngamma three')
  })

  it('deletes a word run leftward', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 9) // end of line 0 ("alpha one|")
    key(editorDiv, { key: 'Backspace', altKey: true }) // Alt alias
    expect(instance.getContent()).toBe('alpha \nbeta two\ngamma three')
  })

  it('deletes a selection when non-collapsed', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 2, 9) // 'pha one'
    key(editorDiv, { key: 'Backspace', ctrlKey: true })
    expect(instance.getContent()).toBe('al\nbeta two\ngamma three')
  })

  it('at a line start joins with the previous line', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 10) // start of line 1
    key(editorDiv, { key: 'Backspace', ctrlKey: true })
    expect(instance.getContent()).toBe('alpha onebeta two\ngamma three')
  })

  it('no longer breaks plain Backspace (regression: single char still works)', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 5)
    key(editorDiv, { key: 'Backspace' })
    expect(instance.getContent()).toBe('alph one\nbeta two\ngamma three')
  })
})

describe('Ctrl/Alt+arrows — word motion & selection', () => {
  it('Ctrl+Right jumps to the next word start (no text change)', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0)
    key(editorDiv, { key: 'ArrowRight', ctrlKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 6 }) // past "alpha "
    expect(instance.getContent()).toBe(DOC)
  })

  it('motion crosses line breaks', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 8) // end of "alpha one" → over the '\n', lands at 'beta' start
    key(editorDiv, { key: 'ArrowRight', ctrlKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 10, end: 10 })
  })

  it('Ctrl+Left walks word starts backwards', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, DOC.length) // end of 'three'
    key(editorDiv, { key: 'ArrowLeft', ctrlKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 25, end: 25 }) // start of 'three'
    key(editorDiv, { key: 'ArrowLeft', ctrlKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 19, end: 19 }) // start of 'gamma'
  })

  it('Alt+←/→ aliases work (macOS)', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0)
    key(editorDiv, { key: 'ArrowRight', altKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 6, end: 6 })
  })

  it('Ctrl+Shift+Right extends the selection', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0)
    key(editorDiv, { key: 'ArrowRight', ctrlKey: true, shiftKey: true })
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: 6 })
  })

  it('motion at document edges is a consumed no-op', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0)
    const e = key(editorDiv, { key: 'ArrowLeft', ctrlKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: 0 })
  })
})

describe('Ctrl+B / Ctrl+I / Ctrl+K — markdown wrapping', () => {
  it('wraps a selection and keeps the content selected', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0, 5) // 'alpha'
    key(editorDiv, { key: 'b', ctrlKey: true })
    const after = instance.getContent()
    expect(after).toBe('**alpha** one\nbeta two\ngamma three')
    const sel = getSelectionOffsets(editorDiv)!
    expect(after.slice(sel.start, sel.end)).toBe('alpha')
  })

  it('second press unwraps (true toggle)', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0, 5)
    key(editorDiv, { key: 'b', ctrlKey: true })
    key(editorDiv, { key: 'b', ctrlKey: true })
    expect(instance.getContent()).toBe(DOC)
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 0, end: 5 })
  })

  it('collapsed caret inserts the empty pair with the caret between', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 6)
    key(editorDiv, { key: 'i', ctrlKey: true })
    expect(instance.getContent()).toBe('alpha **one\nbeta two\ngamma three')
    expect(getSelectionOffsets(editorDiv)).toEqual({ start: 7, end: 7 })
  })

  it('Ctrl+K creates a link with the URL slot selected', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0, 5)
    key(editorDiv, { key: 'k', ctrlKey: true })
    const after = instance.getContent()
    expect(after).toBe('[alpha]() one\nbeta two\ngamma three')
    const sel = getSelectionOffsets(editorDiv)!
    expect(sel).toEqual({ start: 8, end: 8 }) // just after the '('
  })

  it('formatting is a consumed no-op inside fenced code', async () => {
    const { instance, editorDiv } = await mount({ home: '```\ncode line here\n```' })
    select(editorDiv, 10) // inside the fence body
    const e = key(editorDiv, { key: 'b', ctrlKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(instance.getContent()).toBe('```\ncode line here\n```')
  })

  it('toggle is one undo step', async () => {
    const { instance, editorDiv } = await mount({ home: DOC })
    select(editorDiv, 0, 5)
    key(editorDiv, { key: 'b', ctrlKey: true })
    expect(instance.undo()).toBe(true)
    expect(instance.getContent()).toBe(DOC)
  })
})

describe('Ctrl+S — flush save immediately', () => {
  it('saves pending content without waiting for the debounce, and clears it', async () => {
    const { instance, editorDiv, saves } = await mount({ home: DOC }, 5000)
    vi.useFakeTimers()
    select(editorDiv, 12)
    key(editorDiv, { key: 'ArrowDown', altKey: true }) // dirty buffer, 5s debounce armed
    expect(saves).toHaveLength(0)

    key(editorDiv, { key: 's', ctrlKey: true })
    await vi.advanceTimersByTimeAsync(0) // let the async save settle
    expect(saves).toHaveLength(1)
    expect(saves[0]!.content).toBe('alpha one\ngamma three\nbeta two')

    // the cleared debounce timer must not fire a second save later
    await vi.advanceTimersByTimeAsync(10_000)
    expect(saves).toHaveLength(1)
  })
})

describe('autosave after shortcut ops', () => {
  it('a text-changing shortcut schedules the debounced save', async () => {
    const { editorDiv, saves } = await mount({ home: DOC }, 20)
    select(editorDiv, 12)
    key(editorDiv, { key: 'D', ctrlKey: true, shiftKey: true })
    await new Promise((r) => setTimeout(r, 60))
    expect(saves).toHaveLength(1)
    expect(saves[0]!.content).toContain('beta two\nbeta two')
  })
})
