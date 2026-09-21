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

  // ── Link clicks: fold to the canonical page, never a ghost/404 ─────────

  it('clicking /Blog/First-Post opens blog/first-post with a clean trail', async () => {
    // Link sits on line 2 so it is NOT the active (raw-rendered) line.
    const { container, instance } = await mountEditor({
      home: '# Home\n\n[Post](/Blog/First-Post) and [[other page]]\n',
      'blog/first-post': '# First Post\n\nBody.\n',
    })

    const link = container.querySelector('[data-page="/Blog/First-Post"]') as HTMLElement
    expect(link).not.toBeNull()
    link.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    await sleep(60)

    // Folded: buffer key, trail, and current page all speak the canonical slug
    expect(instance.getCurrentPage()).toBe('blog/first-post')
    expect(instance.getTrail()).toEqual(['home', 'blog', 'first-post'])
    expect(instance.getContent()).toContain('Body.')

    // No ghost crumb: every rendered crumb carries a label
    for (const crumb of Array.from(container.querySelectorAll('.wn-crumb'))) {
      expect(crumb.textContent).not.toBe('')
    }
  })

  it('clicking a link to a missing page drops into a seeded editor (no 404, no save)', async () => {
    const { store, instance } = await mountEditor({
      home: '# Home\n\nGo [[other page]].\n',
    })

    await instance.navigate('other page')
    await sleep(60)

    expect(instance.getCurrentPage()).toBe('other-page')
    expect(instance.getContent()).toBe('# Other Page\n\n')
    // A click alone must never create the page — only an EDIT persists it
    // (this is the junk-page generator the old create-overlay flow bred).
    expect(store.dump()).not.toHaveProperty('other-page')
  })

  // ── Autosave must persist the page the user TYPED ON, not the one the
  //    timer happened to land on ────────────────────────────────────────────

  it('a pending save survives navigation and saves the ORIGINATING page', async () => {
    // debounce is 20ms (mountEditor); typing then navigating immediately
    // re-creates the race: the timer fires while the trail shows page B.
    const { store, saves, instance, editorDiv } = await mountEditor({
      home: '# Base',
      'target-page': '# Target\n',
    })

    editorDiv.textContent = '# Base edited'
    editorDiv.dispatchEvent(new Event('input', { bubbles: true }))

    // Navigate BEFORE the debounce fires — and to a page that does not
    // exist, whose seeded buffer a fire-time getCurrentPage() would POST.
    await instance.navigate('never-typed-page')
    await sleep(60)

    // home's edit persisted…
    expect(store.dump()['home']).toBe('# Base edited')
    expect(saves[0]?.page).toBe('home')
    // …and the seeded destination was never saved.
    expect(store.dump()).not.toHaveProperty('never-typed-page')
  })
})
