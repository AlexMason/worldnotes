// @vitest-environment happy-dom

// ─── Link field (Link button + Ctrl+K): end-to-end through the real editor ──

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { getSelectionOffsets, setSelectionOffsets } from '../caret-offset'
import type { PageStore, PageSuggestion } from '../types'

const DOC = 'alpha one\nbeta two\ngamma three'

async function mount(home: string, extra: { store?: PageStore; homeSlug?: string } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = await createEditor(container, {
    pageStore: extra.store ?? createMemoryPageStore({ home }),
    saveDebounceMs: 5,
    initialPage: 'home',
    homeSlug: extra.homeSlug,
  }).mount()
  vi.useFakeTimers()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return {
    container,
    instance,
    editorDiv,
    field: () => container.querySelector('.wn-link-field') as HTMLElement | null,
    input: () => container.querySelector('.wn-link-field-input') as HTMLInputElement,
    msg: () => container.querySelector('.wn-link-field-msg')!.textContent,
    group: () => container.querySelector('.wn-toolbar-group') as HTMLElement,
    options: () => Array.from(container.querySelectorAll('.wn-link-field-option')),
  }
}

function key(el: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(event)
  return event
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function select(editorDiv: HTMLElement, start: number, end = start): Promise<void> {
  setSelectionOffsets(editorDiv, start, end)
  document.dispatchEvent(new Event('selectionchange'))
  await vi.advanceTimersByTimeAsync(40)
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('link field', () => {
  it('Ctrl+K opens the field in the toolbar row in place of the buttons', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    const e = key(t.editorDiv, { key: 'k', ctrlKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(t.field()!.parentElement!.classList.contains('wn-toolbar')).toBe(true)
    expect(t.group().hidden).toBe(true)
    expect(t.input().getAttribute('role')).toBe('combobox')
  })

  it('the Link button opens the same field', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    ;(t.container.querySelector('[data-action="link"]') as HTMLButtonElement).click()
    expect(t.field()).not.toBeNull()
  })

  it('a wiki target links the selection; one undo step; field closes, buttons return', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'lore/old-gods')
    expect(t.msg()).toBe('Wiki link → /home/lore/old-gods')
    key(t.input(), { key: 'Enter' })

    expect(t.instance.getContent()).toBe('[[lore/old-gods|alpha]] one\nbeta two\ngamma three')
    expect(getSelectionOffsets(t.editorDiv)).toEqual({ start: 23, end: 23 })
    expect(t.field()).toBeNull()
    expect(t.group().hidden).toBe(false)

    expect(t.instance.undo()).toBe(true)
    expect(t.instance.getContent()).toBe(DOC)
  })

  it('a URL links the selection (bare hosts get https://)', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'example.com')
    expect(t.msg()).toBe('URL')
    key(t.input(), { key: 'Enter' })
    expect(t.instance.getContent()).toBe('[alpha](https://example.com) one\nbeta two\ngamma three')
  })

  it('refuses unsafe URLs inline and writes nothing', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'javascript:alert(1)')
    key(t.input(), { key: 'Enter' })
    expect(t.msg()).toBe('That kind of link is not allowed')
    expect(t.input().getAttribute('aria-invalid')).toBe('true')
    expect(t.field()).not.toBeNull()
    expect(t.instance.getContent()).toBe(DOC)
  })

  it('a link the grammar cannot hold (multi-line selection) stays open with the reason', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 15)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'page')
    key(t.input(), { key: 'Enter' })
    expect(t.msg()).toBe('Select text on a single line to turn it into a link')
    expect(t.instance.getContent()).toBe(DOC)
  })

  it('Escape cancels without writing and restores the selection', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'page')
    const e = key(t.input(), { key: 'Escape' })
    expect(e.defaultPrevented).toBe(true)
    expect(t.field()).toBeNull()
    expect(t.group().hidden).toBe(false)
    expect(t.instance.getContent()).toBe(DOC)
    expect(getSelectionOffsets(t.editorDiv)).toEqual({ start: 0, end: 5 })
  })

  it('leaving the field cancels it', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    t.input().dispatchEvent(new FocusEvent('blur'))
    expect(t.field()).toBeNull()
    expect(t.instance.getContent()).toBe(DOC)
  })

  it('inside an existing link it is prefilled and rewrites the target, keeping the text', async () => {
    const t = await mount('see [t](https://x.test) now')
    await select(t.editorDiv, 8)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    expect(t.input().value).toBe('https://x.test')
    type(t.input(), 'lore')
    key(t.input(), { key: 'Enter' })
    expect(t.instance.getContent()).toBe('see [[lore|t]] now')
  })

  it('is a consumed no-op inside fenced code', async () => {
    const t = await mount('```\ncode line here\n```')
    await select(t.editorDiv, 10)
    const e = key(t.editorDiv, { key: 'k', ctrlKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(t.field()).toBeNull()
  })

  it('drops the pending link (no write) when the page text changed meanwhile', async () => {
    const t = await mount(DOC)
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'page')
    t.instance.setContent('something else entirely')
    key(t.input(), { key: 'Enter' })
    expect(t.instance.getContent()).toBe('something else entirely')
    expect(t.field()).toBeNull()
  })
})

