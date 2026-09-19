// @vitest-environment happy-dom

// ─── End-to-end editor gate: mount → edit → undo → autosave ─────────────────
// Exercises the whole client pipeline over a PageStore with the real builder,
// the real DOM event handlers, and real (short) debounce timers.

import { describe, it, expect } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mountEditor(seed: Record<string, string>) {
  const container = document.createElement('div')
  const store = createMemoryPageStore(seed)
  const saves: { page: string; content: string }[] = []

  const instance = await createEditor(container, {
    pageStore: store,
    saveDebounceMs: 20,
    initialPage: 'home',
    onSave: (page, content) => saves.push({ page, content }),
  }).mount()

  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { container, store, saves, instance, editorDiv }
}

describe('editor autosave integration', () => {
  it('hydrates the initial page from the store on mount', async () => {
    const { instance } = await mountEditor({ home: '# Seeded home' })
    expect(instance.getContent()).toBe('# Seeded home')
  })

  it('seeds default content for a brand-new page and does not save it yet', async () => {
    const { instance, store } = await mountEditor({})
    expect(instance.getContent()).toContain('Welcome to your world')
    await sleep(60)
    expect(store.dump()).toEqual({})
  })

  it('typing persists via debounced save; undo autosaves the reverted content', async () => {
    const { store, saves, instance, editorDiv } = await mountEditor({
      home: '# Base',
    })

    // Type into the editor (DOM input → buffers → debounce → store.save)
    editorDiv.textContent = '# Base typed'
    editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

    await sleep(60)
    expect(store.dump()['home']).toBe('# Base typed')
    expect(saves).toEqual([{ page: 'home', content: '# Base typed' }])

    // Undo reverts to the loaded baseline and autosaves the revert
    expect(instance.undo()).toBe(true)
    expect(instance.getContent()).toBe('# Base')
    await sleep(60)
    expect(store.dump()['home']).toBe('# Base')
    expect(saves.map((s) => s.content)).toEqual(['# Base typed', '# Base'])

    // Redo brings the edit back and autosaves again
    expect(instance.redo()).toBe(true)
    await sleep(60)
    expect(store.dump()['home']).toBe('# Base typed')
  })

  it('rapid typing collapses into one debounced save', async () => {
    const { store, editorDiv } = await mountEditor({ home: '' })

    for (const text of ['a', 'ab', 'abc', 'abcd']) {
      editorDiv.textContent = text
      editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      await sleep(5)
    }
    await sleep(60)

    expect(store.dump()['home']).toBe('abcd')
  })

  it('multi-line edits round-trip through the store', async () => {
    const { store, editorDiv } = await mountEditor({ home: 'x' })

    editorDiv.textContent = 'line1\nline2'
    editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
    await sleep(60)
    expect(store.dump()['home']).toBe('line1\nline2')
  })
})