describe('link field suggestions', () => {
  function storeWith(suggest: PageStore['suggest']): PageStore {
    return { ...createMemoryPageStore({ home: DOC }), suggest }
  }
  const GODS: PageSuggestion = { slug: 'lore/old-gods', title: 'The Old Gods' }

  it('shows ranked matches after the debounce; arrows + Enter pick one', async () => {
    const suggest = vi.fn(async () => [{ slug: 'diary/gods-and-old-men', title: 'Diary' }, GODS])
    const t = await mount(DOC, { store: storeWith(suggest), homeSlug: 'home' })
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'old')
    expect(suggest).not.toHaveBeenCalled() // debounced
    await vi.advanceTimersByTimeAsync(150)
    expect(suggest).toHaveBeenCalledWith('old', 8)

    // title/slug prefix matches rank first
    expect(
      t.options().map((o) => o.querySelector('.wn-link-field-option-title')!.textContent),
    ).toEqual(['The Old Gods', 'Diary'])
    expect(t.input().getAttribute('aria-expanded')).toBe('true')

    key(t.input(), { key: 'ArrowDown' })
    expect(t.input().getAttribute('aria-activedescendant')).toBe(t.options()[0]!.id)
    expect(t.options()[0]!.getAttribute('aria-selected')).toBe('true')
    key(t.input(), { key: 'Enter' })

    // site-root link base → the bare slug
    expect(t.instance.getContent()).toBe('[[lore/old-gods|alpha]] one\nbeta two\ngamma three')
  })

  it('a suggested page outside the current link base is written root-absolute', async () => {
    const suggest = vi.fn(async () => [GODS])
    // no homeSlug: the page `home` is an ordinary page, so its link base is `home`
    const t = await mount(DOC, { store: storeWith(suggest) })
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'old')
    await vi.advanceTimersByTimeAsync(150)
    key(t.input(), { key: 'ArrowDown' })
    key(t.input(), { key: 'Enter' })
    expect(t.instance.getContent()).toBe('[[/lore/old-gods|alpha]] one\nbeta two\ngamma three')
  })

  it('an older, slower response never overwrites the newer one', async () => {
    const pending: ((v: PageSuggestion[]) => void)[] = []
    const suggest = vi.fn(() => new Promise<PageSuggestion[]>((resolve) => pending.push(resolve)))
    const t = await mount(DOC, { store: storeWith(suggest) })
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })

    type(t.input(), 'ol')
    await vi.advanceTimersByTimeAsync(150)
    type(t.input(), 'old')
    await vi.advanceTimersByTimeAsync(150)
    expect(suggest).toHaveBeenCalledTimes(2)

    pending[1]!([GODS]) // newer answer lands first
    await vi.advanceTimersByTimeAsync(0)
    pending[0]!([{ slug: 'stale', title: 'Stale' }])
    await vi.advanceTimersByTimeAsync(0)
    expect(t.options().map((o) => o.textContent)).toEqual(['The Old Gods/lore/old-gods'])
  })

  it('no search for URLs or empty input; a failing store just shows nothing', async () => {
    const suggest = vi.fn(async () => {
      throw new Error('offline')
    })
    const t = await mount(DOC, { store: storeWith(suggest) })
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'https://x.test')
    type(t.input(), '')
    await vi.advanceTimersByTimeAsync(300)
    expect(suggest).not.toHaveBeenCalled()

    type(t.input(), 'old')
    await vi.advanceTimersByTimeAsync(150)
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(t.options()).toHaveLength(0)
    key(t.input(), { key: 'Enter' }) // typed text still commits
    expect(t.instance.getContent()).toBe('[[old|alpha]] one\nbeta two\ngamma three')
  })

  it('a store without suggest simply offers none', async () => {
    const t = await mount(DOC, { store: { load: async () => DOC, save: async () => undefined } })
    await select(t.editorDiv, 0, 5)
    key(t.editorDiv, { key: 'k', ctrlKey: true })
    type(t.input(), 'old')
    await vi.advanceTimersByTimeAsync(300)
    expect(t.options()).toHaveLength(0)
  })
})
